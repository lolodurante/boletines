import { courseIdFromParts, courseNameFromParts, coursePartsFromId } from "@/lib/academic-course"
import type { EvaluationStatus } from "@/lib/data"
import { getProgressPercentage } from "@/lib/evaluation-metrics"
import { prisma } from "@/lib/db/client"

interface StatisticsFilters {
  periodId?: string
  courseId?: string
  subjectId?: string
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR")
}

function mapEvaluationStatus(status: string): EvaluationStatus {
  if (status === "APPROVED" || status === "SUBMITTED") return "Completo"
  if (status === "DRAFT" || status === "NEEDS_REVISION") return "En progreso"
  return "Sin iniciar"
}

function gradeBucket(label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()

  if (["DESTACADO", "LOGRADO", "EXCELENTE", "MUY BUENO", "BUENO", "AVANZADO", "ALCANZADO"].includes(normalized)) {
    return "logrado"
  }
  if (["EN PROCESO", "PROCESO"].includes(normalized)) return "enProceso"
  if (["EN INICIO", "NO ALCANZO LOS OBJETIVOS", "NO ALCANZÓ LOS OBJETIVOS"].includes(normalized)) return "enInicio"
  return null
}

export async function getDirectorStatisticsData(filters: StatisticsFilters = {}) {
  const [periods, courses, subjects, teachers, students] = await Promise.all([
    prisma.academicPeriod.findMany({
      select: { id: true, name: true, startDate: true, dueDate: true, teacherDeadline: true, status: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { order: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE", isAdapted: false },
      select: { id: true, grade: true, division: true },
    }),
  ])
  const selectedCourse = filters.courseId && filters.courseId !== "all"
    ? coursePartsFromId(filters.courseId)
    : null
  const activePeriod = periods.find((period) => period.status === "ACTIVE") ?? periods[0]
  const selectedPeriod = filters.periodId && filters.periodId !== "all"
    ? periods.find((period) => period.id === filters.periodId)
    : activePeriod

  const evaluationWhere = {
    ...(filters.periodId && filters.periodId !== "all" ? { periodId: filters.periodId } : {}),
    ...(filters.subjectId && filters.subjectId !== "all" ? { subjectId: filters.subjectId } : {}),
    ...(selectedCourse ? { student: { grade: selectedCourse.grade, division: selectedCourse.division } } : {}),
  }
  const evaluations = await prisma.evaluation.findMany({
    where: evaluationWhere,
    include: {
      student: { select: { grade: true, division: true } },
      subject: { select: { id: true, name: true } },
      grades: {
        include: { scaleLevel: { select: { label: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
  const visibleSubjects = subjects.filter((subject) => !filters.subjectId || filters.subjectId === "all" || subject.id === filters.subjectId)
  const gradeDistribution = visibleSubjects
    .map((subject) => {
      const row = { subject: subject.name, logrado: 0, enProceso: 0, enInicio: 0 }

      for (const evaluation of evaluations) {
        if (evaluation.subjectId !== subject.id) continue
        for (const grade of evaluation.grades) {
          const bucket = gradeBucket(grade.scaleLevel.label)
          if (bucket) row[bucket] += 1
        }
      }

      return row
    })
    .filter((row) => row.logrado + row.enProceso + row.enInicio > 0)
  const statusDistribution = (["Completo", "En progreso", "Sin iniciar"] as const).map((status) => ({
    name: status,
    value: evaluations.filter((evaluation) => mapEvaluationStatus(evaluation.status) === status).length,
    fill:
      status === "Completo"
        ? "var(--color-success)"
        : status === "En progreso"
          ? "var(--color-warning)"
          : "var(--color-muted)",
  }))
  const totalGrades = gradeDistribution.reduce((sum, row) => sum + row.logrado + row.enProceso + row.enInicio, 0)
  const logradoTotal = gradeDistribution.reduce((sum, row) => sum + row.logrado, 0)
  const enProcesoTotal = gradeDistribution.reduce((sum, row) => sum + row.enProceso, 0)
  const enInicioTotal = gradeDistribution.reduce((sum, row) => sum + row.enInicio, 0)
  const avgScore = totalGrades > 0 ? ((logradoTotal * 9 + enProcesoTotal * 6 + enInicioTotal * 3) / totalGrades).toFixed(1) : "0.0"
  const lowestSubject = gradeDistribution.reduce(
    (lowest, row) => row.enInicio > lowest.enInicio ? row : lowest,
    gradeDistribution[0] ?? { subject: "—", logrado: 0, enProceso: 0, enInicio: 0 },
  ).subject
  const visibleStudentCount = selectedCourse
    ? students.filter((student) => student.grade === selectedCourse.grade && student.division === selectedCourse.division).length
    : students.length

  const assignmentWhere = {
    ...(selectedPeriod ? { periodId: selectedPeriod.id } : {}),
    ...(selectedCourse ? { grade: selectedCourse.grade, division: selectedCourse.division } : {}),
    ...(filters.subjectId && filters.subjectId !== "all" ? { subjectId: filters.subjectId } : {}),
  }
  const assignments = await prisma.courseAssignment.findMany({
    where: assignmentWhere,
    select: { teacherId: true, subjectId: true, grade: true, division: true, periodId: true },
  })
  const teacherNameById = new Map(teachers.map((teacher) => [teacher.id, teacher.user.name]))
  const studentsByCourse = new Map<string, number>()
  for (const student of students) {
    const courseId = courseIdFromParts(student.grade, student.division)
    studentsByCourse.set(courseId, (studentsByCourse.get(courseId) ?? 0) + 1)
  }
  const completedKeys = new Set(
    evaluations
      .filter((evaluation) => evaluation.status === "SUBMITTED" || evaluation.status === "APPROVED")
      .map((evaluation) => `${evaluation.periodId}:${courseIdFromParts(evaluation.student.grade, evaluation.student.division)}:${evaluation.teacherId}:${evaluation.subjectId}:${evaluation.studentId}`),
  )
  const teacherProgress = new Map<string, {
    id: string
    name: string
    courseIds: Set<string>
    studentIds: Set<string>
    completed: number
    total: number
    lastActivity: string
    onTime: boolean
  }>()
  for (const assignment of assignments) {
    const courseId = courseIdFromParts(assignment.grade, assignment.division)
    const row = teacherProgress.get(assignment.teacherId) ?? {
      id: assignment.teacherId,
      name: teacherNameById.get(assignment.teacherId) ?? "—",
      courseIds: new Set<string>(),
      studentIds: new Set<string>(),
      completed: 0,
      total: 0,
      lastActivity: "—",
      onTime: false,
    }
    row.courseIds.add(courseId)
    const courseStudents = students.filter((student) => student.grade === assignment.grade && student.division === assignment.division)
    row.total += studentsByCourse.get(courseId) ?? 0
    courseStudents.forEach((student) => {
      row.studentIds.add(student.id)
      if (completedKeys.has(`${assignment.periodId}:${courseId}:${assignment.teacherId}:${assignment.subjectId}:${student.id}`)) {
        row.completed += 1
      }
    })
    teacherProgress.set(assignment.teacherId, row)
  }
  const deadline = selectedPeriod?.teacherDeadline ?? selectedPeriod?.dueDate
  for (const evaluation of evaluations) {
    const row = teacherProgress.get(evaluation.teacherId)
    if (!row) continue
    if (row.lastActivity !== "—") continue
    // evaluations are ordered desc — first hit is the most recent activity
    row.lastActivity = formatDate(evaluation.updatedAt)
    row.onTime = row.completed >= row.total && Boolean(deadline && evaluation.updatedAt <= deadline)
  }
  const teacherPerformance = Array.from(teacherProgress.values()).map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    courses: teacher.courseIds.size,
    students: teacher.studentIds.size,
    completionRate: getProgressPercentage(teacher.completed, teacher.total),
    onTime: teacher.onTime,
    lastActivity: teacher.lastActivity,
  }))

  return {
    periods: periods.map((period) => ({ id: period.id, name: period.name })),
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    subjects,
    gradeDistribution,
    statusDistribution,
    totalStatusCount: statusDistribution.reduce((sum, item) => sum + item.value, 0),
    summary: {
      avgScore,
      logradoPercentage: totalGrades > 0 ? Math.round((logradoTotal / totalGrades) * 100) : 0,
      lowestSubject,
      onTimeTeachers: teacherPerformance.filter((teacher) => teacher.onTime).length,
      totalTeachers: teachers.length,
      totalStudents: visibleStudentCount,
    },
    teacherPerformance,
  }
}
