"use client"

import { useEffect, useState } from "react"
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
  Plus, 
  Pencil, 
  Trash2,
  GripVertical
} from "lucide-react"
import { toast } from "sonner"

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
  { name: "Verde (Logrado)", value: "bg-success" },
  { name: "Azul (Destacado)", value: "bg-accent" },
  { name: "Amarillo (En proceso)", value: "bg-warning" },
  { name: "Rojo (En inicio)", value: "bg-destructive" },
  { name: "Gris (No evaluado)", value: "bg-muted" },
]

const gradeOptions = ["1°", "2°", "3°", "4°", "5°", "6°"]

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

  const handleLevelChange = (index: number, field: keyof GradeLevel, value: string | number) => {
    const updated = [...newScaleLevels]
    const currentLevel = updated[index]
    if (!currentLevel) return
    updated[index] = { ...currentLevel, [field]: value }
    setNewScaleLevels(updated)
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
                  <div className="space-y-2">
                    {newScaleLevels.map((level, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                        <Input
                          placeholder="Nombre del nivel"
                          value={level.name}
                          onChange={(e) => handleLevelChange(index, "name", e.target.value)}
                          className="flex-1"
                        />
                        <select
                          value={level.color}
                          onChange={(e) => handleLevelChange(index, "color", e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {colorOptions.map(color => (
                            <option key={color.value} value={color.value}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLevel(index)}
                          disabled={newScaleLevels.length === 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddLevel}>
                      <Plus className="size-4 mr-2" />
                      Agregar nivel
                    </Button>
                  </div>
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

      {/* Scale Cards */}
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
                  {scale.levels.map((level) => (
                    <TableRow key={level.name}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`size-3 rounded-full ${level.color}`} />
                          <span className="text-sm text-muted-foreground">
                            {colorOptions.find(c => c.value === level.color)?.name.split(" ")[0]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{level.order}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditScale(scale)}>
                <Pencil className="size-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDeleteScale(scale.id)}>
                <Trash2 className="size-4 mr-2" />
                Eliminar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
