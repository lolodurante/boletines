import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Users,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { getProgressPercentage } from "@/lib/evaluation-metrics"
import { getDirectorDashboardData } from "@/server/services/director-dashboard-service"

export default async function DirectorDashboard() {
  const {
    activePeriod,
    pendingReports,
    generatedReports,
    teachersWithPendingDelivery,
    teacherCount,
    completedCourses,
    courseCount,
    courseProgressData,
    recentReports,
  } = await getDirectorDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Dashboard" 
        breadcrumbs={[
          { label: "Director" },
          { label: "Dashboard" }
        ]}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Boletines listos
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{pendingReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              para generar PDF
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos completos
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{completedCourses}</span>
              <span className="text-lg text-muted-foreground">/{Math.max(courseCount, 1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              todos los docentes entregaron
            </p>
            <Progress value={(completedCourses / Math.max(courseCount, 1)) * 100} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docentes con entrega pendiente
            </CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{teachersWithPendingDelivery}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {teacherCount} docentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PDFs generados
            </CardTitle>
            <FileText className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{generatedReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              boletines con PDF
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Banner */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-accent" />
              <div>
                <p className="font-semibold">{activePeriod?.name ?? "Sin periodo activo"}</p>
                <p className="text-sm text-muted-foreground">Periodo actual</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-6">
              <div>
                <span className="text-muted-foreground">Inicio:</span>{" "}
                <span className="font-medium">{activePeriod?.startDate ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>{" "}
                <span className="font-medium">{activePeriod?.endDate ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Limite docentes:</span>{" "}
                <span className="font-medium">{activePeriod?.teacherDeadline ?? "—"}</span>
              </div>
            </div>
            {activePeriod ? <StatusBadge status={activePeriod.status} /> : null}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/director/configuracion/periodos">
              Ver configuracion del periodo
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: Course Progress Table */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Avance por curso
              </CardTitle>
              <CardDescription>
                Estado de entregas del periodo actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-center">Alumnos</TableHead>
                    <TableHead className="text-center">Docentes</TableHead>
                    <TableHead>Evaluaciones completas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseProgressData.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">{course.courseName}</TableCell>
                      <TableCell className="text-center">{course.studentCount}</TableCell>
                      <TableCell className="text-center">{course.teacherCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={getProgressPercentage(course.completedEvaluations, course.totalEvaluations)} 
                            className="h-2 w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {course.completedEvaluations}/{course.totalEvaluations}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={course.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                              Ver detalle
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[min(100vw,500px)] sm:max-w-[500px]">
                            <SheetHeader>
                              <SheetTitle>Detalle del curso {course.courseName}</SheetTitle>
                              <SheetDescription>
                                Estado de evaluaciones y docentes asignados
                              </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                              <div className="rounded-lg border p-4">
                                <h4 className="font-medium mb-2">Progreso general</h4>
                                <div className="flex items-center gap-3">
                                  <Progress 
                                    value={getProgressPercentage(course.completedEvaluations, course.totalEvaluations)} 
                                    className="h-3 flex-1"
                                  />
                                  <span className="text-sm font-medium">
                                    {getProgressPercentage(course.completedEvaluations, course.totalEvaluations)}%
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-lg border p-4">
                                <h4 className="font-medium mb-2">Docentes asignados</h4>
                                <ul className="space-y-2 text-sm">
                                  {activePeriod
                                    ? course.teachers.map((teacher) => (
                                    <li key={teacher.id} className="flex items-center justify-between">
                                      <span>{teacher.name}</span>
                                      <StatusBadge status={teacher.status} />
                                    </li>
                                      ))
                                    : null}
                                </ul>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent Ready Reports */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Boletines recientes listos
              </CardTitle>
              <CardDescription>
                Listos para revision y generacion de PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{report.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.courseName} • Completado {report.completedDate}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/director/boletines?student=${report.studentId}`}>
                      Revisar
                    </Link>
                  </Button>
                </div>
              ))}
              
              <Button variant="link" className="w-full mt-2" asChild>
                <Link href="/director/boletines">
                  Ver todos los boletines
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
