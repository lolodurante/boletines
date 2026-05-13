"use client"

import { useCallback, useEffect, useMemo, useState, use } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { GradeBadge } from "@/components/grade-badge"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  CheckCircle2,
  AlertCircle,
  Save
} from "lucide-react"
import { toast } from "sonner"
import {
  getGradeScale,
  type Evaluation,
  type GradeLevel,
} from "@/lib/data"
import { usePlatformData } from "@/lib/use-platform-data"

interface GradeEntryPageProps {
  params: Promise<{ cursoId: string; materiaId: string }>
}

function buildInitialGrades(
  students: Array<{ id: string }>,
  criteria: Array<{ id: string; name: string }>,
  evaluations: Evaluation[],
) {
  const initial: Record<string, Record<string, GradeLevel>> = {}

  students.forEach((student) => {
    const evaluation = evaluations.find((item) => item.studentId === student.id)
    initial[student.id] = {}

    criteria.forEach((criterion) => {
      const grade = evaluation?.grades[criterion.name]
      if (grade) initial[student.id]![criterion.id] = grade
    })
  })

  return initial
}

function buildInitialObservations(evaluations: Evaluation[]) {
  return Object.fromEntries(
    evaluations
      .filter((evaluation) => evaluation.studentObservation)
      .map((evaluation) => [evaluation.studentId, evaluation.studentObservation ?? ""]),
  )
}

function parseDisplayDate(value?: string) {
  if (!value) return null
  const [day, month, year] = value.split("/").map(Number)
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day, 23, 59, 59, 999)
}

