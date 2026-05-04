import { AuthorizationError } from "@/lib/errors"
import type { AuthUser } from "./roles"
import { canEditEvaluation, canReviewReportCard, canSendReportCard } from "./permissions"
import type { ReportCardStatus } from "@/types/domain"

export function requireDirector(user: AuthUser) {
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN") {
    throw new AuthorizationError("Director role required")
  }
}

export function requireTeacher(user: AuthUser) {
  if (user.role !== "TEACHER") {
    throw new AuthorizationError("Teacher role required")
  }
}

export function assertCanEditEvaluation(user: AuthUser, params: { teacherId: string; assignedStudentIds: string[]; studentId: string }) {
  if (!canEditEvaluation(user, params)) {
    throw new AuthorizationError("Teacher cannot edit this evaluation")
  }
}

export function assertCanReviewReportCard(user: AuthUser) {
  if (!canReviewReportCard(user)) {
    throw new AuthorizationError("User cannot review report cards")
  }
}

export function assertCanSendReportCard(user: AuthUser, status: ReportCardStatus) {
  if (!canSendReportCard(user, status)) {
    throw new AuthorizationError("User cannot send this report card")
  }
}
