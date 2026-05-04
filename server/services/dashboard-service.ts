import type { CourseAssignment, Evaluation, ReportCard, Student } from "@/types/domain"

export function getCourseProgress(input: { grade: string; division: string; assignments: CourseAssignment[]; evaluations: Evaluation[]; students: Student[] }) {
  const students = input.students.filter((student) => student.grade === input.grade && student.division === input.division)
  const assignments = input.assignments.filter((assignment) => assignment.grade === input.grade && assignment.division === input.division)
  const totalEvaluations = students.length * assignments.length
  const completedEvaluations = input.evaluations.filter((evaluation) =>
    students.some((student) => student.id === evaluation.studentId) &&
    (evaluation.status === "SUBMITTED" || evaluation.status === "APPROVED"),
  ).length

  return {
    grade: input.grade,
    division: input.division,
    totalEvaluations,
    completedEvaluations,
    percentage: totalEvaluations === 0 ? 0 : Math.round((completedEvaluations / totalEvaluations) * 100),
  }
}

export function getReadyReportCards(reportCards: ReportCard[]) {
  return reportCards.filter((reportCard) => reportCard.status === "READY_FOR_REVIEW")
}

export function getBlockedReportCards(reportCards: ReportCard[]) {
  return reportCards.filter((reportCard) => reportCard.status === "BLOCKED_MISSING_EMAIL")
}

export function getGradeDistribution(labels: string[]) {
  return labels.reduce<Record<string, number>>((distribution, label) => {
    distribution[label] = (distribution[label] ?? 0) + 1
    return distribution
  }, {})
}
