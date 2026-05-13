"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  Plus,
  Trash2,
  GripVertical,
  Save,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePlatformData } from "@/lib/use-platform-data"

interface Criterion {
  id: string
  name: string
  description?: string
}

interface GradeCriteria {
  grade: string
  criteria: Criterion[]
}

interface Subject {
  id: string
  name: string
  appliesTo: string[]
  criteriaByGrade: GradeCriteria[]
}

const GRADES = ["1°", "2°", "3°", "4°", "5°", "6°"]

function getGradeLabel(appliesTo: string[]): string {
  if (appliesTo.length === 0) return "Sin grados"
  if (appliesTo.length === 1) return appliesTo[0]!
  const sorted = [...appliesTo].sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b))
  const first = GRADES.indexOf(sorted[0]!)
  const last = GRADES.indexOf(sorted[sorted.length - 1]!)
  if (last - first + 1 === sorted.length) return `${sorted[0]} – ${sorted[sorted.length - 1]}`
  return `${appliesTo.length} grados`
}

function CriterionRow({
  criterion,
  onUpdateName,
  onUpdateDescription,
  onRemove,
}: {
  criterion: Criterion
  onUpdateName: (v: string) => void
  onUpdateDescription: (v: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex gap-2.5 p-3 border rounded-lg group bg-card transition-colors hover:bg-muted/20">
      <GripVertical className="size-4 text-muted-foreground/30 cursor-grab shrink-0 mt-2 hidden sm:block" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Input
          value={criterion.name}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder="Nombre del criterio"
          className="h-8 text-sm font-medium"
        />
        <Textarea
          value={criterion.description || ""}
          onChange={(e) => onUpdateDescription(e.target.value)}
          placeholder="¿Qué se espera del alumno? (opcional)"
          className="min-h-[44px] text-xs text-muted-foreground resize-none"
          rows={2}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-transparent group-hover:text-muted-foreground/50 hover:!text-destructive hover:bg-destructive/10 transition-colors mt-0.5"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

export default function MateriasPage() {
  const { data, reload } = usePlatformData()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>()
  const [selectedGrade, setSelectedGrade] = useState<string>(GRADES[0]!)
  const [newCriterionName, setNewCriterionName] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (hasChanges) return
    const nextSubjects = data.subjects
    setSubjects(nextSubjects)
    if (!selectedSubjectId || !nextSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(nextSubjects[0]?.id)
    }
  }, [data.subjects, hasChanges, selectedSubjectId])

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return
    const newSubject: Subject = {
      id: `s${Date.now()}`,
      name: newSubjectName,
      appliesTo: [...GRADES],
      criteriaByGrade: GRADES.map((grade) => ({ grade, criteria: [] })),
    }
    setSubjects((prev) => [...prev, newSubject])
    setSelectedSubjectId(newSubject.id)
    setNewSubjectName("")
    setHasChanges(true)
    setShowDetail(true)
    toast.success("Materia creada")
  }

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return
    const subjectName = selectedSubject.name
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedSubject.id)

    if (isUuid) {
      const response = await fetch(`/api/subjects?id=${encodeURIComponent(selectedSubject.id)}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(error?.error ?? "No se pudo eliminar la materia")
        return
      }
    }

    const filtered = subjects.filter((s) => s.id !== selectedSubjectId)
    setSubjects(filtered)
    setSelectedSubjectId(filtered[0]?.id)
    if (filtered.length === 0) setShowDetail(false)
    if (!isUuid) setHasChanges(true)
    await reload()
    toast.success(`"${subjectName}" eliminada`)
  }

  const handleUpdateSubjectName = (name: string) => {
    if (!selectedSubject) return
    setSubjects((prev) => prev.map((s) => (s.id === selectedSubject.id ? { ...s, name } : s)))
    setHasChanges(true)
  }

  const toggleGrade = (grade: string) => {
    if (!selectedSubject) return
    const isActive = selectedSubject.appliesTo.includes(grade)
    if (isActive && selectedSubject.appliesTo.length === 1) {
      toast.error("La materia debe tener al menos un grado activo")
      return
    }
    const newAppliesTo = isActive
      ? selectedSubject.appliesTo.filter((g) => g !== grade)
      : [...selectedSubject.appliesTo, grade].sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b))

    let newCriteriaByGrade = selectedSubject.criteriaByGrade
    if (!isActive && !selectedSubject.criteriaByGrade.find((gc) => gc.grade === grade)) {
      newCriteriaByGrade = [...selectedSubject.criteriaByGrade, { grade, criteria: [] }].sort(
        (a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade),
      )
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, appliesTo: newAppliesTo, criteriaByGrade: newCriteriaByGrade }
          : s,
      ),
    )
    setHasChanges(true)
  }

  const handleAddCriterionForGrade = (grade: string) => {
    if (!newCriterionName.trim() || !selectedSubject) return
    const newCriterion: Criterion = {
      id: `c${Date.now()}`,
      name: newCriterionName,
      description: "",
    }
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) =>
                gc.grade === grade ? { ...gc, criteria: [...gc.criteria, newCriterion] } : gc,
              ),
            }
          : s,
      ),
    )
    setNewCriterionName("")
    setHasChanges(true)
  }

  const handleRemoveCriterionFromGrade = (grade: string, criterionId: string) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) =>
                gc.grade === grade
                  ? { ...gc, criteria: gc.criteria.filter((c) => c.id !== criterionId) }
                  : gc,
              ),
            }
          : s,
      ),
    )
    setHasChanges(true)
  }

  const handleUpdateCriterionInGrade = (
    grade: string,
    criterionId: string,
    field: "name" | "description",
    value: string,
  ) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) =>
                gc.grade === grade
                  ? {
                      ...gc,
                      criteria: gc.criteria.map((c) =>
                        c.id === criterionId ? { ...c, [field]: value } : c,
                      ),
                    }
                  : gc,
              ),
            }
          : s,
      ),
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects }),
    })
    setIsSaving(false)

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudieron guardar las materias")
      return
    }

    await reload()
    setHasChanges(false)
    toast.success("Cambios guardados")
  }

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id)
    setShowDetail(true)
    setNewCriterionName("")
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Materias y criterios"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Materias y criterios" },
        ]}
      />

      <div className="flex flex-col gap-4 md:gap-6 lg:grid lg:min-h-[calc(100vh-200px)] lg:grid-cols-3">
        {/* Subject List */}
        <Card className={cn("lg:col-span-1 flex flex-col", showDetail ? "hidden lg:flex" : "flex")}>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold">Materias ({subjects.length})</h2>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 max-h-[50vh] lg:max-h-[calc(100vh-380px)]">
              <div className="space-y-0.5 px-2">
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    No hay materias. Crea la primera abajo.
                  </p>
                )}
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedSubjectId === subject.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="font-medium text-sm truncate">{subject.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getGradeLabel(subject.appliesTo)}
                      </Badge>
                      <ChevronRight className="size-3.5 text-muted-foreground lg:hidden" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva materia..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                  className="text-sm"
                />
                <Button size="icon" onClick={handleAddSubject} disabled={!newSubjectName.trim()}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject Detail */}
        <Card className={cn("lg:col-span-2 flex flex-col", showDetail ? "flex" : "hidden lg:flex")}>
          {selectedSubject ? (
            <>
              <CardHeader className="pb-3 space-y-0">
                {/* Mobile back button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2 mb-2 w-fit text-muted-foreground"
                  onClick={() => setShowDetail(false)}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Materias
                </Button>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 group">
                    <Input
                      value={selectedSubject.name}
                      onChange={(e) => handleUpdateSubjectName(e.target.value)}
                      className="text-lg font-semibold h-auto border-transparent bg-transparent p-0 focus-visible:ring-1 focus-visible:ring-ring focus-visible:px-2 focus-visible:py-1 transition-all"
                    />
                    <Pencil className="size-3.5 text-muted-foreground/40 shrink-0 group-focus-within:text-muted-foreground transition-colors" />
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar &quot;{selectedSubject.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán todos sus criterios de evaluación. Esta acción no se puede
                          deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSubject}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar materia
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-auto p-0">
                <Tabs
                  value={selectedGrade}
                  onValueChange={(grade) => {
                    setSelectedGrade(grade)
                    setNewCriterionName("")
                  }}
                  className="h-full flex flex-col"
                >
                  {/* Grade tabs — all 6 always visible */}
                  <div className="px-4 md:px-6 border-b">
                    <ScrollArea className="w-full">
                      <TabsList className="w-max justify-start h-auto bg-transparent p-0 gap-0.5 flex-nowrap">
                        {GRADES.map((grade) => {
                          const isActive = selectedSubject.appliesTo.includes(grade)
                          const count =
                            selectedSubject.criteriaByGrade.find((gc) => gc.grade === grade)
                              ?.criteria.length ?? 0
                          return (
                            <TabsTrigger
                              key={grade}
                              value={grade}
                              className={cn(
                                "px-3 py-2 text-sm shrink-0 rounded-none border-b-2 border-transparent",
                                "data-[state=active]:bg-transparent data-[state=active]:border-accent data-[state=active]:text-accent-foreground",
                                "transition-colors",
                                !isActive && "opacity-40",
                              )}
                            >
                              {grade}
                              {isActive ? (
                                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 h-4">
                                  {count}
                                </Badge>
                              ) : (
                                <span className="ml-1 text-xs text-muted-foreground">–</span>
                              )}
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>
                    </ScrollArea>
                  </div>

                  {/* Tab content per grade */}
                  {GRADES.map((grade) => {
                    const isActive = selectedSubject.appliesTo.includes(grade)
                    const gradeCriteria =
                      selectedSubject.criteriaByGrade.find((gc) => gc.grade === grade)?.criteria ??
                      []
                    return (
                      <TabsContent
                        key={grade}
                        value={grade}
                        className="mt-0 flex-1 overflow-auto p-4 md:p-6 space-y-4 data-[state=inactive]:hidden"
                      >
                        {/* Toggle: aplica a este grado */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                          <div>
                            <p className="text-sm font-medium">Aplica a {grade}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isActive
                                ? gradeCriteria.length === 0
                                  ? "Activo — sin criterios definidos todavía"
                                  : `${gradeCriteria.length} criterio${gradeCriteria.length !== 1 ? "s" : ""} definido${gradeCriteria.length !== 1 ? "s" : ""}`
                                : "Esta materia no se evalúa en este grado"}
                            </p>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => toggleGrade(grade)}
                            disabled={isActive && selectedSubject.appliesTo.length === 1}
                          />
                        </div>

                        {isActive && (
                          <>
                            {/* Add criterion — at the top */}
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Agregar criterio para ${grade}...`}
                                value={newCriterionName}
                                onChange={(e) => setNewCriterionName(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleAddCriterionForGrade(grade)
                                }
                                className="flex-1 text-sm"
                              />
                              <Button
                                onClick={() => handleAddCriterionForGrade(grade)}
                                disabled={!newCriterionName.trim()}
                                size="sm"
                              >
                                <Plus className="size-4 mr-1.5" />
                                Agregar
                              </Button>
                            </div>

                            {/* Criteria list */}
                            {gradeCriteria.length > 0 ? (
                              <div className="space-y-2">
                                {gradeCriteria.map((criterion) => (
                                  <CriterionRow
                                    key={criterion.id}
                                    criterion={criterion}
                                    onUpdateName={(v) =>
                                      handleUpdateCriterionInGrade(grade, criterion.id, "name", v)
                                    }
                                    onUpdateDescription={(v) =>
                                      handleUpdateCriterionInGrade(
                                        grade,
                                        criterion.id,
                                        "description",
                                        v,
                                      )
                                    }
                                    onRemove={() =>
                                      handleRemoveCriterionFromGrade(grade, criterion.id)
                                    }
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-muted-foreground">
                                <p className="text-sm">Sin criterios para {grade}</p>
                                <p className="text-xs mt-1">
                                  Usá el campo de arriba para agregar el primero
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>

              {/* Save bar */}
              <div className="border-t p-3 md:p-4 flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "text-xs transition-opacity",
                    hasChanges ? "text-warning opacity-100" : "text-muted-foreground opacity-0",
                  )}
                >
                  Cambios sin guardar
                </span>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Save className="size-4 mr-2" />
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] gap-2">
              <p className="text-muted-foreground text-sm">Seleccioná una materia para editarla</p>
              <p className="text-xs text-muted-foreground">
                o creá una nueva en el panel izquierdo
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
