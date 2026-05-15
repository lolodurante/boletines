import type { CourseAssignment, Evaluation, EvaluationStatus, Teacher } from "@/lib/data"
import type { PlatformData } from "@/lib/presentation-data"

export function isCompletedEvaluation(evaluation: Pick<Evaluation, "status">) {
  return evaluation.status === "Completo"
}

export function getProgressPercentage(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

export function getStatusFromProgress(completed: number, total: number): EvaluationStatus {
  if (total > 0 && completed >= total) return "Completo"
  if (completed > 0) return "En progreso"
  return "Sin iniciar"
}

export function getAssignmentEvaluations(data: PlatformData, assignment: CourseAssignment) {
  return data.evaluations.filter(
    (evaluation) =>
      evaluation.teacherId === assignment.teacherId &&
      evaluation.courseId === assignment.courseId &&
      evaluation.subjectId === assignment.subjectId &&
      evaluation.periodId === assignment.periodId,
  )
}

export function getAssignmentStudents(data: PlatformData, assignment: Pick<CourseAssignment, "courseId">) {
  return data.students.filter((student) => student.courseId === assignment.courseId)
}

export function getAssignmentProgress(data: PlatformData, assignment: CourseAssignment) {
  const students = getAssignmentStudents(data, assignment)
  const evaluations = getAssignmentEvaluations(data, assignment)
  const studentIds = new Set(students.map((student) => student.id))
  const completedStudentIds = new Set(
    evaluations
      .filter((evaluation) => studentIds.has(evaluation.studentId))
      .filter(isCompletedEvaluation)
      .map((evaluation) => evaluation.studentId),
  )
  const studentCount =
    students.length || data.courses.find((course) => course.id === assignment.courseId)?.studentCount || 0
  const completedCount = Math.min(completedStudentIds.size, studentCount)

  return {
    studentCount,
    completedCount,
    status: getStatusFromProgress(completedCount, studentCount),
    lastUpdated: evaluations[0]?.lastUpdated ?? "—",
  }
}

export function getCoursePeriodProgress(data: PlatformData, courseId: string, periodId: string) {
  const students = data.students.filter((student) => student.courseId === courseId)
  const assignments = data.courseAssignments.filter(
    (assignment) => assignment.courseId === courseId && assignment.periodId === periodId,
  )
  const evaluations = data.evaluations.filter(
    (evaluation) => evaluation.courseId === courseId && evaluation.periodId === periodId,
  )
  const assignedTeacherIds = new Set(assignments.map((assignment) => assignment.teacherId))
  const completedEvaluations = evaluations.filter(isCompletedEvaluation).length
  const totalEvaluations = students.length * assignments.length

  return {
    studentCount: students.length || data.courses.find((course) => course.id === courseId)?.studentCount || 0,
    teacherCount: assignedTeacherIds.size,
    completedEvaluations,
    totalEvaluations,
    status: getStatusFromProgress(completedEvaluations, totalEvaluations),
    teachers: data.teachers.filter((teacher) => assignedTeacherIds.has(teacher.id)),
  }
}

export function getTeacherCourseStatus(
  data: PlatformData,
  teacher: Teacher,
  courseId: string,
  periodId: string,
) {
  const assignments = data.courseAssignments.filter(
    (assignment) =>
      assignment.teacherId === teacher.id &&
      assignment.courseId === courseId &&
      assignment.periodId === periodId,
  )
  const students = data.students.filter((student) => student.courseId === courseId)
  const completed = assignments.reduce((sum, assignment) => {
    return sum + getAssignmentProgress(data, assignment).completedCount
  }, 0)
  const total = students.length * assignments.length

  return getStatusFromProgress(completed, total)
}
