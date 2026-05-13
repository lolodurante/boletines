"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { 
  Eye, 
  FileText,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { usePlatformData } from "@/lib/use-platform-data"
import type { ReportStatus } from "@/lib/data"

interface HistorialRow {
  id: string
  studentId: string
  studentName: string
  courseName: string
  periodName: string
  generatedDate: string | null
  status: ReportStatus
  pdfUrl?: string
}

export default function HistorialPage() {
  const { data } = usePlatformData()
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter data
  const historialData: HistorialRow[] = data.reportHistory
  const filteredData = historialData.filter(row => {
    if (selectedPeriod !== "all" && row.periodName !== data.periods.find(p => p.id === selectedPeriod)?.name) return false
    if (selectedCourse !== "all" && row.courseName !== data.courses.find(c => c.id === selectedCourse)?.name) return false
    if (selectedStatus !== "all" && row.status !== selectedStatus) return false
    if (searchQuery && !row.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Calculate summary counts
  const generatedCount = filteredData.filter(r => r.status === "PDF generado").length
  const pendingCount = filteredData.filter(r => r.status === "Listo para revisión").length
  const revisionCount = filteredData.filter(r => r.status === "Requiere revisión").length

  const handleGenerate = async (row: HistorialRow) => {
    const response = await fetch("/api/report-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_pdf",
        reportCardId: row.id,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo generar el PDF")
      return
    }

    toast.success("PDF generado")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Historial de boletines" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Evaluaciones" },
          { label: "Historial" }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-4 text-success" />
              PDF generado: <strong>{generatedCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="size-4 text-warning" />
              Pendientes: <strong>{pendingCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="size-4 text-destructive" />
              En revisión: <strong>{revisionCount}</strong>
            </span>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Periodo:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todos" />
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
                <SelectValue placeholder="Todos" />
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
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="No listo">No listo</SelectItem>
                <SelectItem value="Listo para revisión">Listo para revision</SelectItem>
                <SelectItem value="PDF generado">PDF generado</SelectItem>
                <SelectItem value="Requiere revisión">Requiere revision</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:w-[200px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de boletines</CardTitle>
          <CardDescription>
            {filteredData.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Fecha de PDF</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.studentName}</TableCell>
                  <TableCell>{row.courseName}</TableCell>
                  <TableCell>{row.periodName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.generatedDate || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.pdfUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={row.pdfUrl} target="_blank" rel="noreferrer">
                            <Eye className="size-4 mr-1.5" />
                            Ver PDF
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <Eye className="size-4 mr-1.5" />
                          Ver PDF
                        </Button>
                      )}
                      {row.status === "Listo para revisión" && (
                        <Button variant="outline" size="sm" onClick={() => handleGenerate(row)}>
                          <FileText className="size-4 mr-1.5" />
                          Generar PDF
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/director/boletines?student=${row.studentId}`}>
                          <MessageSquare className="size-4 mr-1.5" />
                          Revisar
                        </Link>
                      </Button>
                    </div>
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
