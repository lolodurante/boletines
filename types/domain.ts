export type UserRole = "DIRECTOR" | "TEACHER" | "ADMIN"
export type StudentStatus = "ACTIVE" | "INACTIVE"
export type AcademicPeriodType = "TRIMESTER" | "BIMESTER" | "QUARTER" | "CUSTOM"
export type AcademicPeriodStatus = "DRAFT" | "ACTIVE" | "CLOSED"
export type EvaluationStatus = "DRAFT" | "SUBMITTED" | "NEEDS_REVISION" | "APPROVED"
export type ReportCardStatus =
  | "NOT_READY"
  | "READY_FOR_REVIEW"
  | "NEEDS_REVISION"
  | "APPROVED"
  | "SENT"
  | "BLOCKED_MISSING_EMAIL"
export type ReportDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "BLOCKED"
export type ReportCardPdfStatus = "PENDING" | "GENERATED" | "FAILED" | "SKIPPED"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  division: string
  familyEmail?: string
  status: StudentStatus
}

export interface Teacher {
  id: string
  userId: string
  assignedCourses: string[]
}

export interface Subject {
  id: string
  name: string
  gradeRange: string[]
  active: boolean
}

export interface EvaluationCriterion {
  id: string
  subjectId: string
  name: string
  description: string
  gradeRange: string[]
  active: boolean
}

export interface GradingScale {
  id: string
  name: string
  gradeFrom: number
  gradeTo: number
  levels: GradingScaleLevel[]
}

export interface GradingScaleLevel {
  id: string
  label: string
  value: string
  order: number
  description?: string
}

export interface AcademicPeriod {
  id: string
  name: string
  type: AcademicPeriodType
  startDate: Date
  dueDate: Date
  teacherDeadline?: Date
  status: AcademicPeriodStatus
}

export interface CourseAssignment {
  id: string
  teacherId: string
  subjectId: string
  grade: string
  division: string
  periodId: string
}

export interface Evaluation {
  id: string
  studentId: string
  teacherId: string
  subjectId: string
  periodId: string
  status: EvaluationStatus
  generalObservation?: string
  submittedAt?: Date
}

export interface EvaluationGrade {
  id: string
  evaluationId: string
  criterionId: string
  scaleLevelId: string
  observation?: string
}

export interface ReportCard {
  id: string
  studentId: string
  periodId: string
  status: ReportCardStatus
  directorObservation?: string
  pdfUrl?: string
  sentAt?: Date
  pdfStatus: ReportCardPdfStatus
}

export interface ReportDelivery {
  id: string
  reportCardId: string
  recipientEmail?: string
  status: ReportDeliveryStatus
  errorMessage?: string
  sentAt?: Date
}
