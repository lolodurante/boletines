import type { ReportCardStatus, UserRole } from "@/types/domain"
import type { AuthUser } from "./roles"

export function canReviewReportCard(user: AuthUser) {
  return user.role === "DIRECTOR" || user.role === "ADMIN"
}

export function canSendReportCard(user: AuthUser, status: ReportCardStatus) {
  return (user.role === "DIRECTOR" || user.role === "ADMIN") && status === "APPROVED"
}

export function canConfigureSystem(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN"
}

export function canEditEvaluation(user: AuthUser, params: { teacherId: string; assignedStudentIds: string[]; studentId: string }) {
  if (user.role === "ADMIN") return true
  if (user.role !== "TEACHER") return false
  return user.teacherId === params.teacherId && params.assignedStudentIds.includes(params.studentId)
}
