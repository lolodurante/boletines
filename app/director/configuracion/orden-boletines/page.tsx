"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { GripVertical, Save } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SubjectItem {
  id: string
  name: string
  entryKind: string
}

interface SubjectConfigData {
  subjects: Array<{ id: string; name: string; reportType: string; entryKind?: string }>
}

function getEntryKindLabel(kind: string) {
  if (kind === "TEACHER_OBSERVATION") return "Obs. docente"
  if (kind === "ABSENCES") return "Inasistencias"
  return null
}

function DraggableList({
  title,
  items,
  onChange,
}: {
  title: string
  items: SubjectItem[]
  onChange: (items: SubjectItem[]) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(dropIndex, 0, moved!)
    onChange(next)
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <h2 className="text-base font-semibold">Boletín {title}</h2>
        <p className="text-xs text-muted-foreground">
          Arrastrá las filas para cambiar el orden en el que aparecen en el boletín.
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10 px-4">
            No hay materias en este boletín.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item, index) => {
              const badge = getEntryKindLabel(item.entryKind)
              const isOver = dragOverIndex === index
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing select-none transition-colors",
                    isOver ? "bg-accent/20 border-t-2 border-accent" : "hover:bg-muted/40",
                  )}
                >
                  <GripVertical className="size-4 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  {badge && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      {badge}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/40 tabular-nums w-5 text-right shrink-0">
                    {index + 1}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function OrdenBoletinesPage() {
  const [espanol, setEspanol] = useState<SubjectItem[]>([])
  const [ingles, setIngles] = useState<SubjectItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const applyLoadedData = useCallback((data: SubjectConfigData) => {
    const all = data.subjects
    setEspanol(all.filter((s) => s.reportType === "ESPANOL").map((s) => ({ id: s.id, name: s.name, entryKind: s.entryKind ?? "ACADEMIC" })))
    setIngles(all.filter((s) => s.reportType === "INGLES").map((s) => ({ id: s.id, name: s.name, entryKind: s.entryKind ?? "ACADEMIC" })))
  }, [])

  const loadData = useCallback(async () => {
    const response = await fetch("/api/director/subject-config", { cache: "no-store" })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(error?.error ?? "No se pudo cargar el orden")
    }

    const data = (await response.json()) as SubjectConfigData
    applyLoadedData(data)
    setLoadError(null)
  }, [applyLoadedData])

  useEffect(() => {
    if (hasChanges) return
    loadData().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el orden")
    })
  }, [hasChanges, loadData])

  const handleChange = (type: "ESPANOL" | "INGLES") => (items: SubjectItem[]) => {
    if (type === "ESPANOL") setEspanol(items)
    else setIngles(items)
    setHasChanges(true)
  }

  const handleSave = async () => {
    const allItems = [...espanol, ...ingles]
    const orderPayload = allItems
      .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))
      .map((item, i) => ({
        id: item.id,
        order: i,
      }))

    // Assign per-boletín order (reset index per group)
    const espanolOrder = espanol
      .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))
      .map((item, i) => ({ id: item.id, order: i }))
    const inglesOrder = ingles
      .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))
      .map((item, i) => ({ id: item.id, order: i }))

    void orderPayload

    setIsSaving(true)
    const response = await fetch("/api/subjects/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: [...espanolOrder, ...inglesOrder] }),
    })
    setIsSaving(false)

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo guardar el orden")
      return
    }

    await loadData()
    setHasChanges(false)
    toast.success("Orden guardado")
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Orden de boletines"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuración" },
          { label: "Orden de boletines" },
        ]}
      />

      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DraggableList title="Español" items={espanol} onChange={handleChange("ESPANOL")} />
        <DraggableList title="Inglés" items={ingles} onChange={handleChange("INGLES")} />
      </div>

      <div className="flex items-center justify-between gap-3 border rounded-lg bg-card px-4 py-3">
        <span className={cn("text-xs transition-opacity", hasChanges ? "text-warning opacity-100" : "opacity-0")}>
          Cambios sin guardar
        </span>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm">
          <Save className="size-4 mr-2" />
          {isSaving ? "Guardando..." : "Guardar orden"}
        </Button>
      </div>
    </div>
  )
}
