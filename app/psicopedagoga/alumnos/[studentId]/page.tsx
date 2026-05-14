"use client"

import { use } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, User } from "lucide-react"
import { usePlatformData } from "@/lib/use-platform-data"

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = use(params)
  const { data } = usePlatformData()

  const student = data.students.find((s) => s.id === studentId)
  const course = data.courses.find((c) => c.id === student?.courseId)

  const studentEvaluationRows = data.directorEvaluationRows.filter(
    (row) => row.studentId === studentId,
  )

  const groupedByPeriod = data.periods
    .map((period) => ({
      period,
      rows: studentEvaluationRows.filter((row) => {
        const ev = (data.evaluations as Array<{ studentId: string; subjectId: string; periodId: string }> | undefined)?.find(
          (e) => e.studentId === studentId && e.subjectId === row.subjectId && e.periodId === period.id,
        )
        return Boolean(ev)
      }),
    }))
    .filter((g) => g.rows.length > 0)

  const statusLabel: Record<string, string> = {
    Aprobado: "Aprobado",
    "En revision": "En revisión",
    Borrador: "Borrador",
    Enviado: "Enviado",
    DRAFT: "Borrador",
    SUBMITTED: "Enviado",
    NEEDS_REVISION: "En revisión",
    APPROVED: "Aprobado",
  }

  const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    if (status === "APPROVED" || status === "Aprobado") return "default"
    if (status === "SUBMITTED" || status === "Enviado") return "secondary"
    return "outline"
  }

  if (!student) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Alumno no encontrado"
          breadcrumbs={[
            { label: "Psicopedagoga" },
            { label: "Alumnos", href: "/psicopedagoga/dashboard" },
            { label: "No encontrado" },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={student.name}
        breadcrumbs={[
          { label: "Psicopedagoga" },
          { label: "Alumnos", href: "/psicopedagoga/dashboard" },
          { label: student.name },
        ]}
      />

      <Link
        href="/psicopedagoga/dashboard"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a alumnos
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                <User className="size-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{student.name}</h2>
              <p className="text-sm text-muted-foreground">
                {course?.name ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {groupedByPeriod.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No hay evaluaciones registradas para este alumno
            </p>
          </CardContent>
        </Card>
      ) : (
        groupedByPeriod.map(({ period, rows }) => (
          <Card key={period.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{period.name}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Materia</TableHead>
                    <TableHead>Docente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const ev = (data.evaluations as Array<{ studentId: string; subjectId: string; periodId: string; generalObservation?: string; numericGrade?: number }> | undefined)?.find(
                      (e) =>
                        e.studentId === studentId &&
                        e.subjectId === row.subjectId &&
                        e.periodId === period.id,
                    )
                    const subject = (data.subjects as Array<{ id: string; hasNumericGrade?: boolean }>).find(
                      (s) => s.id === row.subjectId,
                    )
                    return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.subjectName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.teacherName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {statusLabel[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {subject?.hasNumericGrade && ev?.numericGrade != null
                          ? ev.numericGrade
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {ev?.generalObservation ?? "—"}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
