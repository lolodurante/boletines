import type { ReportCardPdfData } from "./report-card-data.schema"

export function renderReportCardTemplate(data: ReportCardPdfData) {
  const subjectRows = data.subjects
    .map((subject) => {
      const criteria = subject.criteria.map((criterion) => `${criterion.name}: ${criterion.gradeLabel}`).join(" | ")
      const numericGrade = typeof subject.numericGrade === "number" ? ` | ${subject.subjectName}: nota ${subject.numericGrade}` : ""
      return `${subject.subjectName} (${subject.teacherName}) - ${criteria}${numericGrade}`
    })
    .join("\n")

  return [
    "Colegio Labarden",
    `Alumno/a: ${data.student.fullName}`,
    `Curso: ${data.student.grade} ${data.student.division}`,
    `Periodo: ${data.period.name}`,
    subjectRows,
    data.absences?.map((absence) => `${absence.label}: ${absence.value}`).join("\n") ?? "",
    data.comments?.map((comment) => `${comment.label}: ${comment.value}`).join("\n") ?? "",
    data.directorObservation ? `Observacion direccion: ${data.directorObservation}` : "",
  ].filter(Boolean).join("\n")
}