function getDaysUntil(value?: string) {
  const date = parseDisplayDate(value)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function GradeEntryPage({ params }: GradeEntryPageProps) {
  const resolvedParams = use(params)
  const { cursoId, materiaId } = resolvedParams
  const searchParams = useSearchParams()
  const requestedPeriodId = searchParams.get("period")
  const { data, isLoading } = usePlatformData()
  const course = data.courses.find(item => item.id === cursoId)
  const subject = data.subjects.find(item => item.id === materiaId)
  const activePeriod = requestedPeriodId
    ? data.periods.find(period => period.id === requestedPeriodId)
    : data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const assignment = activePeriod
    ? data.courseAssignments.find(
        item =>
          item.teacherId === data.currentTeacher.id &&
          item.courseId === cursoId &&
          item.subjectId === materiaId &&
          item.periodId === activePeriod.id,
      )
    : undefined
  const students = useMemo(() => data.students.filter(student => student.courseId === cursoId), [data.students, cursoId])
  const courseGrade = course?.name?.split(" ")[0]
  const gradeScale = useMemo(() => {
    if (!courseGrade) return []
    const gradeNum = parseInt(courseGrade)
    const dbScale = data.gradeScales.find((s) => s.gradeFrom <= gradeNum && gradeNum <= s.gradeTo)
    return dbScale ? (dbScale.labels as GradeLevel[]) : getGradeScale(courseGrade)
  }, [courseGrade, data.gradeScales])
  
  const criteria = useMemo(() => {
    const selectedCourse = data.courses.find(item => item.id === cursoId)
    const selectedSubject = data.subjects.find(item => item.id === materiaId)
    const selectedGrade = selectedCourse?.name?.split(" ")[0]
    if (!selectedGrade) return []
    return selectedSubject?.criteriaByGrade.find(item => item.grade === selectedGrade)?.criteria ?? []
  }, [data.courses, data.subjects, cursoId, materiaId])
  const existingEvaluations = useMemo(
    () =>
      activePeriod
        ? data.evaluations.filter(
            (evaluation) =>
              evaluation.teacherId === data.currentTeacher.id &&
              evaluation.courseId === cursoId &&
              evaluation.subjectId === materiaId &&
              evaluation.periodId === activePeriod.id,
          )
        : [],
    [activePeriod, cursoId, data.currentTeacher.id, data.evaluations, materiaId],
  )

  // State for grades
  const [grades, setGrades] = useState<Record<string, Record<string, GradeLevel>>>(() => {
    return buildInitialGrades(students, criteria, existingEvaluations)
  })

  const [observations, setObservations] = useState<Record<string, string>>({})
  const [generalObservation, setGeneralObservation] = useState("")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveBlocked, setAutoSaveBlocked] = useState(false)
  const gradeSourceKey = existingEvaluations
    .map((evaluation) => `${evaluation.id}:${evaluation.lastUpdated}:${Object.keys(evaluation.grades).length}`)
    .join("|")
  const studentKey = students.map((student) => student.id).join("|")
  const criteriaKey = criteria.map((criterion) => criterion.id).join("|")

  useEffect(() => {
    setGrades(buildInitialGrades(students, criteria, existingEvaluations))
    setObservations(buildInitialObservations(existingEvaluations))
    setGeneralObservation(existingEvaluations.find((evaluation) => evaluation.observation)?.observation ?? "")
    setIsDirty(false)
    setAutoSaveBlocked(false)
  }, [criteria, criteriaKey, existingEvaluations, gradeSourceKey, studentKey, students])

  const handleGradeChange = (studentId: string, criterion: string, value: GradeLevel) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [criterion]: value
      }
    }))
    setIsDirty(true)
    setAutoSaveBlocked(false)
  }

  const daysUntilDeadline = getDaysUntil(activePeriod?.teacherDeadline)
  const canEdit = Boolean(assignment && activePeriod?.status === "Activo" && daysUntilDeadline !== null && daysUntilDeadline >= 0)

  const saveGrades = useCallback(async (submit: boolean, options?: { silent?: boolean }) => {
    if (!activePeriod) return false
    if (!canEdit) {
      if (!options?.silent) toast.error("La carga no esta habilitada para este periodo")
      return false
    }

    const payload = {
      courseId: cursoId,
      subjectId: materiaId,
      periodId: activePeriod.id,
      generalObservation,
      submit,
      observations,
      grades: Object.entries(grades).flatMap(([studentId, studentGrades]) =>
        Object.entries(studentGrades)
          .filter(([, grade]) => Boolean(grade))
          .map(([criterionId, grade]) => ({
            studentId,
            criterionId,
            grade,
          })),
      ),
    }

    setIsSaving(true)
    const response = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    setIsSaving(false)

    if (!response.ok) {
      if (!options?.silent) toast.error(result?.error ?? "No se pudieron guardar las calificaciones")
      if (options?.silent) setAutoSaveBlocked(true)
      return false
    }

    setLastSaved(new Date())
    setIsDirty(false)
    setAutoSaveBlocked(false)
    return true
  }, [activePeriod, canEdit, cursoId, generalObservation, grades, materiaId, observations, setAutoSaveBlocked, setIsDirty])

  // Calculate completion stats (must be before the auto-save effect that reads isComplete)
  const totalCells = students.length * criteria.length
  const filledCells = Object.values(grades).reduce((acc, studentGrades) => {
    return acc + Object.values(studentGrades).filter(g => g && g !== "No evaluado").length
  }, 0)
  const completionPercentage = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0
  const isComplete = completionPercentage === 100

  useEffect(() => {
    if (!isDirty || isSaving || !canEdit || autoSaveBlocked) return
    const timer = window.setTimeout(() => {
      void saveGrades(isComplete, { silent: true })
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [autoSaveBlocked, canEdit, isDirty, isComplete, isSaving, saveGrades])

  const handleSave = async () => {
    const saved = await saveGrades(isComplete)
    if (saved) toast.success("Calificaciones guardadas")
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando calificaciones...</div>
  }

  if (!course || !subject || !activePeriod || !assignment) {
    return <div className="p-6">Curso o materia no encontrado</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={`${course.name} — ${subject.name}`}
        breadcrumbs={[
          { label: "Docente" },
          { label: "Calificaciones", href: "/docente/calificaciones" },
          { label: `${course.name} - ${subject.name}` }
        ]}
        actions={
          <Badge variant="outline" className="text-sm">
            Periodo: {activePeriod.name}
          </Badge>
        }
      />

      {/* Deadline Warning */}
      {daysUntilDeadline !== null && daysUntilDeadline <= 7 && !isComplete && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{daysUntilDeadline < 0 ? "Fecha limite vencida" : "Fecha limite proxima"}</AlertTitle>
          <AlertDescription>
            {daysUntilDeadline < 0
              ? "La fecha limite para completar las calificaciones ya vencio."
              : `Quedan ${daysUntilDeadline} dias para completar las calificaciones.`}{" "}
            Fecha limite: {activePeriod.teacherDeadline}
          </AlertDescription>
        </Alert>
      )}

      {isComplete && (
        <Alert className="border-success/50 bg-success/10">
          <CheckCircle2 className="size-4 text-success" />
          <AlertTitle className="text-success">Evaluaciones completas</AlertTitle>
          <AlertDescription>
            Todas las calificaciones están cargadas. El director ya puede revisar y generar el boletín.
          </AlertDescription>
        </Alert>
      )}

      {/* Grade Grid */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Calificaciones por alumno</CardTitle>
          <CardDescription>
            Selecciona la calificacion para cada criterio. Los cambios se guardan automaticamente como borrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          <div className="space-y-4 sm:hidden">
            {students.map((student) => (
              <div key={student.id} className="rounded-lg border p-3">
                <p className="mb-3 text-sm font-medium">{student.name}</p>
                <div className="space-y-3">
                  {criteria.map((criterion) => {
                    const currentGrade = grades[student.id]?.[criterion.id]

                    return (
                      <div key={criterion.id} className="space-y-1.5">
                        <div>
                          <p className="text-sm text-muted-foreground">{criterion.name}</p>
                          {criterion.description && (
                            <p className="text-xs text-muted-foreground/70">{criterion.description}</p>
                          )}
                        </div>
                        <Select
                          value={currentGrade || ""}
                          disabled={!canEdit}
                          onValueChange={(value) => handleGradeChange(student.id, criterion.id, value as GradeLevel)}
                        >
                          <SelectTrigger
                            className={`w-full ${
                              currentGrade
                                ? "border-transparent"
                                : "border-dashed text-muted-foreground"
                            }`}
                          >
                            <SelectValue placeholder="— seleccionar —">
                              {currentGrade && <GradeBadge grade={currentGrade} />}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {gradeScale.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                <GradeBadge grade={grade} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden w-full max-w-full overflow-x-auto sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border-b border-r px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[200px]">
                    Alumno
                  </th>
                  {criteria.map((criterion) => (
                    <th 
                      key={criterion.id} 
                      className="border-b px-4 py-3 text-center text-sm font-medium text-muted-foreground min-w-[150px]"
                      title={criterion.description || criterion.name}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span>{criterion.name}</span>
                        {criterion.description && (
                          <span className="text-xs font-normal text-muted-foreground/70 max-w-[140px] truncate">
                            {criterion.description}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/50">
                    <td className="sticky left-0 z-10 bg-card border-b border-r px-4 py-3 font-medium text-sm">
                      {student.name}
                    </td>
                    {criteria.map((criterion) => {
                      const currentGrade = grades[student.id]?.[criterion.id]
                      return (
                        <td key={criterion.id} className="border-b px-2 py-2">
                          <Select
                            value={currentGrade || ""}
                            disabled={!canEdit}
                            onValueChange={(value) => handleGradeChange(student.id, criterion.id, value as GradeLevel)}
                          >
                            <SelectTrigger 
                              className={`w-full ${
                                currentGrade 
                                  ? "border-transparent" 
                                  : "border-dashed text-muted-foreground"
                              }`}
                            >
                              <SelectValue placeholder="— seleccionar —">
                                {currentGrade && <GradeBadge grade={currentGrade} />}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {gradeScale.map((grade) => (
                                <SelectItem key={grade} value={grade}>
                                  <GradeBadge grade={grade} />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-Student Observations */}
      <Card>
        <CardHeader>
          <CardTitle>Observaciones por alumno</CardTitle>
          <CardDescription>
            Agrega observaciones individuales para cada alumno (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {students.map((student) => (
              <AccordionItem key={student.id} value={student.id}>
                <AccordionTrigger className="text-sm">
                  {student.name}
                  {observations[student.id] && (
                    <Badge variant="secondary" className="ml-2">
                      Con observacion
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    placeholder={`Observaciones sobre ${student.name}...`}
                    value={observations[student.id] || ""}
                    onChange={(e) => {
                      setObservations(prev => ({
                        ...prev,
                        [student.id]: e.target.value
                      }))
                      setIsDirty(true)
                      setAutoSaveBlocked(false)
                    }}
                    disabled={!canEdit}
                    className="min-h-[100px]"
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* General Observation */}
      <Card>
        <CardHeader>
          <CardTitle>Observacion general del docente</CardTitle>
          <CardDescription>
            Esta observacion se aplicara a todos los alumnos de este curso y materia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observaciones generales sobre el grupo..."
            value={generalObservation}
            onChange={(e) => {
              setGeneralObservation(e.target.value)
              setIsDirty(true)
              setAutoSaveBlocked(false)
            }}
            disabled={!canEdit}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Spacer so sticky action bar doesn't occlude the last rows */}
      <div className="h-20 lg:h-16 shrink-0" aria-hidden />

      {/* Action Bar */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-4 sm:-mx-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
          {isSaving && (
            <>
              <div className="size-2 rounded-full bg-warning" />
              <span>Guardando cambios...</span>
            </>
          )}
          {!isSaving && isDirty && (
            <>
              <div className="size-2 rounded-full bg-warning" />
              <span>Cambios sin guardar</span>
            </>
          )}
          {!isSaving && !isDirty && lastSaved && (
            <>
              <div className="size-2 rounded-full bg-success" />
              <span>
                Guardado hace {Math.floor((Date.now() - lastSaved.getTime()) / 60000)} min
              </span>
            </>
          )}
          <span className="sm:ml-4">
            Completado: {filledCells}/{totalCells} ({completionPercentage}%)
          </span>
        </div>
        <Button variant="outline" onClick={handleSave} disabled={!canEdit || isSaving} className="w-full sm:w-auto">
          <Save className="size-4 mr-2" />
          Guardar ahora
        </Button>
      </div>
    </div>
  )
}
