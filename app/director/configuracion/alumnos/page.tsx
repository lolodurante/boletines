"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Edit, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Course, Student } from "@/lib/data"

type StudentForm = {
  id?: string
  firstName: string
  lastName: string
  courseId: string
  familyEmail: string
}

const emptyStudentForm: StudentForm = {
  firstName: "",
  lastName: "",
  courseId: "",
  familyEmail: "",
}

interface StudentConfigData {
  courses: Course[]
  students: Student[]
}

const emptyData: StudentConfigData = {
  courses: [],
  students: [],
}

function splitStudentName(name: string) {
  const [lastName = "", firstName = ""] = name.split(",").map((part) => part.trim())
  return { firstName, lastName }
}

export default function StudentsAndCoursesPage() {
  const [data, setData] = useState<StudentConfigData>(emptyData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false)
  const [courseForm, setCourseForm] = useState({ grade: "", division: "" })
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudentForm)
  const [courseFilter, setCourseFilter] = useState("all")
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    const response = await fetch("/api/director/student-config", { cache: "no-store" })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(error?.error ?? "No se pudieron cargar los alumnos")
    }

    const nextData = (await response.json()) as StudentConfigData
    setData(nextData)
    setLoadError(null)
  }, [])

  useEffect(() => {
    loadData().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los alumnos")
    })
  }, [loadData])

  const students = useMemo(() => {
    return data.students.filter((student) => courseFilter === "all" || student.courseId === courseFilter)
  }, [courseFilter, data.students])

  const openStudentDialog = (student?: (typeof data.students)[number]) => {
    if (!student) {
      setStudentForm({ ...emptyStudentForm, courseId: data.courses[0]?.id ?? "" })
      setIsStudentDialogOpen(true)
      return
    }

    const name = splitStudentName(student.name)
    setStudentForm({
      id: student.id,
      firstName: name.firstName,
      lastName: name.lastName,
      courseId: student.courseId,
      familyEmail: student.parentEmail ?? "",
    })
    setIsStudentDialogOpen(true)
  }

  const saveCourse = async () => {
    if (!courseForm.grade.trim() || !courseForm.division.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...courseForm }),
      })
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(error?.error ?? "No se pudo guardar el curso")
        return
      }
      await loadData()
      toast.success("Curso guardado")
      setCourseForm({ grade: "", division: "" })
      setIsCourseDialogOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCourse = async (courseId: string) => {
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", courseId }),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo dar de baja el curso")
      return
    }
    await loadData()
    toast.success("Curso dado de baja")
  }

  const saveStudent = async () => {
    if (!studentForm.firstName.trim() || !studentForm.lastName.trim() || !studentForm.courseId) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ...studentForm }),
      })
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(error?.error ?? "No se pudo guardar el alumno")
        return
      }
      await loadData()
      toast.success("Alumno guardado")
      setStudentForm(emptyStudentForm)
      setIsStudentDialogOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStudent = async (studentId: string) => {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: studentId }),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(error?.error ?? "No se pudo dar de baja el alumno")
      return
    }
    await loadData()
    toast.success("Alumno dado de baja")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cursos y alumnos"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuracion" },
          { label: "Cursos y alumnos" },
        ]}
      />

      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <Tabs defaultValue="students" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="students">Alumnos</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 size-4" />
                  Curso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo curso</DialogTitle>
                  <DialogDescription>El curso queda disponible para alumnos y asignaciones.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grado</label>
                    <Input value={courseForm.grade} onChange={(event) => setCourseForm({ ...courseForm, grade: event.target.value })} placeholder="1" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">División</label>
                    <Input value={courseForm.division} onChange={(event) => setCourseForm({ ...courseForm, division: event.target.value })} placeholder="A" maxLength={1} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={saveCourse} disabled={isSaving || !courseForm.grade || !courseForm.division}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" onClick={() => openStudentDialog()}>
              <Plus className="mr-2 size-4" />
              Alumno
            </Button>
          </div>
        </div>

        <TabsContent value="students">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Alumnos activos</CardTitle>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {data.courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Email familia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const course = data.courses.find((item) => item.id === student.courseId)
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{course?.name ?? "—"}</TableCell>
                        <TableCell>{student.parentEmail ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openStudentDialog(student)}>
                            <Edit className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar a {student.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminarán todos sus datos del sistema. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteStudent(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Cursos activos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-center">Alumnos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell className="text-center">{course.studentCount}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar curso {course.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {(course.studentCount ?? 0) > 0
                                  ? `Este curso tiene ${course.studentCount} alumno(s). Al eliminarlo se desasociarán del curso.`
                                  : "El curso quedará eliminado del sistema."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCourse(course.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{studentForm.id ? "Editar alumno" : "Nuevo alumno"}</DialogTitle>
            <DialogDescription>El alumno queda activo en el curso seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={studentForm.firstName} onChange={(event) => setStudentForm({ ...studentForm, firstName: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Apellido</label>
              <Input value={studentForm.lastName} onChange={(event) => setStudentForm({ ...studentForm, lastName: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <Select value={studentForm.courseId} onValueChange={(courseId) => setStudentForm({ ...studentForm, courseId })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {data.courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email familia</label>
              <Input value={studentForm.familyEmail} onChange={(event) => setStudentForm({ ...studentForm, familyEmail: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveStudent} disabled={isSaving || !studentForm.firstName || !studentForm.lastName || !studentForm.courseId}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
