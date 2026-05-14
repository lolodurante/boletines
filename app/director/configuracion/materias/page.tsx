"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Plus, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react"
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
  reportType: "ESPANOL" | "INGLES"
  entryKind?: "ACADEMIC" | "TEACHER_OBSERVATION" | "ABSENCES"
  hasNumericGrade?: boolean
  appliesTo: string[]
  criteriaByGrade: GradeCriteria[]
  sharedCriteria?: boolean
}

const GRADES = ["1°", "2°", "3°", "4°", "5°", "6°"]

function detectSharedCriteria(subject: Subject): boolean {
  const active = subject.criteriaByGrade.filter((gc) => subject.appliesTo.includes(gc.grade))
  if (active.length <= 1) return true
  const first = active[0]!.criteria
  return active.every(
    (gc) =>
      gc.criteria.length === first.length &&
      gc.criteria.every((c, i) => c.name === first[i]?.name && c.description === first[i]?.description),
  )
}

function getSharedCriteria(subject: Subject): Criterion[] {
  return subject.criteriaByGrade.find((gc) => subject.appliesTo.includes(gc.grade))?.criteria ?? []
}

function spreadToAllGrades(subject: Subject, criteria: Criterion[]): GradeCriteria[] {
  return subject.criteriaByGrade.map((gc) => ({ ...gc, criteria }))
}

