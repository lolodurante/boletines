import type { ReportCardEmailInput } from "../types"

export function renderReportCardEmail(input: ReportCardEmailInput) {
  return {
    subject: `Boletin de ${input.studentName} - ${input.periodName}`,
    html: `
      <p>Familia:</p>
      <p>Adjuntamos el boletin correspondiente a ${input.periodName}.</p>
      <p>Alumno/a: <strong>${input.studentName}</strong></p>
      <p>Documento: <a href="${input.pdfUrl}">ver boletin</a></p>
      <p>Colegio Labarden</p>
    `,
  }
}
