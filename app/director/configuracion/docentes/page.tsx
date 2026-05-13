"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Trash2,
  Database,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePlatformData } from "@/lib/use-platform-data"

interface Assignment {
  id: string
  courseId: string
  subjectId: string
}

export default function DocentesPage() {
  const { data, error } = usePlatformData()
  const [selectedTeacherId, setSelectedTeacherId] = useState(data.teachers[0]?.id)
  const [assignments, setAssignments] = useState(data.courseAssignments)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCourseId, setNewCourseId] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const activePeriod = data.periods.find(period => period.status === "Activo") ?? data.periods[0]
  const selectedTeacher = data.teachers.find(t => t.id === selectedTeacherId)

  useEffect(() => {
    setAssignments(data.courseAssignments)
    if (!selectedTeacherId || !data.teachers.some(teacher => teacher.id === selectedTeacherId)) {
      setSelectedTeacherId(data.teachers[0]?.id)
    }
  }, [data.courseAssignments, data.teachers, selectedTeacherId])
  
  const teacherAssignments = assignments.filter(a => 
    a.teacherId === selectedTeacherId && a.periodId === activePeriod?.id
  )

  const handleAddAssignment = async () => {
    if (!newCourseId || selectedSubjectIds.length === 0 || !selectedTeacher || !activePeriod) return

    const response = await fetch("/api/course-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk-add",
        teacherId: selectedTeacher.id,
        courseId: newCourseId,
        subjectIds: selectedSubjectIds,
        periodId: activePeriod.id,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo agregar la asignacion")
      return
    }

    const newAssignments = selectedSubjectIds
      .filter(subjectId => !assignments.some(a =>
        a.teacherId === selectedTeacher.id &&
        a.courseId === newCourseId &&
        a.subjectId === subjectId &&
        a.periodId === activePeriod.id
      ))
      .map(subjectId => ({
        teacherId: selectedTeacher.id,
        courseId: newCourseId,
        subjectId,
        periodId: activePeriod.id,
      }))

    setAssignments([...assignments, ...newAssignments])
    toast.success(`${newAssignments.length === 1 ? "Asignacion agregada" : `${newAssignments.length} asignaciones agregadas`}`)
    setIsDialogOpen(false)
    setNewCourseId("")
    setSelectedSubjectIds([])
  }

  const handleRemoveAssignment = async (courseId: string, subjectId: string) => {
    if (!selectedTeacherId || !activePeriod) return

    const response = await fetch("/api/course-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        teacherId: selectedTeacherId,
        courseId,
        subjectId,
        periodId: activePeriod.id,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo eliminar la asignacion")
      return
    }

    setAssignments(assignments.filter(a => 
      !(a.teacherId === selectedTeacherId && 
        a.courseId === courseId && 
        a.subjectId === subjectId &&
        a.periodId === activePeriod?.id)
    ))
    toast.success("Asignacion eliminada")
  }

  const handleInviteTeacher = async () => {
    if (!selectedTeacher) return

    const response = await fetch("/api/auth/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: selectedTeacher.email,
        name: selectedTeacher.name,
        role: "TEACHER",
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo enviar la invitacion")
      return
    }

    const result = (await response.json().catch(() => null)) as { status?: string } | null
    toast.success(result?.status === "already_active" ? "El docente ya tiene acceso activo" : "Invitacion enviada")
  }

  const handleDisableTeacherAccess = async () => {
    if (!selectedTeacher) return

    const response = await fetch("/api/auth/disable-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedTeacher.email }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo desactivar el acceso")
      return
    }

    toast.success("Acceso desactivado")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Docentes y asignaciones" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Docentes y asignaciones" }
        ]}
      />

      <Alert className="border-accent/50 bg-accent/5">
        <Info className="size-4 text-accent" />
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
          Los datos de docentes, alumnos y asignaciones se administran desde la base de datos de la app.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-260px)] lg:min-h-[520px] lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        {/* Left: Teacher List */}
        <Card className="min-h-0 overflow-hidden">
          <CardHeader className="shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Docentes</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Database className="size-3 text-accent" />
                <span>Base local</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-[360px] max-h-[45vh] lg:h-full lg:max-h-none">
              <div className="space-y-1 px-2">
                {data.teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      selectedTeacherId === teacher.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-muted"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{teacher.name}</p>
                      <Badge 
                        variant={teacher.isActive ? "secondary" : "outline"}
                        className={cn(
                          "text-xs mt-0.5",
                          teacher.isActive && "bg-success/10 text-success"
                        )}
                      >
                        {teacher.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Teacher Detail */}
        <Card className="min-h-[420px] overflow-hidden lg:min-h-0">
          {selectedTeacher ? (
            <>
              <CardHeader className="shrink-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedTeacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold">{selectedTeacher.name}</h2>
                      <p className="break-all text-sm text-muted-foreground">{selectedTeacher.email}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Database className="size-3 text-accent" />
                        <span>Gestionado en la app</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={handleInviteTeacher}>
                      Invitar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDisableTeacherAccess}>
                      Desactivar acceso
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <Separator className="shrink-0" />

              <CardContent className="min-h-0 flex-1 overflow-auto py-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-medium">
                      Asignaciones del periodo actual
                      <span className="text-sm text-muted-foreground ml-2">
                        ({activePeriod?.name})
                      </span>
                    </h3>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="size-4 mr-2" />
                          Asignar curso y materias
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nueva asignacion</DialogTitle>
                          <DialogDescription>
                            Asigna un curso y sus materias a {selectedTeacher.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Curso</label>
                            <Select
                              value={newCourseId}
                              onValueChange={(val) => {
                                setNewCourseId(val)
                                setSelectedSubjectIds([])
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar curso" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.courses.map(course => (
                                  <SelectItem key={course.id} value={course.id}>
                                    {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {newCourseId && (() => {
                            const available = data.subjects.filter(subject =>
                              !assignments.some(a =>
                                a.teacherId === selectedTeacher.id &&
                                a.courseId === newCourseId &&
                                a.subjectId === subject.id &&
                                a.periodId === activePeriod?.id
                              )
                            )
                            const allSelected = available.length > 0 && available.every(s => selectedSubjectIds.includes(s.id))

                            return (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Materias</label>
                                {available.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Todas las materias ya estan asignadas para este curso.</p>
                                ) : (
                                  <ScrollArea className="h-48 rounded-md border p-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 pb-2 border-b">
                                        <Checkbox
                                          id="select-all"
                                          checked={allSelected}
                                          onCheckedChange={(checked) => {
                                            setSelectedSubjectIds(checked ? available.map(s => s.id) : [])
                                          }}
                                        />
                                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                          Seleccionar todas
                                        </label>
                                      </div>
                                      {available.map(subject => (
                                        <div key={subject.id} className="flex items-center gap-2">
                                          <Checkbox
                                            id={subject.id}
                                            checked={selectedSubjectIds.includes(subject.id)}
                                            onCheckedChange={(checked) => {
                                              setSelectedSubjectIds(prev =>
                                                checked
                                                  ? [...prev, subject.id]
                                                  : prev.filter(id => id !== subject.id)
                                              )
                                            }}
                                          />
                                          <label htmlFor={subject.id} className="text-sm cursor-pointer">
                                            {subject.name}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setIsDialogOpen(false); setNewCourseId(""); setSelectedSubjectIds([]) }}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddAssignment} disabled={!newCourseId || selectedSubjectIds.length === 0}>
                            {selectedSubjectIds.length > 0 ? `Guardar (${selectedSubjectIds.length})` : "Guardar"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {teacherAssignments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Curso</TableHead>
                          <TableHead>Materia</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teacherAssignments.map((assignment, index) => {
                          const course = data.courses.find(item => item.id === assignment.courseId)
                          const subject = data.subjects.find(item => item.id === assignment.subjectId)
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{course?.name}</TableCell>
                              <TableCell>{subject?.name}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleRemoveAssignment(assignment.courseId, assignment.subjectId)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No hay asignaciones para este periodo
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => { setNewCourseId(""); setSelectedSubjectIds([]); setIsDialogOpen(true) }}>
                        <Plus className="size-4 mr-2" />
                        Agregar asignacion
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Selecciona un docente para ver sus asignaciones</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
