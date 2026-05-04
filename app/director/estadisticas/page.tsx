"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, ResponsiveContainer, Legend } from "recharts"
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react"
import { usePlatformData } from "@/lib/use-platform-data"

const chartConfig = {
  logrado: {
    label: "Logrado",
    color: "var(--color-success)",
  },
  enProceso: {
    label: "En proceso",
    color: "var(--color-warning)",
  },
  enInicio: {
    label: "En inicio",
    color: "var(--color-destructive)",
  },
}

export default function EstadisticasPage() {
  const { data } = usePlatformData()
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedSubject, setSelectedSubject] = useState("all")

  const filteredEvaluations = data.evaluations.filter((evaluation) => {
    if (selectedPeriod !== "all" && evaluation.periodId !== selectedPeriod) return false
    if (selectedCourse !== "all" && evaluation.courseId !== selectedCourse) return false
    if (selectedSubject !== "all" && evaluation.subjectId !== selectedSubject) return false
    return true
  })
  const gradeDistribution = data.subjects
    .filter((subject) => selectedSubject === "all" || subject.id === selectedSubject)
    .map((subject) => {
      const grades = filteredEvaluations
        .filter((evaluation) => evaluation.subjectId === subject.id)
        .flatMap((evaluation) => Object.values(evaluation.grades))

      return {
        subject: subject.name,
        logrado: grades.filter((grade) => grade === "Logrado" || grade === "Destacado").length,
        enProceso: grades.filter((grade) => grade === "En proceso").length,
        enInicio: grades.filter((grade) => grade === "En inicio").length,
      }
    })
    .filter((row) => row.logrado + row.enProceso + row.enInicio > 0)
  const statusDistribution = (["Completo", "En progreso", "Sin iniciar"] as const).map((status) => ({
    name: status,
    value: filteredEvaluations.filter((evaluation) => evaluation.status === status).length,
    fill:
      status === "Completo"
        ? "var(--color-success)"
        : status === "En progreso"
          ? "var(--color-warning)"
          : "var(--color-muted)",
  }))
  const totalStatusCount = statusDistribution.reduce((sum, item) => sum + item.value, 0)

  // Summary stats
  const totalGrades = gradeDistribution.reduce((sum, row) => sum + row.logrado + row.enProceso + row.enInicio, 0)
  const logradoTotal = gradeDistribution.reduce((sum, row) => sum + row.logrado, 0)
  const logradoPercentage = totalGrades > 0 ? Math.round((logradoTotal / totalGrades) * 100) : 0
  const avgScore = totalGrades > 0 ? ((logradoTotal * 9 + gradeDistribution.reduce((sum, row) => sum + row.enProceso, 0) * 6 + gradeDistribution.reduce((sum, row) => sum + row.enInicio, 0) * 3) / totalGrades).toFixed(1) : "0.0"
  const lowestSubject = gradeDistribution.reduce((lowest, row) => row.enInicio > lowest.enInicio ? row : lowest, gradeDistribution[0] ?? { subject: "—", logrado: 0, enProceso: 0, enInicio: 0 }).subject
  const onTimeTeachers = data.teacherPerformance.filter(teacher => teacher.onTime).length
  const totalTeachers = data.teachers.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Estadisticas" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Estadisticas" }
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Periodo:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.periods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Curso:</span>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Materia:</span>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {data.subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio general
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              del periodo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alumnos con Logrado o superior
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{logradoPercentage}%</div>
            <Progress value={logradoPercentage} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materia con mayor % En inicio
            </CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowestSubject}</div>
            <p className="text-xs text-muted-foreground mt-1">
              mayor cantidad en inicio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docentes en termino
            </CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{onTimeTeachers}</span>
              <span className="text-lg text-muted-foreground">/{totalTeachers}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              completaron a tiempo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Bar Chart - Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribucion de calificaciones por materia</CardTitle>
            <CardDescription>
              Cantidad de alumnos por nivel de logro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={gradeDistribution} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="logrado" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="enProceso" stackId="a" fill="var(--color-warning)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="enInicio" stackId="a" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-success" />
                <span className="text-sm text-muted-foreground">Logrado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-warning" />
                <span className="text-sm text-muted-foreground">En proceso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-destructive" />
                <span className="text-sm text-muted-foreground">En inicio</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Evaluation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado general de evaluaciones</CardTitle>
            <CardDescription>
              Distribucion del estado de carga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => {
                    const percentage = totalStatusCount > 0 ? Math.round((Number(value) / totalStatusCount) * 100) : 0
                    return `${name}: ${percentage}%`
                  }}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold">{data.students.length}</p>
              <p className="text-sm text-muted-foreground">Total de alumnos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por docente</CardTitle>
          <CardDescription>
            Rendimiento y actividad de cada docente en el periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead className="text-center">Cursos asignados</TableHead>
                <TableHead className="text-center">Alumnos</TableHead>
                <TableHead>% completado</TableHead>
                <TableHead className="text-center">Entrego en termino</TableHead>
                <TableHead>Ultima actividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.teacherPerformance.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell className="text-center">{teacher.courses}</TableCell>
                  <TableCell className="text-center">{teacher.students}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={teacher.completionRate} className="h-2 w-20" />
                      <span className="text-sm text-muted-foreground">
                        {teacher.completionRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {teacher.onTime ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Si
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {teacher.lastActivity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
