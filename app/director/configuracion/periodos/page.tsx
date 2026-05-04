"use client"

import { useEffect, useState } from "react"
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
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { 
  Plus, 
  Pencil, 
  Archive,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { usePlatformData } from "@/lib/use-platform-data"
import type { Period, PeriodStatus } from "@/lib/data"

export default function PeriodosPage() {
  const { data } = usePlatformData()
  const [periods, setPeriods] = useState(data.periods)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formDeadline, setFormDeadline] = useState("")
  const [formIsActive, setFormIsActive] = useState(false)

  useEffect(() => {
    setPeriods(data.periods)
  }, [data.periods])

  const handleOpenDialog = (period?: Period) => {
    if (period) {
      setEditingPeriod(period)
      setFormName(period.name)
      setFormStartDate(period.startDate)
      setFormEndDate(period.endDate)
      setFormDeadline(period.teacherDeadline)
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
        startDate: formStartDate,
        endDate: formEndDate,
        teacherDeadline: formDeadline,
        active: formIsActive,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo guardar el periodo")
      return
    }

    const result = (await response.json().catch(() => null)) as { id?: string } | null

    if (editingPeriod) {
      setPeriods(periods.map(p => 
        p.id === editingPeriod.id 
          ? { ...p, name: formName, startDate: formStartDate, endDate: formEndDate, teacherDeadline: formDeadline, status }
          : formIsActive && p.status === "Activo" ? { ...p, status: "Cerrado" as PeriodStatus } : p
      ))
      toast.success("Periodo actualizado")
    } else {
      const newPeriod: Period = {
        id: result?.id || `p${Date.now()}`,
        name: formName,
        startDate: formStartDate,
        endDate: formEndDate,
        teacherDeadline: formDeadline,
        status
      }
      
      // If new period is active, close others
      if (formIsActive) {
        setPeriods([
          ...periods.map(p => p.status === "Activo" ? { ...p, status: "Cerrado" as PeriodStatus } : p),
          newPeriod
        ])
      } else {
        setPeriods([...periods, newPeriod])
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

  const getProgress = (periodId: string) => {
    const periodEvaluations = data.evaluations.filter(evaluation => evaluation.periodId === periodId)
    if (periodEvaluations.length === 0) return 0
    const completed = periodEvaluations.filter(evaluation => evaluation.status === "Completo").length
    return Math.round((completed / periodEvaluations.length) * 100)
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
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de fin</label>
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha limite para docentes</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Activar como periodo en curso</p>
                    <p className="text-xs text-muted-foreground">
                      Solo puede haber un periodo activo a la vez
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

      {/* Info Alert */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Los periodos se toman de la configuracion guardada. Podes crear, activar o cerrar periodos desde esta pantalla.
        </AlertDescription>
      </Alert>

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
                    <span className="font-medium">{getProgress(period.id)}%</span>
                  </div>
                  <Progress value={getProgress(period.id)} className="h-2" />
                </div>
              </CardContent>
            )}

            <CardFooter className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog(period)}>
                <Pencil className="size-4 mr-2" />
                Editar
              </Button>
              {period.status !== "Cerrado" && (
                <Button variant="outline" size="sm" onClick={() => handleArchive(period.id)}>
                  <Archive className="size-4 mr-2" />
                  Archivar
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
