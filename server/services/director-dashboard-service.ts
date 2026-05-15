import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import type { EvaluationStatus, PeriodStatus } from "@/lib/data"
import { getProgressPercentage, getStatusFromProgress } from "@/lib/evaluation-metrics"
import { prisma } from "@/lib/db/client"

interface DashboardTeacherProgress {
  id: string
  name: string
  status: EvaluationStatus
}

interface DashboardCourseProgress {
  courseId: string
  courseName: string
  studentCount: number
  teacherCount: number
  completedEvaluations: number
  totalEvaluations: number
  status: EvaluationStatus
  teachers: DashboardTeacherProgress[]
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR")
}

function mapPeriodStatus(status: string): PeriodStatus {
  if (status === "ACTIVE") return "Activo"
  if (status === "CLOSED") return "Cerrado"
  return "Próximo"
}

export async function getDirectorDashboardData() {
  const [
    periods,
    courses,
    students,
    teachers,
    reportStatusCounts,
  ] = await Promise.all([
    prisma.academicPeriod.findMany({ orderBy: { startDate: "asc" } }),
    prisma.course.findMany({
      where: { active: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE", isAdapted: false },
      select: { id: true, grade: true, division: true },
    }),
    prisma.teacher.findMany({
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.reportCard.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ])

  const activePeriodRecord = periods.find((period) => period.status === "ACTIVE") ?? periods[0]
  const activePeriod = activePeriodRecord
    ? {
        id: activePeriodRecord.id,
        name: activePeriodRecord.name,
        startDate: formatDate(activePeriodRecord.startDate),
        endDate: formatDate(activePeriodRecord.dueDate),
        teacherDeadline: formatDate(activePeriodRecord.teacherDeadline ?? activePeriodRecord.dueDate),
        status: mapPeriodStatus(activePeriodRecord.status),
      }
    : null

  const studentsByCourse = new Map<string, Set<string>>()
  for (const student of students) {
    const courseId = courseIdFromParts(student.grade, student.division)
    const courseStudents = studentsByCourse.get(courseId) ?? new Set<string>()
    courseStudents.add(student.id)
    studentsByCourse.set(courseId, courseStudents)
  }

  const assignments = activePeriod
    ? await prisma.courseAssignment.findMany({
        where: { periodId: activePeriod.id },
        select: { teacherId: true, subjectId: true, grade: true, division: true },
      })
    : []
  const submittedEvaluations = activePeriod
    ? await prisma.evaluation.findMany({
        where: {
          periodId: activePeriod.id,
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
        select: {
          studentId: true,
          teacherId: true,
          subjectId: true,
          student: { select: { grade: true, division: true } },
        },
      })
    : []
  const recentReports = await prisma.reportCard.findMany({
    where: { status: "READY_FOR_REVIEW" },
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      studentId: true,
      updatedAt: true,
      student: { select: { firstName: true, lastName: true, grade: true, division: true } },
    },
  })

  const teacherNameById = new Map(teachers.map((teacher) => [teacher.id, teacher.user.name]))
  const assignmentsByCourse = new Map<string, typeof assignments>()
  const assignmentKeys = new Set<string>()
  for (const assignment of assignments) {
    const courseId = courseIdFromParts(assignment.grade, assignment.division)
    const courseAssignments = assignmentsByCourse.get(courseId) ?? []
    courseAssignments.push(assignment)
    assignmentsByCourse.set(courseId, courseAssignments)
    assignmentKeys.add(`${courseId}:${assignment.teacherId}:${assignment.subjectId}`)
  }

  const completedByCourse = new Map<string, number>()
  const completedByTeacherCourse = new Map<string, number>()
  for (const evaluation of submittedEvaluations) {
    const courseId = courseIdFromParts(evaluation.student.grade, evaluation.student.division)
    if (!assignmentKeys.has(`${courseId}:${evaluation.teacherId}:${evaluation.subjectId}`)) continue

    completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1)
    const teacherCourseKey = `${courseId}:${evaluation.teacherId}`
    completedByTeacherCourse.set(teacherCourseKey, (completedByTeacherCourse.get(teacherCourseKey) ?? 0) + 1)
  }

  const courseProgressData: DashboardCourseProgress[] = courses.map((course) => {
    const courseId = courseIdFromParts(course.grade, course.division)
    const courseStudents = studentsByCourse.get(courseId) ?? new Set<string>()
    const courseAssignments = assignmentsByCourse.get(courseId) ?? []
    const teacherIds = Array.from(new Set(courseAssignments.map((assignment) => assignment.teacherId)))
    const completedEvaluations = completedByCourse.get(courseId) ?? 0
    const totalEvaluations = courseStudents.size * courseAssignments.length

    return {
      courseId,
      courseName: courseNameFromParts(course.grade, course.division),
      studentCount: courseStudents.size,
      teacherCount: teacherIds.length,
      completedEvaluations,
      totalEvaluations,
      status: getStatusFromProgress(completedEvaluations, totalEvaluations),
      teachers: teacherIds.map((teacherId) => {
        const teacherAssignmentCount = courseAssignments.filter((assignment) => assignment.teacherId === teacherId).length
        const teacherTotal = courseStudents.size * teacherAssignmentCount
        const teacherCompleted = completedByTeacherCourse.get(`${courseId}:${teacherId}`) ?? 0

        return {
          id: teacherId,
          name: teacherNameById.get(teacherId) ?? "—",
          status: getStatusFromProgress(teacherCompleted, teacherTotal),
        }
      }),
    }
  })

  const teacherProgress = new Map<string, { completed: number; total: number }>()
  for (const assignment of assignments) {
    const courseId = courseIdFromParts(assignment.grade, assignment.division)
    const row = teacherProgress.get(assignment.teacherId) ?? { completed: 0, total: 0 }
    row.total += studentsByCourse.get(courseId)?.size ?? 0
    teacherProgress.set(assignment.teacherId, row)
  }
  for (const [key, completed] of completedByTeacherCourse) {
    const [, teacherId] = key.split(":")
    if (!teacherId) continue
    const row = teacherProgress.get(teacherId)
    if (row) row.completed += completed
  }

  const pendingReports = reportStatusCounts.find((row) => row.status === "READY_FOR_REVIEW")?._count._all ?? 0
  const generatedReports = reportStatusCounts
    .filter((row) => row.status === "APPROVED" || row.status === "SENT")
    .reduce((sum, row) => sum + row._count._all, 0)
  const teachersWithPendingDelivery = Array.from(teacherProgress.values()).filter(
    (progress) => getProgressPercentage(progress.completed, progress.total) < 100,
  ).length
  const completedCourses = courseProgressData.filter((course) => course.status === "Completo").length

  return {
    activePeriod,
    pendingReports,
    generatedReports,
    teachersWithPendingDelivery,
    teacherCount: teachers.length,
    completedCourses,
    courseCount: courses.length,
    courseProgressData,
    recentReports: recentReports.map((report) => ({
      id: report.id,
      studentId: report.studentId,
      studentName: `${report.student.lastName}, ${report.student.firstName}`,
      courseName: courseNameFromParts(report.student.grade, report.student.division),
      completedDate: formatDate(report.updatedAt),
    })),
  }
}
