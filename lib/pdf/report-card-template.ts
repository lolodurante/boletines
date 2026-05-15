import type { ReportCardPdfData } from "./report-card-data.schema"

export function renderReportCardTemplate(data: ReportCardPdfData) {
  const subjectRows = data.subjects
    .map((subject) => {
      const criteria = subject.criteria.map((criterion) => `${criterion.name}: ${criterion.gradeLabel}`).join(" | ")
      const gradeNum = parseInt(data.student.grade.charAt(0))
      const qualitativeLabels: Record<number, string> = { 1: "Desaprobado", 2: "Regular", 3: "Bueno", 4: "Muy Bueno", 5: "Sobresaliente" }
      const numericGradeDisplay = typeof subject.numericGrade === "number"
        ? gradeNum <= 3 && subject.numericGrade in qualitativeLabels
          ? qualitativeLabels[subject.numericGrade]!
          : String(subject.numericGrade)
        : null
      const numericGrade = numericGradeDisplay ? ` | ${subject.subjectName}: nota ${numericGradeDisplay}` : ""
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
