import { ReportCardNotReadyError } from "@/lib/errors"
import type { CourseAssignment, Evaluation, ReportCard, ReportCardType, Student, Subject } from "@/types/domain"

export function isReportCardReady(input: {
  studentId: string
  periodId: string
  assignments: CourseAssignment[]
  evaluations: Evaluation[]
  subjects?: Pick<Subject, "id" | "type">[]
  reportType?: ReportCardType
}) {
  const subjectTypeById = new Map(input.subjects?.map((subject) => [subject.id, subject.type]) ?? [])
  const requiredAssignments = input.assignments.filter((assignment) => {
    if (assignment.periodId !== input.periodId) return false
    if (!input.reportType) return true
    return subjectTypeById.get(assignment.subjectId) === input.reportType
  })
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
  return { ...reportCard, status: "BLOCKED_MISSING_EMAIL" }
}

export function approveReportCard(reportCard: ReportCard, directorObservation?: string): ReportCard {
  if (reportCard.status !== "READY_FOR_REVIEW") {
    throw new ReportCardNotReadyError(reportCard.id)
  }

  return { ...reportCard, status: "APPROVED", directorObservation }
}

export function markReportCardPdfGenerated(reportCard: ReportCard, pdfUrl: string, directorObservation?: string): ReportCard {
  if (reportCard.status !== "READY_FOR_REVIEW" && reportCard.status !== "APPROVED") {
    throw new ReportCardNotReadyError(reportCard.id)
  }

  return { ...reportCard, status: "APPROVED", directorObservation, pdfUrl, pdfStatus: "GENERATED" }
}

export function buildReportCardContent(input: { student: Student; reportCard: ReportCard }) {
  return {
    studentName: `${input.student.firstName} ${input.student.lastName}`,
    status: input.reportCard.status,
    directorObservation: input.reportCard.directorObservation,
  }
}
