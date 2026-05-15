"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Pencil,
  Archive,
} from "lucide-react"
import { toast } from "sonner"
import type { Period, PeriodStatus } from "@/lib/data"

interface PeriodWithProgress extends Period {
  progress: number
}

interface PeriodConfigData {
  periods: PeriodWithProgress[]
}

function toInputDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split("/")
  if (!d || !m || !y) return ""
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

function fromInputDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-")
  if (!d || !m || !y) return ""
  return `${d}/${m}/${y}`
}

export default function PeriodosPage() {
  const [periods, setPeriods] = useState<PeriodWithProgress[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formDeadline, setFormDeadline] = useState("")
  const [formIsActive, setFormIsActive] = useState(false)

  const loadData = useCallback(async () => {
    const response = await fetch("/api/director/period-config", { cache: "no-store" })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(error?.error ?? "No se pudieron cargar los periodos")
    }

    const data = (await response.json()) as PeriodConfigData
    setPeriods(data.periods)
    setLoadError(null)
  }, [])

  useEffect(() => {
    loadData().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los periodos")
    })
  }, [loadData])

  const handleOpenDialog = (period?: Period) => {
    if (period) {
      setEditingPeriod(period)
      setFormName(period.name)
      setFormStartDate(toInputDate(period.startDate))
      setFormEndDate(toInputDate(period.endDate))
      setFormDeadline(toInputDate(period.teacherDeadline))
      setFormIsActive(period.status === "Activo")
    } else {
      setEditingPeriod(null)
      setFormName("")
      setFormStartDate("")
      setFormEndDate("")
      setFormDeadline("")
      setFormIsActive(false)
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName || !formStartDate || !formEndDate || !formDeadline) {
      toast.error("Completa todos los campos")
      return
    }

    let status: PeriodStatus = "Próximo"
    if (formIsActive) {
      status = "Activo"
    }

    const response = await fetch("/api/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        id: editingPeriod?.id,
        name: formName,
        startDate: fromInputDate(formStartDate),
        endDate: fromInputDate(formEndDate),
        teacherDeadline: fromInputDate(formDeadline),
        active: formIsActive,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo guardar el periodo")
      return
    }

    const result = (await response.json().catch(() => null)) as { id?: string } | null

    const displayStart = fromInputDate(formStartDate)
    const displayEnd = fromInputDate(formEndDate)
    const displayDeadline = fromInputDate(formDeadline)

    if (editingPeriod) {
      setPeriods(periods.map(p =>
        p.id === editingPeriod.id
          ? { ...p, name: formName, startDate: displayStart, endDate: displayEnd, teacherDeadline: displayDeadline, status }
          : formIsActive && p.status === "Activo" ? { ...p, status: "Cerrado" as PeriodStatus } : p
      ))
      toast.success("Periodo actualizado")
    } else {
      const newPeriod: Period = {
        id: result?.id || `p${Date.now()}`,
        name: formName,
        startDate: displayStart,
        endDate: displayEnd,
        teacherDeadline: displayDeadline,
        status
      }
      const newPeriodWithProgress = { ...newPeriod, progress: 0 }
      
      // If new period is active, close others
      if (formIsActive) {
        setPeriods([
          ...periods.map(p => p.status === "Activo" ? { ...p, status: "Cerrado" as PeriodStatus } : p),
          newPeriodWithProgress
        ])
      } else {
        setPeriods([...periods, newPeriodWithProgress])
      }
      toast.success("Periodo creado")
    }

    setIsDialogOpen(false)
  }

  const handleArchive = async (periodId: string) => {
    const response = await fetch("/api/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "archive",
        id: periodId,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo archivar el periodo")
      return
    }

    setPeriods(periods.map(p => 
      p.id === periodId ? { ...p, status: "Cerrado" as PeriodStatus } : p
    ))
    toast.success("Periodo archivado")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Periodos" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Periodos" }
        ]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="size-4 mr-2" />
                Nuevo periodo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? "Editar periodo" : "Nuevo periodo"}
                </DialogTitle>
                <DialogDescription>
                  {editingPeriod 
                    ? "Modifica las fechas y configuracion del periodo"
                    : "Configura las fechas del nuevo periodo"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del periodo</label>
                  <Input
                    placeholder="Ej: 1° Trimestre 2025"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de inicio</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de fin</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha límite para docentes</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Activar como periodo en curso</p>
                    <p className="text-xs text-muted-foreground">
                      {formIsActive && periods.some(p => p.status === "Activo" && p.id !== editingPeriod?.id)
                        ? "⚠️ Esto cerrará el período activo actual"
                        : "Solo puede haber un periodo activo a la vez"}
                    </p>
                  </div>
                  <Switch
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Period Cards */}
      <div className="grid gap-4">
        {periods.map((period) => (
          <Card key={period.id} className={period.status === "Activo" ? "border-accent" : ""}>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {period.name}
                    <StatusBadge status={period.status} />
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <span className="inline-flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                      <span>Inicio: <strong>{period.startDate}</strong></span>
                      <span>Fin: <strong>{period.endDate}</strong></span>
                      <span>Limite docentes: <strong>{period.teacherDeadline}</strong></span>
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            {period.status === "Activo" && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avance de evaluaciones</span>
                    <span className="font-medium">{period.progress}%</span>
                  </div>
                  <Progress value={period.progress} className="h-2" />
                </div>
              </CardContent>
            )}

            <CardFooter className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog(period)}>
                <Pencil className="size-4 mr-2" />
                Editar
              </Button>
              {period.status !== "Cerrado" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Archive className="size-4 mr-2" />
                      Archivar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Archivar &quot;{period.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        El período quedará cerrado. Los docentes ya no podrán cargar evaluaciones en él.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleArchive(period.id)}>
                        Archivar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
