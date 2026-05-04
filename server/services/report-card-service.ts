import { MissingEmailError, ReportCardNotReadyError } from "@/lib/errors"
import type { CourseAssignment, Evaluation, ReportCard, Student } from "@/types/domain"

export function isReportCardReady(input: { studentId: string; periodId: string; assignments: CourseAssignment[]; evaluations: Evaluation[] }) {
  const requiredAssignments = input.assignments.filter((assignment) => assignment.periodId === input.periodId)
  if (requiredAssignments.length === 0) return false

  return requiredAssignments.every((assignment) =>
    input.evaluations.some((evaluation) =>
      evaluation.studentId === input.studentId &&
      evaluation.periodId === input.periodId &&
      evaluation.teacherId === assignment.teacherId &&
      evaluation.subjectId === assignment.subjectId &&
      (evaluation.status === "SUBMITTED" || evaluation.status === "APPROVED"),
    ),
  )
}

export function blockIfMissingEmail(reportCard: ReportCard, student: Student): ReportCard {
  if (student.familyEmail) return reportCard
  return { ...reportCard, status: "BLOCKED_MISSING_EMAIL", zohoUploadStatus: "SKIPPED" }
}

export function approveReportCard(reportCard: ReportCard, directorObservation?: string): ReportCard {
  if (reportCard.status !== "READY_FOR_REVIEW") {
    throw new ReportCardNotReadyError(reportCard.id)
  }

  return { ...reportCard, status: "APPROVED", directorObservation }
}

export function markReportCardAsSent(reportCard: ReportCard, student: Student): ReportCard {
  if (!student.familyEmail) throw new MissingEmailError(student.id)
  if (reportCard.status !== "APPROVED") throw new ReportCardNotReadyError(reportCard.id)
  return { ...reportCard, status: "SENT", sentAt: new Date() }
}

export function buildReportCardContent(input: { student: Student; reportCard: ReportCard }) {
  return {
    studentName: `${input.student.firstName} ${input.student.lastName}`,
    status: input.reportCard.status,
    directorObservation: input.reportCard.directorObservation,
  }
}
