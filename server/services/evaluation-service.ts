import type { CourseAssignment, Evaluation, EvaluationGrade, EvaluationStatus } from "@/types/domain"

export function isEvaluationComplete(input: { evaluation: Evaluation; grades: EvaluationGrade[]; requiredCriterionIds: string[] }) {
  if (input.requiredCriterionIds.length === 0) return false
  const completedCriterionIds = new Set(input.grades.filter((grade) => grade.evaluationId === input.evaluation.id).map((grade) => grade.criterionId))
  return input.requiredCriterionIds.every((criterionId) => completedCriterionIds.has(criterionId))
}

export function saveEvaluationDraft(evaluation: Evaluation): Evaluation {
  return { ...evaluation, status: "DRAFT", submittedAt: undefined }
}

export function submitEvaluation(input: { evaluation: Evaluation; grades: EvaluationGrade[]; requiredCriterionIds: string[] }): Evaluation {
  const status: EvaluationStatus = isEvaluationComplete(input) ? "SUBMITTED" : "DRAFT"
  return { ...input.evaluation, status, submittedAt: status === "SUBMITTED" ? new Date() : undefined }
}

export function requestEvaluationRevision(evaluation: Evaluation): Evaluation {
  return { ...evaluation, status: "NEEDS_REVISION" }
}

export function getAssignedStudentIds(input: { teacherId: string; assignments: CourseAssignment[]; students: Array<{ id: string; grade: string; division: string }> }) {
  const assignedGroups = input.assignments
    .filter((assignment) => assignment.teacherId === input.teacherId)
    .map((assignment) => `${assignment.grade}-${assignment.division}`)

  return input.students
    .filter((student) => assignedGroups.includes(`${student.grade}-${student.division}`))
    .map((student) => student.id)
}
