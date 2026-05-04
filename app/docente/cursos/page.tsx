"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"
import type { EvaluationStatus } from "@/lib/data"
import { getAssignmentProgress, getProgressPercentage } from "@/lib/evaluation-metrics"

interface CourseRow {
  id: string
  courseId: string
  courseName: string
  subjectId: string
  subjectName: string
  periodId: string
  periodName: string
  studentCount: number
  completedCount: number
  status: EvaluationStatus
  lastUpdated: string
}

export default function DocenteCursosPage() {
  const { data, isLoading } = usePlatformData()
  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [didSetInitialPeriod, setDidSetInitialPeriod] = useState(false)

  useEffect(() => {
    if (!didSetInitialPeriod && activePeriod?.id) {
      setSelectedPeriod(activePeriod.id)
      setDidSetInitialPeriod(true)
    }
  }, [activePeriod?.id, didSetInitialPeriod])

  const allCourseRows: CourseRow[] = data.courseAssignments
    .filter(assignment => assignment.teacherId === data.currentTeacher.id)
    .map((assignment) => {
      const course = data.courses.find(item => item.id === assignment.courseId)
      const subject = data.subjects.find(item => item.id === assignment.subjectId)
      const period = data.periods.find(item => item.id === assignment.periodId)
      const progress = getAssignmentProgress(data, assignment)

      return {
        id: `${assignment.courseId}-${assignment.subjectId}-${assignment.periodId}`,
        courseId: assignment.courseId,
        courseName: course?.name || "—",
        subjectId: assignment.subjectId,
        subjectName: subject?.name || "—",
        periodId: assignment.periodId,
        periodName: period?.name || "—",
        studentCount: progress.studentCount,
        completedCount: progress.completedCount,
        status: progress.status,
        lastUpdated: progress.lastUpdated
      }
    })

  const filteredRows = selectedPeriod === "all" 
    ? allCourseRows 
    : allCourseRows.filter(r => r.periodId === selectedPeriod)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Mis cursos" 
        breadcrumbs={[
          { label: "Docente" },
          { label: "Mis cursos" }
        ]}
      />

      {/* Filter */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Periodo:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los periodos</SelectItem>
                {data.periods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asignaciones</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando asignaciones..." : `${filteredRows.length} cursos asignados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-center">Alumnos</TableHead>
                <TableHead>Completados</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ultima edicion</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const progressPercentage = getProgressPercentage(row.completedCount, row.studentCount)
                
                return (
                  <TableRow 
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{row.courseName}</TableCell>
                    <TableCell>{row.subjectName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.periodName}</TableCell>
                    <TableCell className="text-center">{row.studentCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercentage} className="h-2 w-16" />
                        <span className="text-sm text-muted-foreground">
                          {row.completedCount}/{row.studentCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastUpdated}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/docente/calificaciones/${row.courseId}/${row.subjectId}?period=${row.periodId}`}>
                          {row.status === "Sin iniciar" ? "Iniciar" : "Editar"}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!isLoading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    No hay asignaciones para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
