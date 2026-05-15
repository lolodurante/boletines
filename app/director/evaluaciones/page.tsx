"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getProgressPercentage } from "@/lib/evaluation-metrics"
import type { EvaluationStatus } from "@/lib/data"
import { toast } from "sonner"

const STATUS_ORDER: Record<EvaluationStatus, number> = {
  "Sin iniciar": 0,
  "En progreso": 1,
  "Completo": 2,
}

interface TeacherProgressData {
  selectedPeriodId: string
  periods: Array<{ id: string; name: string }>
  courses: Array<{ id: string; name: string }>
  teacherRows: Array<{
    teacherId: string
    teacherName: string
    assignments: Array<{
      courseId: string
      courseName: string
      subjectId: string
      subjectName: string
      studentCount: number
      completedCount: number
      status: EvaluationStatus
    }>
    totalSlots: number
    completedSlots: number
    overallStatus: EvaluationStatus
  }>
}

export default function SeguimientoPage() {
  const [data, setData] = useState<TeacherProgressData>({
    selectedPeriodId: "all",
    periods: [],
    courses: [],
    teacherRows: [],
  })
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)

    async function loadProgress() {
      const params = new URLSearchParams()
      if (selectedPeriodId) params.set("periodId", selectedPeriodId)
      if (selectedCourseId !== "all") params.set("courseId", selectedCourseId)

      const response = await fetch(`/api/director/teacher-progress${params.size ? `?${params}` : ""}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
      if (!response.ok) {
        toast.error("No se pudo cargar el seguimiento")
        setIsLoading(false)
        return
      }

      const nextData = (await response.json()) as TeacherProgressData
      setData(nextData)
      setSelectedPeriodId((current) => current ?? nextData.selectedPeriodId)
      setIsLoading(false)
    }

    loadProgress().catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.error("No se pudo cargar el seguimiento")
      setIsLoading(false)
    })

    return () => {
      controller.abort()
    }
  }, [selectedCourseId, selectedPeriodId])

  const teacherRows = useMemo(() => {
    const rows = selectedStatus === "all"
      ? data.teacherRows
      : data.teacherRows.filter((row) => row.overallStatus === selectedStatus)

    return [...rows].sort((a, b) => STATUS_ORDER[a.overallStatus] - STATUS_ORDER[b.overallStatus])
  }, [data.teacherRows, selectedStatus])

  const pendingCount = teacherRows.filter(r => r.overallStatus !== "Completo").length
  const doneCount = teacherRows.filter(r => r.overallStatus === "Completo").length
  const periodValue = selectedPeriodId ?? data.selectedPeriodId

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Seguimiento de docentes"
        breadcrumbs={[
          { label: "Director" },
          { label: "Seguimiento" },
        ]}
        actions={
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{pendingCount}</strong> con entregas pendientes</span>
            <span><strong className="text-success">{doneCount}</strong> completos</span>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={periodValue} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Curso:</span>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estado:</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Sin iniciar">Sin iniciar</SelectItem>
                <SelectItem value="En progreso">En progreso</SelectItem>
                <SelectItem value="Completo">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teacher rows */}
      <div className="flex flex-col gap-3">
        {!isLoading && teacherRows.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No hay docentes con asignaciones para los filtros seleccionados.
            </CardContent>
          </Card>
        )}

        {teacherRows.map((row) => {
          const pct = getProgressPercentage(row.completedSlots, row.totalSlots)
          const initials = row.teacherName.split(" ").map(n => n[0]).join("").slice(0, 2)

          return (
            <Card key={row.teacherId} className={row.overallStatus === "Sin iniciar" ? "border-destructive/30" : ""}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                {/* Teacher info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{row.teacherName}</p>
                      <StatusBadge status={row.overallStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.assignments.length} {row.assignments.length === 1 ? "asignación" : "asignaciones"}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3 w-full sm:w-48">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-sm text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                </div>

                {/* Detail button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Ver detalle
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[min(100vw,480px)] sm:max-w-[480px]">
                    <SheetHeader>
                      <SheetTitle>{row.teacherName}</SheetTitle>
                      <SheetDescription>
                        Detalle de entregas por curso y materia
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col gap-2">
                      {row.assignments.map((a, i) => {
                        const aPct = getProgressPercentage(a.completedCount, a.studentCount)
                        return (
                          <div key={i} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{a.courseName}</p>
                                <p className="text-xs text-muted-foreground">{a.subjectName}</p>
                              </div>
                              <StatusBadge status={a.status} />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={aPct} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {a.completedCount}/{a.studentCount} alumnos
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