function makeLocalCriterionId() {
  return `c${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneCriteria(criteria: Criterion[]): Criterion[] {
  return criteria.map((criterion) => ({ ...criterion, id: makeLocalCriterionId() }))
}

function spreadClonedCriteriaToActiveGrades(subject: Subject, criteria: Criterion[]): GradeCriteria[] {
  const activeGrades = new Set(subject.appliesTo)
  return subject.criteriaByGrade.map((gc) => ({
    ...gc,
    criteria: activeGrades.has(gc.grade) ? cloneCriteria(criteria) : gc.criteria,
  }))
}

function getReportTypeLabel(reportType: Subject["reportType"]) {
  return reportType === "INGLES" ? "Inglés" : "Español"
}

function getEntryKindLabel(entryKind: NonNullable<Subject["entryKind"]>) {
  if (entryKind === "TEACHER_OBSERVATION") return "Obs. docente"
  if (entryKind === "ABSENCES") return "Inasistencias"
  return "Materia"
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

function CriteriaList({
  criteria,
  newCriterionName,
  onNewCriterionNameChange,
  onAdd,
  onUpdateName,
  onUpdateDescription,
  onRemove,
  gradePlaceholder,
}: {
  criteria: Criterion[]
  newCriterionName: string
  onNewCriterionNameChange: (v: string) => void
  onAdd: () => void
  onUpdateName: (id: string, v: string) => void
  onUpdateDescription: (id: string, v: string) => void
  onRemove: (id: string) => void
  gradePlaceholder?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={gradePlaceholder ?? "Agregar criterio..."}
          value={newCriterionName}
          onChange={(e) => onNewCriterionNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          className="flex-1 text-sm"
        />
        <Button onClick={onAdd} disabled={!newCriterionName.trim()} size="sm">
          <Plus className="size-4 mr-1.5" />
          Agregar
        </Button>
      </div>
      {criteria.length > 0 ? (
        <div className="space-y-2">
          {criteria.map((c) => (
            <CriterionRow
              key={c.id}
              criterion={c}
              onUpdateName={(v) => onUpdateName(c.id, v)}
              onUpdateDescription={(v) => onUpdateDescription(c.id, v)}
              onRemove={() => onRemove(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Sin criterios todavía</p>
          <p className="text-xs mt-1">Usá el campo de arriba para agregar el primero</p>
        </div>
      )}
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
    const nextSubjects = (data.subjects as Subject[]).map((s) => ({
      ...s,
      sharedCriteria: s.sharedCriteria ?? detectSharedCriteria(s),
    }))
    setSubjects(nextSubjects)
    if (!selectedSubjectId || !nextSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(nextSubjects[0]?.id)
    }
  }, [data.subjects, hasChanges, selectedSubjectId])

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const isShared = selectedSubject?.sharedCriteria !== false
  const sharedCriteria = selectedSubject ? getSharedCriteria(selectedSubject) : []

  // ── subject list actions ──────────────────────────────────────────────────

  const handleAddSubject = () => {
    const name = newSubjectName.trim()
    if (!name) return
    const newSubject: Subject = {
      id: `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      reportType: "ESPANOL",
      entryKind: "ACADEMIC",
      hasNumericGrade: false,
      appliesTo: [...GRADES],
      criteriaByGrade: GRADES.map((grade) => ({ grade, criteria: [] })),
      sharedCriteria: false,
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      selectedSubject.id,
    )

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

  // ── field updates ─────────────────────────────────────────────────────────

  const updateSubject = (patch: Partial<Subject>) => {
    if (!selectedSubject) return
    setSubjects((prev) => prev.map((s) => (s.id === selectedSubject.id ? { ...s, ...patch } : s)))
    setHasChanges(true)
  }

  const handleUpdateEntryKind = (entryKind: NonNullable<Subject["entryKind"]>) => {
    if (!selectedSubject) return
    updateSubject({
      entryKind,
      reportType: entryKind === "ABSENCES" ? "INGLES" : selectedSubject.reportType,
      hasNumericGrade: entryKind === "ACADEMIC" ? selectedSubject.hasNumericGrade : false,
      criteriaByGrade:
        entryKind === "ACADEMIC"
          ? selectedSubject.criteriaByGrade
          : selectedSubject.criteriaByGrade.map((gc) => ({ ...gc, criteria: [] })),
    })
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
    if (!isActive) {
      const criteriaForNewGrade = isShared ? getSharedCriteria(selectedSubject) : []
      const existing = selectedSubject.criteriaByGrade.find((gc) => gc.grade === grade)
      if (!existing) {
        newCriteriaByGrade = [
          ...selectedSubject.criteriaByGrade,
          { grade, criteria: criteriaForNewGrade },
        ].sort((a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade))
      } else if (isShared) {
        newCriteriaByGrade = selectedSubject.criteriaByGrade.map((gc) =>
          gc.grade === grade ? { ...gc, criteria: criteriaForNewGrade } : gc,
        )
      }
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

  // ── shared criteria actions ───────────────────────────────────────────────

  const handleAddSharedCriterion = () => {
    const name = newCriterionName.trim()
    if (!name || !selectedSubject) return
    const newCriterion: Criterion = { id: makeLocalCriterionId(), name, description: "" }
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, criteriaByGrade: s.criteriaByGrade.map((gc) => ({ ...gc, criteria: [...gc.criteria, newCriterion] })) }
          : s,
      ),
    )
    setNewCriterionName("")
    setHasChanges(true)
  }

  const handleRemoveSharedCriterion = (id: string) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, criteriaByGrade: s.criteriaByGrade.map((gc) => ({ ...gc, criteria: gc.criteria.filter((c) => c.id !== id) })) }
          : s,
      ),
    )
    setHasChanges(true)
  }

  const handleUpdateSharedCriterion = (id: string, field: "name" | "description", value: string) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) => ({
                ...gc,
                criteria: gc.criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
              })),
            }
          : s,
      ),
    )
    setHasChanges(true)
  }

  // ── per-grade criteria actions ────────────────────────────────────────────

  const handleAddCriterionForGrade = (grade: string) => {
    const name = newCriterionName.trim()
    if (!name || !selectedSubject) return
    const newCriterion: Criterion = { id: makeLocalCriterionId(), name, description: "" }
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

  const handleRemoveCriterionFromGrade = (grade: string, id: string) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) =>
                gc.grade === grade ? { ...gc, criteria: gc.criteria.filter((c) => c.id !== id) } : gc,
              ),
            }
          : s,
      ),
    )
    setHasChanges(true)
  }

  const handleUpdateCriterionInGrade = (grade: string, id: string, field: "name" | "description", value: string) => {
    if (!selectedSubject) return
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? {
              ...s,
              criteriaByGrade: s.criteriaByGrade.map((gc) =>
                gc.grade === grade
                  ? { ...gc, criteria: gc.criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)) }
                  : gc,
              ),
            }
          : s,
      ),
    )
    setHasChanges(true)
  }

  // ── shared ↔ per-grade toggle ─────────────────────────────────────────────

  const handleExpandToPerGrade = () => {
    if (!selectedSubject) return
    const current = getSharedCriteria(selectedSubject)
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, sharedCriteria: false, criteriaByGrade: spreadClonedCriteriaToActiveGrades(s, current) }
          : s,
      ),
    )
    setSelectedGrade(selectedSubject.appliesTo[0] ?? GRADES[0]!)
    setHasChanges(true)
  }

  const handleCollapseToShared = () => {
    if (!selectedSubject) return
    // Use first active grade's criteria as the unified set
    const base = getSharedCriteria(selectedSubject)
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === selectedSubject.id
          ? { ...s, sharedCriteria: true, criteriaByGrade: spreadToAllGrades(s, base) }
          : s,
      ),
    )
    setHasChanges(true)
  }

  // ── save ──────────────────────────────────────────────────────────────────

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

  // ── render ────────────────────────────────────────────────────────────────

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
                    onClick={() => {
                      setSelectedSubjectId(subject.id)
                      setShowDetail(true)
                      setNewCriterionName("")
                    }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedSubjectId === subject.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{subject.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getEntryKindLabel(subject.entryKind ?? "ACADEMIC")} · {getReportTypeLabel(subject.reportType)}
                        {subject.appliesTo.length < GRADES.length && ` · ${subject.appliesTo.length} grados`}
                      </p>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground lg:hidden shrink-0 ml-2" />
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
                {/* Mobile back */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2 mb-2 w-fit text-muted-foreground"
                  onClick={() => setShowDetail(false)}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Materias
                </Button>

                {/* Name + delete */}
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={selectedSubject.name}
                    onChange={(e) => updateSubject({ name: e.target.value })}
                    className="text-lg font-semibold h-auto border-transparent bg-transparent p-0 focus-visible:ring-1 focus-visible:ring-ring focus-visible:px-2 focus-visible:py-1 transition-all"
                  />
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
                          Se eliminarán todos sus criterios de evaluación. Esta acción no se puede deshacer.
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

                {/* Settings row */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tipo de carga</label>
                    <Select
                      value={selectedSubject.entryKind ?? "ACADEMIC"}
                      onValueChange={handleUpdateEntryKind}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACADEMIC">Materia</SelectItem>
                        <SelectItem value="TEACHER_OBSERVATION">Observación docente</SelectItem>
                        <SelectItem value="ABSENCES">Inasistencias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Boletín</label>
                    <Select
                      value={selectedSubject.reportType}
                      onValueChange={(v) => updateSubject({ reportType: v as Subject["reportType"] })}
                      disabled={(selectedSubject.entryKind ?? "ACADEMIC") === "ABSENCES"}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESPANOL">Español</SelectItem>
                        <SelectItem value="INGLES">Inglés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(selectedSubject.entryKind ?? "ACADEMIC") === "ACADEMIC" && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 sm:col-span-2">
                      <div>
                        <p className="text-sm font-medium">Lleva nota numérica</p>
                        <p className="text-xs text-muted-foreground">
                          Agrega una nota de 1 a 10 al final de la grilla.
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(selectedSubject.hasNumericGrade)}
                        onCheckedChange={(v) => updateSubject({ hasNumericGrade: v })}
                      />
                    </div>
                  )}

                  {/* Grade chips */}
                  <div className="sm:col-span-2 grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Grados</label>
                    <div className="flex flex-wrap gap-1.5">
                      {GRADES.map((grade) => {
                        const isActive = selectedSubject.appliesTo.includes(grade)
                        return (
                          <button
                            key={grade}
                            onClick={() => toggleGrade(grade)}
                            disabled={isActive && selectedSubject.appliesTo.length === 1}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                              isActive
                                ? "bg-accent/15 border-accent/50 text-foreground"
                                : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {grade}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-auto p-0">
                {(selectedSubject.entryKind ?? "ACADEMIC") !== "ACADEMIC" ? (
                  <div className="p-4 md:p-6 text-sm text-muted-foreground">
                    Esta carga no usa criterios ni calificaciones. El docente va a cargar un valor por alumno.
                  </div>
                ) : isShared ? (
                  /* ── Shared criteria view ── */
                  <div className="p-4 md:p-6 space-y-4">
                    <CriteriaList
                      criteria={sharedCriteria}
                      newCriterionName={newCriterionName}
                      onNewCriterionNameChange={setNewCriterionName}
                      onAdd={handleAddSharedCriterion}
                      onUpdateName={(id, v) => handleUpdateSharedCriterion(id, "name", v)}
                      onUpdateDescription={(id, v) => handleUpdateSharedCriterion(id, "description", v)}
                      onRemove={handleRemoveSharedCriterion}
                    />
                    <Separator />
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 cursor-pointer"
                      onClick={handleExpandToPerGrade}
                    >
                      <div>
                        <p className="text-sm font-medium">Criterios diferentes por grado</p>
                        <p className="text-xs text-muted-foreground">
                          Activá esto si cada grado tiene criterios distintos.
                        </p>
                      </div>
                      <Switch checked={false} onCheckedChange={handleExpandToPerGrade} />
                    </div>
                  </div>
                ) : (
                  /* ── Per-grade criteria view ── */
                  <Tabs
                    value={selectedGrade}
                    onValueChange={(g) => { setSelectedGrade(g); setNewCriterionName("") }}
                    className="h-full flex flex-col"
                  >
                    <div className="px-4 md:px-6 border-b">
                      <ScrollArea className="w-full">
                        <TabsList className="w-max justify-start h-auto bg-transparent p-0 gap-0.5 flex-nowrap">
                          {selectedSubject.appliesTo.map((grade) => (
                            <TabsTrigger
                              key={grade}
                              value={grade}
                              className="min-w-12 px-4 py-2 text-sm font-medium shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-accent transition-colors"
                            >
                              {grade}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </ScrollArea>
                    </div>

                    {selectedSubject.appliesTo.map((grade) => {
                      const gradeCriteria =
                        selectedSubject.criteriaByGrade.find((gc) => gc.grade === grade)?.criteria ?? []
                      return (
                        <TabsContent
                          key={grade}
                          value={grade}
                          className="mt-0 flex-1 overflow-auto p-4 md:p-6 space-y-4 data-[state=inactive]:hidden"
                        >
                          <CriteriaList
                            criteria={gradeCriteria}
                            newCriterionName={newCriterionName}
                            onNewCriterionNameChange={setNewCriterionName}
                            onAdd={() => handleAddCriterionForGrade(grade)}
                            onUpdateName={(id, v) => handleUpdateCriterionInGrade(grade, id, "name", v)}
                            onUpdateDescription={(id, v) => handleUpdateCriterionInGrade(grade, id, "description", v)}
                            onRemove={(id) => handleRemoveCriterionFromGrade(grade, id)}
                            gradePlaceholder={`Agregar criterio para ${grade}...`}
                          />
                        </TabsContent>
                      )
                    })}

                    <div className="border-t px-4 md:px-6 py-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 cursor-pointer">
                            <div>
                              <p className="text-sm font-medium">Criterios diferentes por grado</p>
                              <p className="text-xs text-muted-foreground">
                                Desactivá esto para usar los mismos criterios en todos los grados.
                              </p>
                            </div>
                            <Switch checked={true} />
                          </div>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Unificar criterios?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se van a usar los criterios de {selectedSubject.appliesTo[0]} para todos los grados. Los criterios específicos de cada grado se van a perder.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCollapseToShared}>
                              Unificar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Tabs>
                )}
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
              <p className="text-xs text-muted-foreground">o creá una nueva en el panel izquierdo</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
