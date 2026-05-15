"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Edit, ChevronDown, ChevronRight, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StudentOption {
  id: string
  name: string
  courseId: string
  parentEmail: string | null
}

interface CourseOption {
  id: string
  name: string
}

interface SubjectOption {
  id: string
  name: string
  appliesTo: string[]
}

interface AdaptedStudentsConfigData {
  adaptedStudents: StudentOption[]
  students: StudentOption[]
  courses: CourseOption[]
  subjects: SubjectOption[]
}

interface AdaptedCriterion {
  id: string
  studentId: string
  subjectId: string
  name: string
  description: string
  order: number
}

interface CriterionForm {
  id?: string
  name: string
  description: string
}

const emptyCriterionForm: CriterionForm = { name: "", description: "" }
const emptyData: AdaptedStudentsConfigData = {
  adaptedStudents: [],
  students: [],
  courses: [],
  subjects: [],
}

export function AdaptedStudentsManager() {
  const [data, setData] = useState<AdaptedStudentsConfigData>(emptyData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())
  const [adaptedCriteriaByStudent, setAdaptedCriteriaByStudent] = useState<Record<string, AdaptedCriterion[]>>({})
  const [loadingCriteria, setLoadingCriteria] = useState<Set<string>>(new Set())
  const [dialogState, setDialogState] = useState<{
    open: boolean
    studentId: string
    subjectId: string
    form: CriterionForm
  }>({ open: false, studentId: "", subjectId: "", form: emptyCriterionForm })
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false)
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const adaptedStudents = data.adaptedStudents
  const regularStudents = data.students

  const loadData = useCallback(async () => {
    const response = await fetch("/api/adapted-students-config", { cache: "no-store" })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(error?.error ?? "No se pudieron cargar los alumnos adaptados")
    }

    setData((await response.json()) as AdaptedStudentsConfigData)
    setLoadError(null)
  }, [])

  useEffect(() => {
    loadData().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los alumnos adaptados")
    })
  }, [loadData])

  const loadCriteria = useCallback(async (studentId: string) => {
    if (loadingCriteria.has(studentId) || adaptedCriteriaByStudent[studentId]) return
    setLoadingCriteria((prev) => new Set(prev).add(studentId))
    try {
      const response = await fetch(`/api/adapted-criteria?studentId=${studentId}`)
      if (!response.ok) return
      const criteria = (await response.json()) as AdaptedCriterion[]
      setAdaptedCriteriaByStudent((prev) => ({ ...prev, [studentId]: criteria }))
    } finally {
      setLoadingCriteria((prev) => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    }
  }, [loadingCriteria, adaptedCriteriaByStudent])

  const toggleExpand = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
        void loadCriteria(studentId)
      }
      return next
    })
  }

  const markAsAdapted = async (studentId: string, isAdapted: boolean) => {
    const response = await fetch("/api/adapted-criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-student-adapted", studentId, isAdapted }),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo actualizar el alumno")
      return
    }
    await loadData()
    setAdaptedCriteriaByStudent((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
    setExpandedStudents((prev) => {
      const next = new Set(prev)
      next.delete(studentId)
      return next
    })
    toast.success(isAdapted ? "Alumno marcado como adaptado" : "Adaptación removida")
    setAddStudentDialogOpen(false)
    setSelectedStudentToAdd("")
  }

  const openCriterionDialog = (studentId: string, subjectId: string, criterion?: AdaptedCriterion) => {
    setDialogState({
      open: true,
      studentId,
      subjectId,
      form: criterion
        ? { id: criterion.id, name: criterion.name, description: criterion.description }
        : emptyCriterionForm,
    })
  }

  const saveCriterion = async () => {
    const { studentId, subjectId, form } = dialogState
    if (!form.name.trim() || !form.description.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/adapted-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          ...(form.id ? { id: form.id } : {}),
          studentId,
          subjectId,
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      })
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(error?.error ?? "No se pudo guardar el criterio")
        return
      }
      setAdaptedCriteriaByStudent((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      await loadCriteria(studentId)
      toast.success("Criterio guardado")
      setDialogState({ open: false, studentId: "", subjectId: "", form: emptyCriterionForm })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCriterion = async (studentId: string, criterionId: string) => {
    const response = await fetch("/api/adapted-criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: criterionId }),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo eliminar el criterio")
      return
    }
    setAdaptedCriteriaByStudent((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
    await loadCriteria(studentId)
    toast.success("Criterio eliminado")
  }

  const subjectsForStudent = useCallback(
    (courseId: string) => {
      return data.subjects.filter((s) => {
        const gradeNum = courseId.replace(/^c/, "").replace(/[a-z]$/i, "")
        return s.appliesTo.some((g) => g.replace("°", "") === gradeNum)
      })
    },
    [data.subjects],
  )

  return (
    <div className="flex flex-col gap-4">
      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {adaptedStudents.length === 0
            ? "No hay alumnos con adaptación curricular"
            : `${adaptedStudents.length} alumno${adaptedStudents.length !== 1 ? "s" : ""} con adaptación`}
        </p>
        <Button onClick={() => setAddStudentDialogOpen(true)} size="sm">
          <Plus className="mr-2 size-4" />
          Agregar alumno
        </Button>
      </div>

      {adaptedStudents.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              Ningún alumno tiene adaptación curricular todavía
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {adaptedStudents.map((student) => {
            const isExpanded = expandedStudents.has(student.id)
            const criteria = adaptedCriteriaByStudent[student.id] ?? []
            const subjects = subjectsForStudent(student.courseId)
            const courseName = data.courses.find((c) => c.id === student.courseId)?.name ?? "—"

            return (
              <Card key={student.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(student.id)}
                      className="flex items-center gap-2 text-left hover:opacity-80"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base">{student.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{courseName}</p>
                      </div>
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <UserX className="mr-1.5 size-4" />
                          Quitar adaptación
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Quitar adaptación curricular?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {student.name} volverá a evaluarse con los criterios estándar del curso. Los criterios adaptados existentes se mantendrán pero no se usarán.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => markAsAdapted(student.id, false)}>
                            Quitar adaptación
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {loadingCriteria.has(student.id) ? (
                      <p className="py-4 text-sm text-muted-foreground">Cargando criterios…</p>
                    ) : subjects.length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground">
                        No hay materias configuradas para este grado
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4 pt-2">
                        {subjects.map((subject) => {
                          const subjectCriteria = criteria.filter((c) => c.subjectId === subject.id)
                          return (
                            <div key={subject.id} className="rounded-md border p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium">{subject.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openCriterionDialog(student.id, subject.id)}
                                >
                                  <Plus className="mr-1 size-3.5" />
                                  Agregar criterio
                                </Button>
                              </div>
                              {subjectCriteria.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Sin criterios adaptados</p>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {subjectCriteria.map((criterion) => (
                                    <div
                                      key={criterion.id}
                                      className="flex items-start justify-between gap-2 rounded bg-muted/50 px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">{criterion.name}</p>
                                        <p className="text-xs text-muted-foreground">{criterion.description}</p>
                                      </div>
                                      <div className="flex shrink-0 gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7"
                                          onClick={() => openCriterionDialog(student.id, subject.id, criterion)}
                                        >
                                          <Edit className="size-3.5" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="size-7 text-destructive">
                                              <Trash2 className="size-3.5" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>¿Eliminar criterio?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Se eliminará «{criterion.name}» de la adaptación de {student.name}.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteCriterion(student.id, criterion.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Eliminar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add student dialog */}
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar alumno con adaptación</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Seleccioná el alumno que tendrá criterios de evaluación personalizados
            </p>
            <Select value={selectedStudentToAdd} onValueChange={setSelectedStudentToAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar alumno…" />
              </SelectTrigger>
              <SelectContent>
                {regularStudents.map((student) => {
                  const courseName = data.courses.find((c) => c.id === student.courseId)?.name ?? ""
                  return (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} — {courseName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedStudentToAdd || isSaving}
              onClick={() => markAsAdapted(selectedStudentToAdd, true)}
            >
              <UserCheck className="mr-2 size-4" />
              Marcar como adaptado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criterion dialog */}
      <Dialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) setDialogState({ open: false, studentId: "", subjectId: "", form: emptyCriterionForm })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.form.id ? "Editar criterio" : "Nuevo criterio adaptado"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Comprensión lectora"
                value={dialogState.form.name}
                onChange={(e) =>
                  setDialogState((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Descripción del criterio adaptado…"
                value={dialogState.form.description}
                onChange={(e) =>
                  setDialogState((prev) => ({ ...prev, form: { ...prev.form, description: e.target.value } }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDialogState({ open: false, studentId: "", subjectId: "", form: emptyCriterionForm })
              }
            >
              Cancelar
            </Button>
            <Button
              disabled={!dialogState.form.name.trim() || !dialogState.form.description.trim() || isSaving}
              onClick={saveCriterion}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
