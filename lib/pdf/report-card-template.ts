import type { ReportCardPdfData } from "./report-card-data.schema"

export function renderReportCardTemplate(data: ReportCardPdfData) {
  const subjectRows = data.subjects
    .map((subject) => {
      const criteria = subject.criteria.map((criterion) => `${criterion.name}: ${criterion.gradeLabel}`).join(" | ")
      return `${subject.subjectName} (${subject.teacherName}) - ${criteria}`
    })
    .join("\n")

  return [
    "Colegio Labarden",
    `Alumno/a: ${data.student.fullName}`,
    `Curso: ${data.student.grade} ${data.student.division}`,
    `Periodo: ${data.period.name}`,
    subjectRows,
    data.directorObservation ? `Observacion direccion: ${data.directorObservation}` : "",
  ].filter(Boolean).join("\n")
}
