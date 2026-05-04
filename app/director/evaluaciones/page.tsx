"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Download, Eye } from "lucide-react"
import Link from "next/link"
import { usePlatformData } from "@/lib/use-platform-data"
import type { EvaluationStatus, GradeLevel } from "@/lib/data"

interface EvaluationRow {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  status: EvaluationStatus
  lastUpdated: string
  grades: Record<string, string>
}

export default function EvaluacionesPage() {
  const { data } = usePlatformData()
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationRow | null>(null)
  const evaluations = data.directorEvaluationRows

  // Filter evaluations
  const filteredEvaluations = evaluations.filter(e => {
    const evaluation = data.evaluations.find(item => item.id === e.id)
    if (selectedPeriod !== "all" && evaluation?.periodId !== selectedPeriod) return false
    if (selectedCourse !== "all" && e.courseId !== selectedCourse) return false
    if (selectedStatus !== "all" && e.status !== selectedStatus) return false
    return true
  })

  const handleExport = () => {
    const headers = ["Alumno", "Curso", "Docente", "Materia", "Estado", "Ultima actualizacion"]
    const rows = filteredEvaluations.map((evaluation) => [
      evaluation.studentName,
      evaluation.courseName,
      evaluation.teacherName,
      evaluation.subjectName,
      evaluation.status,
      evaluation.lastUpdated,
    ])
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "evaluaciones-directivos.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Evaluaciones por curso" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Evaluaciones" },
          { label: "Por curso" }
        ]}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4 mr-2" />
            Exportar
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Periodo:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.periods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Curso:</span>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Estado:</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Completo">Completo</SelectItem>
                <SelectItem value="En progreso">En progreso</SelectItem>
                <SelectItem value="Sin iniciar">Sin iniciar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de evaluaciones</CardTitle>
          <CardDescription>
            {filteredEvaluations.length} evaluaciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ultima actualizacion</TableHead>
                <TableHead className="text-right">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell className="font-medium">{evaluation.studentName}</TableCell>
                  <TableCell>{evaluation.courseName}</TableCell>
                  <TableCell>{evaluation.teacherName}</TableCell>
                  <TableCell>{evaluation.subjectName}</TableCell>
                  <TableCell>
                    <StatusBadge status={evaluation.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {evaluation.lastUpdated}
                  </TableCell>
                  <TableCell className="text-right">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedEvaluation(evaluation)}
                        >
                          <Eye className="size-4 mr-1" />
                          Ver
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[min(100vw,500px)] sm:max-w-[500px]">
                        <SheetHeader>
                          <SheetTitle>{evaluation.studentName}</SheetTitle>
                          <SheetDescription>
                            {evaluation.courseName} • {evaluation.subjectName} • {data.periods.find(p => p.id === selectedPeriod)?.name}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-6">
                          <div>
                            <h4 className="text-sm font-medium mb-3">Calificaciones</h4>
                            <div className="space-y-2">
                              {Object.entries(evaluation.grades).length > 0 ? (
                                Object.entries(evaluation.grades).map(([criterion, grade]) => (
                                  <div key={criterion} className="flex items-center justify-between py-2 border-b">
                                    <span className="text-sm">{criterion}</span>
                                    <GradeBadge grade={grade as GradeLevel} />
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">Sin calificaciones cargadas</p>
                              )}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="text-sm font-medium mb-3">Informacion del docente</h4>
                            <div className="rounded-lg border p-3">
                              <p className="font-medium text-sm">{evaluation.teacherName}</p>
                              <p className="text-sm text-muted-foreground">
                                Ultima actualizacion: {evaluation.lastUpdated}
                              </p>
                            </div>
                          </div>

                          {evaluation.status === "Completo" && (
                            <>
                              <Separator />
                              <div className="rounded-lg border border-success/50 bg-success/10 p-4">
                                <h4 className="text-sm font-medium text-success mb-1">Boletin listo</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Esta evaluacion esta completa y lista para incluir en el boletin.
                                </p>
                                <Button size="sm" asChild>
                                  <Link href={`/director/boletines?student=${evaluation.studentId}`}>
                                    Revisar y enviar
                                  </Link>
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
