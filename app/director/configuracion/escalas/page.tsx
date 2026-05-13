"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  Trash2,
  GripVertical,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface GradeLevel {
  name: string
  color: string
  order: number
}

interface GradeScale {
  id: string
  name: string
  appliesTo: string[]
  levels: GradeLevel[]
}

const colorOptions = [
  { label: "Logrado", value: "bg-success", hex: "#22c55e" },
  { label: "Destacado", value: "bg-accent", hex: "#6366f1" },
  { label: "En proceso", value: "bg-warning", hex: "#f59e0b" },
  { label: "En inicio", value: "bg-destructive", hex: "#ef4444" },
  { label: "No evaluado", value: "bg-muted", hex: "#94a3b8" },
]

const gradeOptions = ["1°", "2°", "3°", "4°", "5°", "6°"]

function ColorSwatch({
  selected,
  onChange,
}: {
  selected: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-1.5">
      {colorOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={cn(
            "size-6 rounded-full border-2 transition-transform hover:scale-110",
            selected === opt.value ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ backgroundColor: opt.hex }}
        />
      ))}
    </div>
  )
}

function DraggableLevels({
  levels,
  onChange,
  onRemove,
  onChangeName,
  onChangeColor,
}: {
  levels: GradeLevel[]
  onChange: (levels: GradeLevel[]) => void
  onRemove: (index: number) => void
  onChangeName: (index: number, value: string) => void
  onChangeColor: (index: number, value: string) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const handleActive = useRef<boolean>(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggableIndex, setDraggableIndex] = useState<number | null>(null)

  const handleDragStart = (index: number, e: React.DragEvent) => {
    if (!handleActive.current) {
      e.preventDefault()
      return
    }
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
    const next = [...levels]
    const [moved] = next.splice(from, 1)
    next.splice(dropIndex, 0, moved!)
    onChange(next.map((l, i) => ({ ...l, order: i + 1 })))
    dragIndex.current = null
    handleActive.current = false
    setDraggableIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    handleActive.current = false
    setDraggableIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-2">
      {levels.map((level, index) => (
        <div
          key={index}
          draggable={draggableIndex === index}
          onDragStart={(e) => handleDragStart(index, e)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2 py-2 transition-colors",
            dragOverIndex === index ? "bg-accent/20 border-accent" : "bg-background",
          )}
        >
          <GripVertical
            className="size-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={() => {
              handleActive.current = true
              setDraggableIndex(index)
            }}
            onPointerUp={() => {
              handleActive.current = false
              setDraggableIndex(null)
            }}
          />
          <Input
            placeholder="Nombre del nivel"
            value={level.name}
            onChange={(e) => onChangeName(index, e.target.value)}
            className="flex-1 h-8"
          />
          <ColorSwatch
            selected={level.color}
            onChange={(v) => onChangeColor(index, v)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(index)}
            disabled={levels.length === 1}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}

export default function EscalasPage() {
  const [scales, setScales] = useState<GradeScale[]>([])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingScale, setEditingScale] = useState<GradeScale | null>(null)
  const [newScaleName, setNewScaleName] = useState("")
  const [newScaleGrades, setNewScaleGrades] = useState<string[]>([])
  const [newScaleLevels, setNewScaleLevels] = useState<GradeLevel[]>([
    { name: "", color: "bg-success", order: 1 }
  ])

  useEffect(() => {
    let isMounted = true

    async function loadScales() {
      const response = await fetch("/api/grading-scales", { cache: "no-store" })
      if (!response.ok) return
      const payload = (await response.json()) as { scales?: GradeScale[] }
      if (isMounted && payload.scales) setScales(payload.scales)
    }

    void loadScales()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAddLevel = () => {
    setNewScaleLevels([
      ...newScaleLevels,
      { name: "", color: "bg-muted", order: newScaleLevels.length + 1 }
    ])
  }

  const handleRemoveLevel = (index: number) => {
    setNewScaleLevels(newScaleLevels.filter((_, i) => i !== index))
  }

  const handleLevelNameChange = (index: number, value: string) => {
    setNewScaleLevels(prev => prev.map((l, i) => i === index ? { ...l, name: value } : l))
  }

  const handleLevelColorChange = (index: number, value: string) => {
    setNewScaleLevels(prev => prev.map((l, i) => i === index ? { ...l, color: value } : l))
  }

  const handleSaveScale = async () => {
    if (!newScaleName || newScaleGrades.length === 0 || newScaleLevels.some(l => !l.name)) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    const newScale: GradeScale = {
      id: editingScale?.id ?? `s${Date.now()}`,
      name: newScaleName,
      appliesTo: newScaleGrades,
      levels: newScaleLevels
    }

    const response = await fetch("/api/grading-scales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", scale: newScale }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo guardar la escala")
      return
    }

    const result = (await response.json().catch(() => null)) as { id?: string } | null
    const savedScale = { ...newScale, id: result?.id ?? newScale.id }

    if (editingScale) {
      setScales(scales.map(s => s.id === editingScale.id ? savedScale : s))
      toast.success("Escala actualizada correctamente")
    } else {
      setScales([...scales, savedScale])
      toast.success("Escala creada correctamente")
    }

    resetForm()
    setIsSheetOpen(false)
  }

  const handleEditScale = (scale: GradeScale) => {
    setEditingScale(scale)
    setNewScaleName(scale.name)
    setNewScaleGrades(scale.appliesTo)
    setNewScaleLevels(scale.levels)
    setIsSheetOpen(true)
  }

  const handleDeleteScale = async (scaleId: string) => {
    const response = await fetch("/api/grading-scales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: scaleId }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo eliminar la escala")
      return
    }

    setScales(scales.filter(s => s.id !== scaleId))
    toast.success("Escala eliminada")
  }

  const resetForm = () => {
    setEditingScale(null)
    setNewScaleName("")
    setNewScaleGrades([])
    setNewScaleLevels([{ name: "", color: "bg-success", order: 1 }])
  }

  const toggleGrade = (grade: string) => {
    setNewScaleGrades(prev =>
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escalas de calificacion"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Escalas de calificacion" }
        ]}
        actions={
          <Sheet open={isSheetOpen} onOpenChange={(open) => {
            setIsSheetOpen(open)
            if (!open) resetForm()
          }}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Nueva escala
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[min(100vw,500px)] sm:max-w-[500px]">
              <SheetHeader>
                <SheetTitle>
                  {editingScale ? "Editar escala" : "Nueva escala"}
                </SheetTitle>
                <SheetDescription>
                  {editingScale
                    ? "Modifica los niveles de calificacion"
                    : "Define los niveles de calificacion para esta escala"
                  }
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre de la escala</label>
                  <Input
                    placeholder="Ej: 1° a 3° grado"
                    value={newScaleName}
                    onChange={(e) => setNewScaleName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Aplicar a grados</label>
                  <div className="flex flex-wrap gap-2">
                    {gradeOptions.map(grade => (
                      <Badge
                        key={grade}
                        variant={newScaleGrades.includes(grade) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleGrade(grade)}
                      >
                        {grade}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Niveles de calificacion</label>
                  <p className="text-xs text-muted-foreground">Arrastrá para reordenar</p>
                  <DraggableLevels
                    levels={newScaleLevels}
                    onChange={setNewScaleLevels}
                    onRemove={handleRemoveLevel}
                    onChangeName={handleLevelNameChange}
                    onChangeColor={handleLevelColorChange}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddLevel} className="mt-2">
                    <Plus className="size-4 mr-2" />
                    Agregar nivel
                  </Button>
                </div>
              </div>

              <SheetFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveScale}>
                  Guardar
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-6">
        {scales.map((scale) => (
          <Card key={scale.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{scale.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="text-muted-foreground">Aplica a: </span>
                    {scale.appliesTo.map(grade => (
                      <Badge key={grade} variant="secondary" className="mr-1">
                        {grade}
                      </Badge>
                    ))}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center">Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scale.levels.map((level, i) => {
                    const colorOpt = colorOptions.find(c => c.value === level.color)
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{level.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: colorOpt?.hex ?? "#94a3b8" }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {colorOpt?.label ?? level.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{i + 1}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditScale(scale)}>
                <Pencil className="size-4 mr-2" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar &quot;{scale.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta escala se eliminará permanentemente. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteScale(scale.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
