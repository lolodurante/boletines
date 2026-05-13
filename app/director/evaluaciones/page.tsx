"use client"

import { useState } from "react"
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
import { usePlatformData } from "@/lib/use-platform-data"
import {
  getAssignmentProgress,
  getProgressPercentage,
  getStatusFromProgress,
} from "@/lib/evaluation-metrics"
import type { EvaluationStatus } from "@/lib/data"

const STATUS_ORDER: Record<EvaluationStatus, number> = {
  "Sin iniciar": 0,
  "En progreso": 1,
  "Completo": 2,
}

export default function SeguimientoPage() {
  const { data } = usePlatformData()
  const [selectedPeriodId, setSelectedPeriodId] = useState(
    data.periods.find(p => p.status === "Activo")?.id ?? data.periods[0]?.id ?? "all"
  )
  const [selectedCourseId, setSelectedCourseId] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const activePeriodId = selectedPeriodId === "all" ? null : selectedPeriodId

  const filteredAssignments = data.courseAssignments.filter(a => {
    if (activePeriodId && a.periodId !== activePeriodId) return false
    if (selectedCourseId !== "all" && a.courseId !== selectedCourseId) return false
    return true
  })

  // Group assignments by teacher
  const teacherMap = new Map<string, {
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
  }>()

  for (const assignment of filteredAssignments) {
    const teacher = data.teachers.find(t => t.id === assignment.teacherId)
    if (!teacher) continue
    const course = data.courses.find(c => c.id === assignment.courseId)
    const subject = data.subjects.find(s => s.id === assignment.subjectId)
    const progress = getAssignmentProgress(data, assignment)

    if (!teacherMap.has(teacher.id)) {
      teacherMap.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: teacher.name,
        assignments: [],
        totalSlots: 0,
        completedSlots: 0,
      })
    }
    const entry = teacherMap.get(teacher.id)!
    entry.assignments.push({
      courseId: assignment.courseId,
      courseName: course?.name ?? "—",
      subjectId: assignment.subjectId,
      subjectName: subject?.name ?? "—",
      studentCount: progress.studentCount,
      completedCount: progress.completedCount,
      status: progress.status,
    })
    entry.totalSlots += progress.studentCount
    entry.completedSlots += progress.completedCount
  }

  let teacherRows = Array.from(teacherMap.values()).map(row => ({
    ...row,
    overallStatus: getStatusFromProgress(row.completedSlots, row.totalSlots),
  }))

  // Filter by status
  if (selectedStatus !== "all") {
    teacherRows = teacherRows.filter(r => r.overallStatus === selectedStatus)
  }

  // Sort: incomplete first
  teacherRows.sort((a, b) => STATUS_ORDER[a.overallStatus] - STATUS_ORDER[b.overallStatus])

  const pendingCount = teacherRows.filter(r => r.overallStatus !== "Completo").length
  const doneCount = teacherRows.filter(r => r.overallStatus === "Completo").length

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
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
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
        {teacherRows.length === 0 && (
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
