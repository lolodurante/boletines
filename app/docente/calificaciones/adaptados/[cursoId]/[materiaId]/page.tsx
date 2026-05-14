"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"
import { usePlatformData } from "@/lib/use-platform-data"
import type { GradeLevel } from "@/lib/data"

interface AdaptedCriterion {
  id: string
  name: string
  description: string
  order: number
}

interface AdaptedStudent {
  id: string
  name: string
}

interface StudentEvaluation {
  studentId: string
  status: string
  numericGrade?: number
  observation?: string
  grades: Record<string, string>
}

interface ApiResponse {
  students: AdaptedStudent[]
  adaptedCriteriaByStudent: Array<{ studentId: string; criteria: AdaptedCriterion[] }>
  evaluations: StudentEvaluation[]
}

interface Props {
  params: Promise<{ cursoId: string; materiaId: string }>
}

const GRADE_OPTIONS: GradeLevel[] = ["Destacado", "Logrado", "En proceso", "En inicio", "No evaluado"]

export default function AdaptedGradeEntryPage({ params }: Props) {
  const { cursoId, materiaId } = use(params)
  const searchParams = useSearchParams()
  const periodId = searchParams.get("period") ?? ""
  const { data } = usePlatformData()

  const course = data.courses.find((c) => c.id === cursoId)
  const subject = data.subjects.find((s) => s.id === materiaId)
  const period = data.periods.find((p) => p.id === periodId) ?? data.periods.find((p) => p.status === "Activo")

  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [grades, setGrades] = useState<Record<string, Record<string, GradeLevel>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const assignment = period
    ? data.courseAssignments.find(
        (a) =>
          a.teacherId === data.currentTeacher.id &&
          a.courseId === cursoId &&
          a.subjectId === materiaId &&
          a.periodId === period.id,
      )
    : undefined

  const canEdit = Boolean(assignment && period?.status === "Activo")

  const loadData = useCallback(async () => {
    if (!period) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/evaluations/adapted?courseId=${cursoId}&subjectId=${materiaId}&periodId=${period.id}`,
      )
      if (!response.ok) {
        toast.error("No se pudieron cargar los alumnos adaptados")
        return
      }
      const result = (await response.json()) as ApiResponse
      setApiData(result)

      const initialGrades: Record<string, Record<string, GradeLevel>> = {}
      for (const ev of result.evaluations) {
        initialGrades[ev.studentId] = {}
        const criteria = result.adaptedCriteriaByStudent.find((c) => c.studentId === ev.studentId)?.criteria ?? []
        for (const criterion of criteria) {
          const label = ev.grades[criterion.id]
          if (label) initialGrades[ev.studentId]![criterion.id] = label as GradeLevel
        }
      }
      setGrades(initialGrades)
    } finally {
      setIsLoading(false)
    }
  }, [cursoId, materiaId, period])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const setGrade = (studentId: string, criterionId: string, value: GradeLevel) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [criterionId]: value },
    }))
  }

  const save = async (submit: boolean) => {
    if (!period) return
    setIsSaving(true)
    try {
      const gradePayload = Object.entries(grades).flatMap(([studentId, studentGrades]) =>
        Object.entries(studentGrades).map(([adaptedCriterionId, grade]) => ({
          studentId,
          adaptedCriterionId,
          grade,
        })),
      )

      const response = await fetch("/api/evaluations/adapted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: cursoId,
          subjectId: materiaId,
          periodId: period.id,
          submit,
          grades: gradePayload,
        }),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(error?.error ?? "No se pudieron guardar las calificaciones")
        return
      }

      toast.success(submit ? "Calificaciones enviadas" : "Guardado como borrador")
      await loadData()
    } finally {
      setIsSaving(false)
    }
  }

  if (!course || !subject) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="No encontrado"
          breadcrumbs={[
            { label: "Docente" },
            { label: "Calificaciones", href: "/docente/calificaciones" },
            { label: "Adaptados", href: "/docente/calificaciones/adaptados" },
            { label: "No encontrado" },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${subject.name} — Alumnos adaptados`}
        description={`${course.name} · ${period?.name ?? "Período activo"}`}
        breadcrumbs={[
          { label: "Docente" },
          { label: "Calificaciones", href: "/docente/calificaciones" },
          { label: "Adaptados", href: "/docente/calificaciones/adaptados" },
          { label: subject.name },
        ]}
      />

      {!canEdit && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            {!assignment
              ? "No estás asignado a este curso y materia."
              : "El período no está activo. Las calificaciones son de solo lectura."}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Cargando alumnos…
          </CardContent>
        </Card>
      ) : !apiData || apiData.students.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay alumnos con adaptación curricular en este curso
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {apiData.students.map((student) => {
              const criteria =
                apiData.adaptedCriteriaByStudent.find((c) => c.studentId === student.id)?.criteria ?? []
              const ev = apiData.evaluations.find((e) => e.studentId === student.id)
              const isComplete = ev?.status === "SUBMITTED" || ev?.status === "APPROVED"

              return (
                <Card key={student.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{student.name}</CardTitle>
                      {isComplete && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="size-3" />
                          Completo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {criteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este alumno no tiene criterios adaptados para esta materia. Cargalos desde la sección de adaptaciones curriculares.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {criteria.map((criterion) => {
                          const currentGrade = grades[student.id]?.[criterion.id]
                          return (
                            <div key={criterion.id} className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{criterion.name}</p>
                                {criterion.description && (
                                  <p className="text-xs text-muted-foreground">{criterion.description}</p>
                                )}
                              </div>
                              <Select
                                disabled={!canEdit}
                                value={currentGrade ?? "No evaluado"}
                                onValueChange={(value) => setGrade(student.id, criterion.id, value as GradeLevel)}
                              >
                                <SelectTrigger className="w-40 shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GRADE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {canEdit && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" disabled={isSaving} onClick={() => save(false)}>
                <Save className="mr-2 size-4" />
                Guardar borrador
              </Button>
              <Button disabled={isSaving} onClick={() => save(true)}>
                <CheckCircle2 className="mr-2 size-4" />
                Marcar como completo
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
