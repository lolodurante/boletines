"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import { GradeBadge } from "@/components/grade-badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Download,
  FileText,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePlatformData } from "@/lib/use-platform-data"
import type { GradeLevel } from "@/lib/data"

// Build report card data
interface ReportCardData {
  id: string
  studentId: string
  studentName: string
  periodId: string
  periodName: string
  reportType: "ESPANOL" | "INGLES"
  courseId: string
  courseName: string
  completedDate: string
  status: "No listo" | "Listo para revisión" | "PDF generado" | "Requiere revisión"
  parentEmail: string | null
  directorObservation?: string
  pdfUrl?: string
  grades: Array<{
    subjectName: string
    teacherId: string
    teacherName: string
    criteria: Array<{ name: string; grade: GradeLevel }>
    observation?: string
  }>
}

function getReportTypeLabel(reportType: ReportCardData["reportType"]) {
  return reportType === "INGLES" ? "Inglés" : "Español"
}

export default function BoletinesPage() {
  const searchParams = useSearchParams()
  const { data } = usePlatformData()
  const [reportCards, setReportCards] = useState<ReportCardData[]>([])
  const dynamicReportCardsData: ReportCardData[] = reportCards
  const [selectedReportId, setSelectedReportId] = useState(dynamicReportCardsData[0]?.id)
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all")
  const [directorObservation, setDirectorObservation] = useState("")
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false)
  const [revisionTeacher, setRevisionTeacher] = useState("")
  const [revisionMessage, setRevisionMessage] = useState("")

  const filteredReportCards = selectedCourseFilter === "all"
    ? dynamicReportCardsData
    : dynamicReportCardsData.filter(r => r.courseId === selectedCourseFilter)

  const selectedReport = dynamicReportCardsData.find(r => r.id === selectedReportId)
  const selectedReportTeachers = Array.from(
    new Map(selectedReport?.grades.map((grade) => [grade.teacherId, grade.teacherName]) ?? []).entries(),
  )
  const canGenerateSelectedReport =
    selectedReport?.status === "Listo para revisión" || selectedReport?.status === "PDF generado"

  useEffect(() => {
    setReportCards(data.directorReportCards)
  }, [data.directorReportCards])

  useEffect(() => {
    setDirectorObservation(selectedReport?.directorObservation ?? "")
  }, [selectedReport?.directorObservation, selectedReport?.id])

  useEffect(() => {
    const reportId = searchParams.get("report")
    const studentId = searchParams.get("student")
    const requestedReport = reportId
      ? dynamicReportCardsData.find((report) => report.id === reportId)
      : studentId
      ? dynamicReportCardsData.find((report) => report.studentId === studentId)
      : undefined

    if (requestedReport && requestedReport.id !== selectedReportId) {
      setSelectedReportId(requestedReport.id)
      return
    }

    if (!selectedReportId || !dynamicReportCardsData.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(dynamicReportCardsData[0]?.id)
    }
  }, [dynamicReportCardsData, searchParams, selectedReportId])

  const updateSelectedReport = (status: ReportCardData["status"], pdfUrl?: string) => {
    if (!selectedReport) return

    setReportCards((current) =>
      current.map((report) =>
        report.id === selectedReport.id
          ? {
              ...report,
              status,
              completedDate: report.completedDate,
              directorObservation,
              pdfUrl: pdfUrl ?? report.pdfUrl,
            }
          : report,
      ),
    )
  }

  const handleGenerateReport = async () => {
    if (!selectedReport) return
    const response = await fetch("/api/report-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_pdf",
        reportCardId: selectedReport.id,
        directorObservation,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo generar el PDF")
      return
    }

    const result = (await response.json().catch(() => null)) as { pdfUrl?: string } | null
    updateSelectedReport("PDF generado", result?.pdfUrl)

    if (result?.pdfUrl) {
      const link = document.createElement("a")
      link.href = result.pdfUrl
      link.download = `boletin-${getReportTypeLabel(selectedReport.reportType).toLowerCase()}-${selectedReport.studentName.replace(/,\s*/g, "-").replace(/\s+/g, "-").toLowerCase()}.pdf`
      link.click()
    }

    toast.success("PDF generado y descargado")
  }

  const handleRequestRevision = async () => {
    if (!selectedReport) return
    const response = await fetch("/api/report-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request_revision",
        reportCardId: selectedReport.id,
        teacherId: revisionTeacher,
        message: revisionMessage,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo solicitar revision")
      return
    }

    updateSelectedReport("Requiere revisión")
    setIsRevisionDialogOpen(false)
    toast.success("Solicitud de revision enviada", {
      description: `Enviada a ${data.teachers.find((teacher) => teacher.id === revisionTeacher)?.name ?? "docente"}`
    })
    setRevisionTeacher("")
    setRevisionMessage("")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Generar boletines"
        breadcrumbs={[
          { label: "Director" },
          { label: "Boletines" },
          { label: "Generar boletines" }
        ]}
      />

      {/* Split View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,340px)_1fr] lg:h-[calc(100dvh-180px)]">
        {/* Left: List */}
        <div className="flex flex-col min-h-0">
          <Card className="flex flex-col min-h-0 h-full">
            <CardHeader className="shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Alumnos</CardTitle>
                  <CardDescription>
                    {filteredReportCards.length} de {dynamicReportCardsData.length} boletines
                  </CardDescription>
                </div>
              </div>
              <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {data.courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-[360px] lg:h-full">
                <div className="space-y-1 p-2">
                  {filteredReportCards.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                        selectedReportId === report.id
                          ? "bg-accent/10 border-l-2 border-accent"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(report.studentName.split(",")[0] ?? report.studentName).slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{report.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {report.courseName} • {getReportTypeLabel(report.reportType)}
                        </p>
                      </div>
                      <div className={cn(
                        "size-2 rounded-full shrink-0",
                        report.status === "PDF generado" ? "bg-success" :
                        report.status === "Listo para revisión" ? "bg-accent" :
                        report.status === "Requiere revisión" ? "bg-destructive" :
                        "bg-muted-foreground/30"
                      )} />
                    </button>
                  ))}
                  {filteredReportCards.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No hay boletines para este curso.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="min-h-0">
          {selectedReport ? (
            <Card className="flex flex-col h-full min-h-[500px]">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Boletin {getReportTypeLabel(selectedReport.reportType)} — {selectedReport.studentName}</CardTitle>
                    <CardDescription>
                      {selectedReport.courseName} • {selectedReport.periodName}
                    </CardDescription>
                  </div>
                  <StatusBadge status={selectedReport.status} />
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto space-y-4">
                {/* Report Preview */}
                <div className="rounded-lg border">
                  {/* Student Info */}
                  <div className="border-b bg-muted/50 p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-4 sm:gap-4">
                      <div>
                        <span className="text-muted-foreground">Boletín:</span>
                        <p className="font-medium">{getReportTypeLabel(selectedReport.reportType)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Alumno:</span>
                        <p className="font-medium">{selectedReport.studentName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Curso:</span>
                        <p className="font-medium">{selectedReport.courseName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Periodo:</span>
                        <p className="font-medium">{selectedReport.periodName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grades Table */}
                  <div className="p-4">
                    <h4 className="font-medium mb-3">Calificaciones</h4>
                    <div className="space-y-4">
                      {selectedReport.grades.map((subject, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium text-sm">{subject.subjectName}</span>
                            <span className="text-xs text-muted-foreground">
                              {subject.teacherName}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                            {subject.criteria.map((c, cidx) => (
                              <div key={cidx} className="flex items-center justify-between text-sm border rounded-md p-2">
                                <span className="text-muted-foreground text-xs">{c.name}</span>
                                <GradeBadge grade={c.grade} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Observations */}
                  <Accordion type="multiple" className="border-t">
                    <AccordionItem value="observations" className="border-none">
                      <AccordionTrigger className="px-4 py-3 text-sm">
                        Observaciones del docente por materia
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {selectedReport.grades.filter(g => g.observation).map((subject, idx) => (
                          <div key={idx} className="mb-3 last:mb-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {subject.subjectName}:
                            </p>
                            <p className="text-sm">{subject.observation}</p>
                          </div>
                        ))}
                        {selectedReport.grades.every(g => !g.observation) && (
                          <p className="text-sm text-muted-foreground">Sin observaciones</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Director Observation */}
                  <div className="border-t p-4">
                    <Separator className="mb-4" />
                    <h4 className="font-medium text-sm mb-2">Observacion del director</h4>
                    <Textarea
                      placeholder="Agregar observacion del director (opcional)"
                      value={directorObservation}
                      onChange={(e) => setDirectorObservation(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </CardContent>

              {/* Actions */}
              <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end">
                {selectedReport.pdfUrl ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={selectedReport.pdfUrl} target="_blank" rel="noreferrer">
                      <FileText className="size-4 mr-2" />
                      Ver PDF
                    </Link>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled>
                    <FileText className="size-4 mr-2" />
                    Ver PDF
                  </Button>
                )}
                
                <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="size-4 mr-2" />
                      Solicitar revision al docente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Solicitar revision al docente</DialogTitle>
                      <DialogDescription>
                        Selecciona el docente y describe que debe revisar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Docente</label>
                        <Select value={revisionTeacher} onValueChange={setRevisionTeacher}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar docente" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedReportTeachers.map(([teacherId, teacherName]) => (
                              <SelectItem key={teacherId} value={teacherId}>
                                {teacherName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Indicar que debe revisar</label>
                        <Textarea
                          placeholder="Describe que necesita revision..."
                          value={revisionMessage}
                          onChange={(e) => setRevisionMessage(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRevisionDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleRequestRevision} disabled={!revisionTeacher || !revisionMessage}>
                        Enviar solicitud
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button 
                  size="sm" 
                  onClick={handleGenerateReport}
                  disabled={!canGenerateSelectedReport}
                >
                  <Download className="size-4 mr-2" />
                  Generar PDF
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Selecciona un boletin para ver el preview</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
