"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { 
  Calendar,
  Clock,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"
import type { EvaluationStatus } from "@/lib/data"
import { getAssignmentProgress, getProgressPercentage } from "@/lib/evaluation-metrics"

interface CourseCard {
  id: string
  courseId: string
  courseName: string
  subjectId: string
  subjectName: string
  studentCount: number
  evaluatedCount: number
  status: EvaluationStatus
  lastUpdated: string
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

export default function DocenteDashboard() {
  const { data, isLoading } = usePlatformData()
  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const currentTeacher = data.currentTeacher
  const teacherFirstName = currentTeacher.name.split(" ")[0] || "Docente"
  const daysUntilDeadline = getDaysUntil(activePeriod?.teacherDeadline)
  const assignments = activePeriod
    ? data.courseAssignments.filter(assignment => assignment.teacherId === currentTeacher.id && assignment.periodId === activePeriod.id)
    : []
  const courseCards: CourseCard[] = assignments.map((assignment) => {
    const course = data.courses.find(item => item.id === assignment.courseId)
    const subject = data.subjects.find(item => item.id === assignment.subjectId)
    const progress = getAssignmentProgress(data, assignment)

    return {
      id: `${assignment.courseId}-${assignment.subjectId}`,
      courseId: assignment.courseId,
      courseName: course?.name || "—",
      subjectId: assignment.subjectId,
      subjectName: subject?.name || "—",
      studentCount: progress.studentCount,
      evaluatedCount: progress.completedCount,
      status: progress.status,
      lastUpdated: progress.lastUpdated
    }
  })
  const pendingCourses = courseCards.filter(c => c.status !== "Completo").length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={`Bienvenida, ${teacherFirstName}`}
        breadcrumbs={[
          { label: "Docente" },
          { label: "Inicio" }
        ]}
      />

      {/* Deadline Warning */}
      {daysUntilDeadline !== null && daysUntilDeadline <= 7 && pendingCourses > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Fecha limite proxima</AlertTitle>
          <AlertDescription>
            {daysUntilDeadline < 0
              ? "La fecha limite para completar las calificaciones ya vencio."
              : `Quedan ${daysUntilDeadline} dias para completar las calificaciones.`}{" "}
            Tenes {pendingCourses} cursos pendientes.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Period Card */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-accent/20">
                <Calendar className="size-6 text-accent" />
              </div>
              <div>
                <p className="text-lg font-semibold">{activePeriod?.name ?? "Sin periodo activo"}</p>
                <p className="text-sm text-muted-foreground">Periodo actual</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-6">
              <div>
                <span className="text-muted-foreground">Inicio:</span>{" "}
                <span className="font-medium">{activePeriod?.startDate ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>{" "}
                <span className="font-medium">{activePeriod?.endDate ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Fecha limite:</span>
              </div>
              <p className="font-semibold">{activePeriod?.teacherDeadline ?? "—"}</p>
            </div>
            {daysUntilDeadline !== null && daysUntilDeadline <= 7 && (
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                {daysUntilDeadline < 0 ? "Vencido" : `${daysUntilDeadline} dias restantes`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm">
          <span className="font-medium">
            {isLoading
              ? "Cargando asignaciones..."
              : pendingCourses > 0
                ? `Tenes ${pendingCourses} cursos pendientes de completar`
                : "Todas las evaluaciones estan completas"}
          </span>
        </p>
      </div>

      {/* Course Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Mis cursos</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courseCards.map((course) => {
            const progressPercentage = getProgressPercentage(course.evaluatedCount, course.studentCount)
            
            return (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
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
                        {course.evaluatedCount}/{course.studentCount} alumnos evaluados
                      </span>
                      <span className="font-medium">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Ultima modificacion: {course.lastUpdated}
                    </span>
                    <Button size="sm" asChild>
                      <Link href={`/docente/calificaciones/${course.courseId}/${course.subjectId}?period=${activePeriod?.id}`}>
                        {course.status === "Sin iniciar" ? "Cargar calificaciones" : "Ver y editar"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {!isLoading && courseCards.length === 0 && (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No tenes asignaciones para el periodo actual.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
