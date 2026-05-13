"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"
import type { EvaluationStatus } from "@/lib/data"
import { getAssignmentProgress, getProgressPercentage } from "@/lib/evaluation-metrics"

interface SubjectRow {
  subjectId: string
  subjectName: string
  periodId: string
  studentCount: number
  evaluatedCount: number
  status: EvaluationStatus
}

interface CourseGroup {
  courseId: string
  courseName: string
  subjects: SubjectRow[]
  totalStudentSlots: number
  totalEvaluated: number
}

export default function CalificacionesPage() {
  const { data, isLoading } = usePlatformData()
  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const assignments = activePeriod
    ? data.courseAssignments.filter(a => a.teacherId === data.currentTeacher.id && a.periodId === activePeriod.id)
    : []

  const courseGroups: CourseGroup[] = []
  for (const assignment of assignments) {
    const course = data.courses.find(item => item.id === assignment.courseId)
    const subject = data.subjects.find(item => item.id === assignment.subjectId)
    const progress = getAssignmentProgress(data, assignment)

    let group = courseGroups.find(g => g.courseId === assignment.courseId)
    if (!group) {
      group = {
        courseId: assignment.courseId,
        courseName: course?.name ?? "—",
        subjects: [],
        totalStudentSlots: 0,
        totalEvaluated: 0,
      }
      courseGroups.push(group)
    }

    group.subjects.push({
      subjectId: assignment.subjectId,
      subjectName: subject?.name ?? "—",
      periodId: assignment.periodId,
      studentCount: progress.studentCount,
      evaluatedCount: progress.completedCount,
      status: progress.status,
    })
    group.totalStudentSlots += progress.studentCount
    group.totalEvaluated += progress.completedCount
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calificaciones"
        breadcrumbs={[
          { label: "Docente" },
          { label: "Calificaciones" },
        ]}
      />

      <p className="text-muted-foreground">
        Selecciona una materia para cargar o editar las calificaciones del periodo {activePeriod?.name ?? "actual"}.
      </p>

      <div className="flex flex-col gap-4">
        {courseGroups.map((group) => {
          const overallPercentage = getProgressPercentage(group.totalEvaluated, group.totalStudentSlots)
          const allDone = group.subjects.every(s => s.status === "Completo")
          const anyInProgress = group.subjects.some(s => s.status === "En progreso")
          const courseStatus: EvaluationStatus = allDone ? "Completo" : anyInProgress ? "En progreso" : "Sin iniciar"

          return (
            <Card key={group.courseId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.courseName}</CardTitle>
                  <StatusBadge status={courseStatus} />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{group.subjects.length} {group.subjects.length === 1 ? "materia" : "materias"}</span>
                  <span>{Math.round(overallPercentage)}% completado</span>
                </div>
                <Progress value={overallPercentage} className="h-1.5" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {group.subjects.map((subject) => {
                    const pct = getProgressPercentage(subject.evaluatedCount, subject.studentCount)
                    return (
                      <div key={subject.subjectId} className="flex items-center justify-between py-2.5 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={subject.status} />
                          <span className="text-sm truncate">{subject.subjectName}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {subject.evaluatedCount}/{subject.studentCount} alumnos · {Math.round(pct)}%
                          </span>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/docente/calificaciones/${group.courseId}/${subject.subjectId}?period=${subject.periodId}`}>
                              {subject.status === "Sin iniciar" ? "Comenzar" : "Continuar"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {!isLoading && courseGroups.length === 0 && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No tenes cursos para cargar en el periodo actual.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
