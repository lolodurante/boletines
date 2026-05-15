import { courseIdFromParts, courseNameFromParts, coursePartsFromId } from "@/lib/academic-course"
import type { EvaluationStatus, PeriodStatus } from "@/lib/data"
import { getStatusFromProgress } from "@/lib/evaluation-metrics"
import { prisma } from "@/lib/db/client"

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR")
}

function mapPeriodStatus(status: string): PeriodStatus {
  if (status === "ACTIVE") return "Activo"
  if (status === "CLOSED") return "Cerrado"
  return "Próximo"
}

interface TeacherProgressFilters {
  periodId?: string
  courseId?: string
}

export async function getDirectorTeacherProgressData(filters: TeacherProgressFilters = {}) {
  const [periods, courses, students] = await Promise.all([
    prisma.academicPeriod.findMany({
      select: { id: true, name: true, startDate: true, dueDate: true, teacherDeadline: true, status: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE", isAdapted: false },
      select: { id: true, grade: true, division: true },
    }),
  ])
  const activePeriod = periods.find((period) => period.status === "ACTIVE") ?? periods[0]
  const selectedPeriodId = filters.periodId === "all"
    ? undefined
    : filters.periodId ?? activePeriod?.id
  const selectedCourse = filters.courseId && filters.courseId !== "all"
    ? coursePartsFromId(filters.courseId)
    : null

  const assignments = await prisma.courseAssignment.findMany({
    where: {
      ...(selectedPeriodId ? { periodId: selectedPeriodId } : {}),
      ...(selectedCourse ? { grade: selectedCourse.grade, division: selectedCourse.division } : {}),
    },
    select: {
      teacherId: true,
      subjectId: true,
      periodId: true,
      grade: true,
      division: true,
      teacher: { select: { user: { select: { name: true } } } },
      subject: { select: { name: true } },
    },
    orderBy: [{ teacher: { user: { name: "asc" } } }, { grade: "asc" }, { division: "asc" }],
  })
  const periodIds = Array.from(new Set(assignments.map((assignment) => assignment.periodId)))
  const submittedEvaluations = periodIds.length > 0
    ? await prisma.evaluation.findMany({
        where: {
          periodId: { in: periodIds },
          status: { in: ["SUBMITTED", "APPROVED"] },
          ...(assignments.length > 0
            ? {
                OR: assignments.map((assignment) => ({
                  teacherId: assignment.teacherId,
                  subjectId: assignment.subjectId,
                })),
              }
            : {}),
        },
        select: {
          studentId: true,
          teacherId: true,
          subjectId: true,
          periodId: true,
          student: { select: { grade: true, division: true } },
        },
      })
    : []

  const studentsByCourse = new Map<string, Set<string>>()
  for (const student of students) {
    const courseId = courseIdFromParts(student.grade, student.division)
    const courseStudents = studentsByCourse.get(courseId) ?? new Set<string>()
    courseStudents.add(student.id)
    studentsByCourse.set(courseId, courseStudents)
  }

  const completedByAssignment = new Map<string, number>()
  for (const evaluation of submittedEvaluations) {
    const courseId = courseIdFromParts(evaluation.student.grade, evaluation.student.division)
    const key = `${evaluation.periodId}:${courseId}:${evaluation.teacherId}:${evaluation.subjectId}`
    completedByAssignment.set(key, (completedByAssignment.get(key) ?? 0) + 1)
  }

  const teacherMap = new Map<string, {
    teacherId: string
    teacherName: string
    assignments: Array<{
      courseId: string
      courseName: string
      subjectId: string
      subjectName: string
      studentCount: number
      completedCount: number
      status: EvaluationStatus
    }>
    totalSlots: number
    completedSlots: number
  }>()

  for (const assignment of assignments) {
    const courseId = courseIdFromParts(assignment.grade, assignment.division)
    const studentCount = studentsByCourse.get(courseId)?.size ?? 0
    const completedCount = completedByAssignment.get(`${assignment.periodId}:${courseId}:${assignment.teacherId}:${assignment.subjectId}`) ?? 0
    const row = teacherMap.get(assignment.teacherId) ?? {
      teacherId: assignment.teacherId,
      teacherName: assignment.teacher.user.name,
      assignments: [],
      totalSlots: 0,
      completedSlots: 0,
    }

    row.assignments.push({
      courseId,
      courseName: courseNameFromParts(assignment.grade, assignment.division),
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      studentCount,
      completedCount,
      status: getStatusFromProgress(completedCount, studentCount),
    })
    row.totalSlots += studentCount
    row.completedSlots += completedCount
    teacherMap.set(assignment.teacherId, row)
  }

  return {
    selectedPeriodId: selectedPeriodId ?? "all",
    periods: periods.map((period) => ({
      id: period.id,
      name: period.name,
      startDate: formatDate(period.startDate),
      endDate: formatDate(period.dueDate),
      teacherDeadline: formatDate(period.teacherDeadline ?? period.dueDate),
      status: mapPeriodStatus(period.status),
    })),
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    teacherRows: Array.from(teacherMap.values()).map((row) => ({
      ...row,
      overallStatus: getStatusFromProgress(row.completedSlots, row.totalSlots),
    })),
  }
}
