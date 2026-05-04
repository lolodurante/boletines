"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Trash2,
  GripVertical,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePlatformData } from "@/lib/use-platform-data"

interface Criterion {
  id: string
  name: string
  description?: string
}

// Criterios por grado para cada materia
interface GradeCriteria {
  grade: string
  criteria: Criterion[]
}

interface Subject {
  id: string
  name: string
  appliesTo: string[]
  criteriaByGrade: GradeCriteria[]
}

const gradeOptions = ["1°", "2°", "3°", "4°", "5°", "6°"]

function CriterionCard({ 
  criterion, 
  onUpdateName, 
  onUpdateDescription, 
  onRemove 
}: { 
  criterion: Criterion
  onUpdateName: (value: string) => void
  onUpdateDescription: (value: string) => void
  onRemove: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-muted/30">
          <GripVertical className="size-4 text-muted-foreground cursor-grab shrink-0 hidden sm:block" />
          <Input
            value={criterion.name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
            placeholder="Nombre del criterio"
          />
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              {isOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span className="sr-only">Toggle descripcion</span>
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="p-3 border-t bg-muted/10">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Descripcion (que se espera del alumno)
            </label>
            <Textarea
              value={criterion.description || ""}
              onChange={(e) => onUpdateDescription(e.target.value)}
              placeholder="Describe lo que se evalua en este criterio..."
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default function MateriasPage() {
  const { data } = usePlatformData()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id)
  const [selectedGrade, setSelectedGrade] = useState<string>("1°")
  const [newCriterionName, setNewCriterionName] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [showDetail, setShowDetail] = useState(false) // For mobile: toggle between list and detail

  useEffect(() => {
    if (hasChanges) return

    const nextSubjects = data.subjects
    setSubjects(nextSubjects)
    if (!selectedSubjectId || !nextSubjects.some(subject => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(nextSubjects[0]?.id)
    }
  }, [data.subjects, hasChanges, selectedSubjectId])

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  
  // Get criteria for the selected grade
  const selectedGradeCriteria = selectedSubject?.criteriaByGrade.find(
    gc => gc.grade === selectedGrade
  )?.criteria || []

  // Count total criteria across all grades for a subject
  const getTotalCriteriaCount = (subject: Subject) => {
    return subject.criteriaByGrade.reduce((sum, gc) => sum + gc.criteria.length, 0)
  }

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return
    
    const newSubject: Subject = {
      id: `s${Date.now()}`,
      name: newSubjectName,
      appliesTo: gradeOptions,
      criteriaByGrade: gradeOptions.map(grade => ({ grade, criteria: [] }))
    }
    
    setSubjects([...subjects, newSubject])
    setSelectedSubjectId(newSubject.id)
    setNewSubjectName("")
    setHasChanges(true)
    toast.success("Materia creada")
  }

  const handleUpdateSubjectName = (name: string) => {
    if (!selectedSubject) return
    setSubjects(subjects.map(s => 
      s.id === selectedSubject.id ? { ...s, name } : s
    ))
    setHasChanges(true)
  }

  const toggleGrade = (grade: string) => {
    if (!selectedSubject) return
    const newAppliesTo = selectedSubject.appliesTo.includes(grade)
      ? selectedSubject.appliesTo.filter(g => g !== grade)
      : [...selectedSubject.appliesTo, grade].sort((a, b) => 
          gradeOptions.indexOf(a) - gradeOptions.indexOf(b)
        )
    
    // Also add/remove criteriaByGrade entry
    let newCriteriaByGrade = selectedSubject.criteriaByGrade
    if (!selectedSubject.appliesTo.includes(grade)) {
      // Adding grade - add empty criteria entry if not exists
      if (!selectedSubject.criteriaByGrade.find(gc => gc.grade === grade)) {
        newCriteriaByGrade = [...selectedSubject.criteriaByGrade, { grade, criteria: [] }]
          .sort((a, b) => gradeOptions.indexOf(a.grade) - gradeOptions.indexOf(b.grade))
      }
    }
    
    setSubjects(subjects.map(s =>
      s.id === selectedSubject.id 
        ? { ...s, appliesTo: newAppliesTo, criteriaByGrade: newCriteriaByGrade } 
        : s
    ))
    setHasChanges(true)
  }

  const handleAddCriterion = () => {
    if (!newCriterionName.trim() || !selectedSubject) return
    
    const newCriterion: Criterion = {
      id: `c${Date.now()}`,
      name: newCriterionName,
      description: ""
    }
    
    setSubjects(subjects.map(s =>
      s.id === selectedSubject.id 
        ? { 
            ...s, 
            criteriaByGrade: s.criteriaByGrade.map(gc =>
              gc.grade === selectedGrade
                ? { ...gc, criteria: [...gc.criteria, newCriterion] }
                : gc
            )
          }
        : s
    ))
    setNewCriterionName("")
    setHasChanges(true)
  }

  const handleRemoveCriterion = (criterionId: string) => {
    if (!selectedSubject) return
    setSubjects(subjects.map(s =>
      s.id === selectedSubject.id
        ? { 
            ...s, 
            criteriaByGrade: s.criteriaByGrade.map(gc =>
              gc.grade === selectedGrade
                ? { ...gc, criteria: gc.criteria.filter(c => c.id !== criterionId) }
                : gc
            )
          }
        : s
    ))
    setHasChanges(true)
  }

  const handleUpdateCriterion = (criterionId: string, field: "name" | "description", value: string) => {
    if (!selectedSubject) return
    setSubjects(subjects.map(s =>
      s.id === selectedSubject.id
        ? { 
            ...s, 
            criteriaByGrade: s.criteriaByGrade.map(gc =>
              gc.grade === selectedGrade
                ? { 
                    ...gc, 
                    criteria: gc.criteria.map(c => 
                      c.id === criterionId ? { ...c, [field]: value } : c
                    ) 
                  }
                : gc
            )
          }
        : s
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudieron guardar las materias")
      return
    }

    toast.success("Cambios guardados correctamente")
    setHasChanges(false)
  }

  // Handle selecting a subject (on mobile, also show detail)
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setShowDetail(true)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader 
        title="Materias y criterios" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Materias y criterios" }
        ]}
      />

      <div className="flex flex-col gap-4 md:gap-6 lg:grid lg:min-h-[calc(100vh-200px)] lg:grid-cols-3">
        {/* Left: Subject List - Hidden on mobile when showing detail */}
        <Card className={cn(
          "lg:col-span-1 flex flex-col",
          showDetail ? "hidden lg:flex" : "flex"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Materias</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 max-h-[50vh] lg:max-h-[calc(100vh-380px)]">
              <div className="space-y-1 px-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedSubjectId === subject.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium text-sm">{subject.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getTotalCriteriaCount(subject)}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground lg:hidden" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva materia"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                />
                <Button size="icon" onClick={handleAddSubject}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Subject Detail - Hidden on mobile when showing list */}
        <Card className={cn(
          "lg:col-span-2 flex flex-col",
          showDetail ? "flex" : "hidden lg:flex"
        )}>
          {selectedSubject ? (
            <>
              <CardHeader className="space-y-4">
                {/* Mobile back button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2 w-fit"
                  onClick={() => setShowDetail(false)}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Materias
                </Button>
                
                <div className="space-y-4">
                  <Input
                    value={selectedSubject.name}
                    onChange={(e) => handleUpdateSubjectName(e.target.value)}
                    className="text-xl font-semibold h-auto border-none p-0 focus-visible:ring-0"
                  />
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Aplica a grados:</label>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {gradeOptions.map(grade => (
                        <Badge
                          key={grade}
                          variant={selectedSubject.appliesTo.includes(grade) ? "default" : "outline"}
                          className="cursor-pointer text-xs md:text-sm px-2 md:px-2.5"
                          onClick={() => toggleGrade(grade)}
                        >
                          {grade}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
<CardContent className="flex-1 overflow-auto p-0">
                  <Tabs value={selectedGrade} onValueChange={setSelectedGrade} className="h-full flex flex-col">
                    <div className="px-4 md:px-6 pt-4 border-b">
                      <p className="text-sm text-muted-foreground mb-2">Criterios por grado</p>
                      <ScrollArea className="w-full">
                        <TabsList className="w-max md:w-full justify-start h-auto flex-nowrap md:flex-wrap gap-1 bg-transparent p-0 mb-2">
                          {selectedSubject.appliesTo
                            .sort((a, b) => gradeOptions.indexOf(a) - gradeOptions.indexOf(b))
                            .map(grade => {
                              const gradeCriteria = selectedSubject.criteriaByGrade.find(gc => gc.grade === grade)
                              const count = gradeCriteria?.criteria.length || 0
                              return (
                                <TabsTrigger 
                                  key={grade} 
                                  value={grade}
                                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-2.5 md:px-3 py-1.5 text-sm shrink-0"
                                >
                                  {grade}
                                  <Badge variant="secondary" className="ml-1 md:ml-1.5 text-xs px-1 md:px-1.5">
                                    {count}
                                  </Badge>
                                </TabsTrigger>
                              )
                            })}
                        </TabsList>
                      </ScrollArea>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-4 md:p-6">
                      <div className="space-y-3">
                        {selectedGradeCriteria.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No hay criterios definidos para {selectedGrade}</p>
                            <p className="text-sm mt-1">Agrega criterios especificos para este grado</p>
                          </div>
                        ) : (
                          selectedGradeCriteria.map((criterion) => (
                            <CriterionCard
                              key={criterion.id}
                              criterion={criterion}
                              onUpdateName={(value) => handleUpdateCriterion(criterion.id, "name", value)}
                              onUpdateDescription={(value) => handleUpdateCriterion(criterion.id, "description", value)}
                              onRemove={() => handleRemoveCriterion(criterion.id)}
                            />
                          ))
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Input
                          placeholder={`Agregar criterio para ${selectedGrade}...`}
                          value={newCriterionName}
                          onChange={(e) => setNewCriterionName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCriterion()}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={handleAddCriterion} className="w-full sm:w-auto">
                          <Plus className="size-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </Tabs>
                </CardContent>

              <div className="border-t p-3 md:p-4 flex justify-end">
                <Button onClick={handleSave} disabled={!hasChanges} className="w-full sm:w-auto">
                  <Save className="size-4 mr-2" />
                  Guardar cambios
                </Button>
              </div>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-muted-foreground text-center px-4">Selecciona una materia para editarla</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
