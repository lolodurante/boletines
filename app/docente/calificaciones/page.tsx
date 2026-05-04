"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"
import type { EvaluationStatus } from "@/lib/data"
import { getAssignmentProgress, getProgressPercentage } from "@/lib/evaluation-metrics"

interface CourseCard {
  courseId: string
  courseName: string
  subjectId: string
  subjectName: string
  periodId: string
  studentCount: number
  evaluatedCount: number
  status: EvaluationStatus
}

export default function CalificacionesPage() {
  const { data, isLoading } = usePlatformData()
  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const assignments = activePeriod
    ? data.courseAssignments.filter(assignment => assignment.teacherId === data.currentTeacher.id && assignment.periodId === activePeriod.id)
    : []
  const courseCards: CourseCard[] = assignments.map((assignment) => {
    const course = data.courses.find(item => item.id === assignment.courseId)
    const subject = data.subjects.find(item => item.id === assignment.subjectId)
    const progress = getAssignmentProgress(data, assignment)

    return {
      courseId: assignment.courseId,
      courseName: course?.name || "—",
      subjectId: assignment.subjectId,
      subjectName: subject?.name || "—",
      periodId: assignment.periodId,
      studentCount: progress.studentCount,
      evaluatedCount: progress.completedCount,
      status: progress.status
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Calificaciones" 
        breadcrumbs={[
          { label: "Docente" },
          { label: "Calificaciones" }
        ]}
      />

      <p className="text-muted-foreground">
        Selecciona un curso para cargar o editar las calificaciones del periodo {activePeriod?.name ?? "actual"}.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {courseCards.map((course) => {
          const progressPercentage = getProgressPercentage(course.evaluatedCount, course.studentCount)
          
          return (
            <Card key={`${course.courseId}-${course.subjectId}`} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{course.courseName}</CardTitle>
                    <CardDescription>{course.subjectName}</CardDescription>
                  </div>
                  <StatusBadge status={course.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {course.evaluatedCount}/{course.studentCount} alumnos
                    </span>
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                
                <Button className="w-full" asChild>
                  <Link href={`/docente/calificaciones/${course.courseId}/${course.subjectId}?period=${course.periodId}`}>
                    {course.status === "Sin iniciar" ? "Comenzar carga" : "Continuar"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {!isLoading && courseCards.length === 0 && (
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
