"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  AlertCircle,
  Mail,
  Send,
  FileText,
  ExternalLink,
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
  courseId: string
  courseName: string
  completedDate: string
  status: "No listo" | "Listo para revisión" | "Pendiente de envío" | "Sin correo registrado" | "Enviado" | "Requiere revisión"
  parentEmail: string | null
  pdfUrl?: string
  grades: Array<{
    subjectName: string
    teacherId: string
    teacherName: string
    criteria: Array<{ name: string; grade: GradeLevel }>
    observation?: string
  }>
}

export default function BoletinesPage() {
  const searchParams = useSearchParams()
  const { data } = usePlatformData()
  const [reportCards, setReportCards] = useState<ReportCardData[]>([])
  const showMissingEmailOnly = searchParams.get("missingEmail") === "true"
  const dynamicReportCardsData: ReportCardData[] = showMissingEmailOnly
    ? reportCards.filter((report) => !report.parentEmail)
    : reportCards
  const [selectedReportId, setSelectedReportId] = useState(dynamicReportCardsData[0]?.id)
  const [directorObservation, setDirectorObservation] = useState("")
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false)
  const [revisionTeacher, setRevisionTeacher] = useState("")
  const [revisionMessage, setRevisionMessage] = useState("")

  const selectedReport = dynamicReportCardsData.find(r => r.id === selectedReportId)
  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const selectedReportTeachers = Array.from(
    new Map(selectedReport?.grades.map((grade) => [grade.teacherId, grade.teacherName]) ?? []).entries(),
  )
  const canSendSelectedReport =
    Boolean(selectedReport?.parentEmail) &&
    (selectedReport?.status === "Listo para revisión" || selectedReport?.status === "Pendiente de envío")

  useEffect(() => {
    setReportCards(data.directorReportCards)
  }, [data.directorReportCards])

  useEffect(() => {
    const studentId = searchParams.get("student")
    const requestedReport = studentId
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
          ? { ...report, status, completedDate: report.completedDate, pdfUrl: pdfUrl ?? report.pdfUrl }
          : report,
      ),
    )
  }

  const handleSendReport = async () => {
    if (!selectedReport) return
    const response = await fetch("/api/report-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        reportCardId: selectedReport.id,
        directorObservation,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo enviar el boletin")
      return
    }

    const result = (await response.json().catch(() => null)) as { pdfUrl?: string } | null
    updateSelectedReport("Enviado", result?.pdfUrl)
    toast.success("Boletin enviado a padre/tutor", {
      description: `Enviado a ${selectedReport.parentEmail}`
    })
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
        title="Boletines pendientes de envio" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Boletines" }
        ]}
      />

      {/* Split View */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:h-[calc(100vh-200px)]">
        {/* Left: List */}
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Boletines listos</CardTitle>
              <CardDescription>
                {dynamicReportCardsData.length} boletines registrados
                {showMissingEmailOnly ? " sin correo de tutor" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[360px] xl:h-[calc(100vh-340px)] xl:max-h-none">
                <div className="space-y-1 p-2">
                  {dynamicReportCardsData.map((report) => (
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
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(report.studentName.split(",")[0] ?? report.studentName).slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{report.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.courseName} • Completado {report.completedDate}
                        </p>
                      </div>
                      {!report.parentEmail && (
                        <div className="size-2 rounded-full bg-destructive" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="xl:col-span-3">
          {selectedReport ? (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Boletin — {selectedReport.studentName}</CardTitle>
                    <CardDescription>
                      {selectedReport.courseName} • {activePeriod?.name}
                    </CardDescription>
                  </div>
                  <StatusBadge status={selectedReport.status} />
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto space-y-4">
                {/* Missing Email Alert */}
                {!selectedReport.parentEmail && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Correo no registrado</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {selectedReport.studentName} no tiene correo de padre/tutor en el sistema. 
                        El boletin no puede enviarse.
                      </span>
                      <Button variant="link" size="sm" className="text-destructive p-0 h-auto" disabled>
                        Ver en Zoho CRM
                        <ExternalLink className="size-3 ml-1" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Report Preview */}
                <div className="rounded-lg border">
                  {/* Student Info */}
                  <div className="border-b bg-muted/50 p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
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
                        <p className="font-medium">{activePeriod?.name}</p>
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
                  onClick={handleSendReport}
                  disabled={!canSendSelectedReport}
                >
                  <Send className="size-4 mr-2" />
                  Confirmar y enviar boletin
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
