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
import { 
  Plus, 
  Trash2,
  Cloud,
  Info
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
  const { data } = usePlatformData()
  const [selectedTeacherId, setSelectedTeacherId] = useState(data.teachers[0]?.id)
  const [assignments, setAssignments] = useState(data.courseAssignments)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCourseId, setNewCourseId] = useState("")
  const [newSubjectId, setNewSubjectId] = useState("")

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
    if (!newCourseId || !newSubjectId || !selectedTeacher || !activePeriod) return

    // Check if assignment already exists
    const exists = assignments.some(a => 
      a.teacherId === selectedTeacher.id && 
      a.courseId === newCourseId && 
      a.subjectId === newSubjectId &&
      a.periodId === activePeriod.id
    )

    if (exists) {
      toast.error("Esta asignacion ya existe")
      return
    }

    const response = await fetch("/api/course-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        teacherId: selectedTeacher.id,
        courseId: newCourseId,
        subjectId: newSubjectId,
        periodId: activePeriod.id,
      }),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo agregar la asignacion")
      return
    }

    setAssignments([
      ...assignments,
      {
        teacherId: selectedTeacher.id,
        courseId: newCourseId,
        subjectId: newSubjectId,
        periodId: activePeriod.id
      }
    ])

    toast.success("Asignacion agregada")
    setIsDialogOpen(false)
    setNewCourseId("")
    setNewSubjectId("")
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

      {/* Zoho Sync Banner */}
      <Alert className="border-accent/50 bg-accent/5">
        <Info className="size-4 text-accent" />
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
          Los datos de docentes y alumnos se sincronizan automaticamente desde Zoho CRM. 
          Para agregar o eliminar docentes, usa Zoho CRM directamente.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:h-[calc(100vh-280px)]">
        {/* Left: Teacher List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Docentes</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Cloud className="size-3 text-accent" />
                <span>Sincronizado</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[320px] xl:h-[calc(100vh-400px)] xl:max-h-none">
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
        <Card className="flex flex-col xl:col-span-2">
          {selectedTeacher ? (
            <>
              <CardHeader>
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
                        <Cloud className="size-3 text-accent" />
                        <span>Sincronizado desde Zoho CRM</span>
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

              <Separator />

              <CardContent className="flex-1 overflow-auto py-4">
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
                          Asignar curso y materia
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nueva asignacion</DialogTitle>
                          <DialogDescription>
                            Asigna un curso y materia a {selectedTeacher.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Curso</label>
                            <Select value={newCourseId} onValueChange={setNewCourseId}>
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
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Materia</label>
                            <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar materia" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.subjects.map(subject => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddAssignment} disabled={!newCourseId || !newSubjectId}>
                            Guardar
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
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsDialogOpen(true)}>
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
