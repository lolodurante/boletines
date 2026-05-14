"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"

export default function CalificacionesAdaptadosPage() {
  const { data, isLoading } = usePlatformData()
  const activePeriod = data.periods.find((p) => p.status === "Activo") ?? data.periods[0]
  const assignments = activePeriod
    ? data.courseAssignments.filter(
        (a) => a.teacherId === data.currentTeacher.id && a.periodId === activePeriod.id,
      )
    : []

  const adaptedStudentsByCourse = data.adaptedStudents.reduce<
    Record<string, typeof data.adaptedStudents>
  >((acc, student) => {
    if (!acc[student.courseId]) acc[student.courseId] = []
    acc[student.courseId]!.push(student)
    return acc
  }, {})

  const courseGroups = Object.entries(adaptedStudentsByCourse)
    .map(([courseId, students]) => {
      const course = data.courses.find((c) => c.id === courseId)
      const courseAssignments = assignments.filter((a) => a.courseId === courseId)
      return {
        courseId,
        courseName: course?.name ?? "—",
        studentCount: students.length,
        subjects: courseAssignments.map((a) => ({
          subjectId: a.subjectId,
          periodId: a.periodId,
          subjectName: data.subjects.find((s) => s.id === a.subjectId)?.name ?? "—",
        })),
      }
    })
    .filter((g) => g.subjects.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alumnos con adaptación curricular"
        description="Cargá las calificaciones personalizadas para estos alumnos"
        breadcrumbs={[
          { label: "Docente" },
          { label: "Calificaciones", href: "/docente/calificaciones" },
          { label: "Alumnos adaptados" },
        ]}
      />

      <div className="flex flex-col gap-4">
        {courseGroups.map((group) => (
          <Card key={group.courseId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.courseName}</CardTitle>
                <Badge variant="secondary">
                  {group.studentCount} alumno{group.studentCount !== 1 ? "s" : ""} adaptado{group.studentCount !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {group.subjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="text-sm">{subject.subjectName}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/docente/calificaciones/adaptados/${group.courseId}/${subject.subjectId}?period=${subject.periodId}`}
                      >
                        Calificar
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && courseGroups.length === 0 && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No tenés alumnos con adaptación curricular en tus cursos del periodo actual.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
