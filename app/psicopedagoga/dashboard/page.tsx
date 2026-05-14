"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, User } from "lucide-react"
import { usePlatformData } from "@/lib/use-platform-data"
import { cn } from "@/lib/utils"

export default function PsicopedagogaDashboardPage() {
  const { data } = usePlatformData()
  const [search, setSearch] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")

  const filteredStudents = data.students.filter((student) => {
    const matchesCourse =
      selectedCourseId === "all" || student.courseId === selectedCourseId
    const matchesSearch =
      search.trim() === "" ||
      student.name.toLowerCase().includes(search.toLowerCase())
    return matchesCourse && matchesSearch
  })

  const groupedByCourse = data.courses
    .filter(
      (course) =>
        selectedCourseId === "all" || course.id === selectedCourseId,
    )
    .map((course) => ({
      course,
      students: filteredStudents.filter((s) => s.courseId === course.id),
    }))
    .filter((g) => g.students.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alumnos"
        breadcrumbs={[{ label: "Psicopedagoga" }, { label: "Alumnos" }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar alumno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todos los cursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {data.courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groupedByCourse.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">
              No se encontraron alumnos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedByCourse.map(({ course, students }) => (
            <Card key={course.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{course.name}</CardTitle>
                  <Badge variant="secondary">{students.length} alumnos</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {students.map((student) => (
                    <Link
                      key={student.id}
                      href={`/psicopedagoga/alumnos/${student.id}`}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 transition-colors",
                        "hover:bg-muted/50",
                      )}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          <User className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium">
                        {student.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ver detalle →
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
