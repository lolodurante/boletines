import { describe, expect, it } from "vitest"
import { generateReportCardPdf } from "@/lib/pdf/generate-report-card-pdf"

function criterion(name: string, gradeLabel: string, observation: string) {
  return { name, gradeLabel, observation }
}

describe("generateReportCardPdf", () => {
  it("generates validated PDF data from evaluation content", async () => {
    const result = await generateReportCardPdf({
      student: { fullName: "Martina Garcia", grade: "3", division: "A" },
      period: { name: "1er trimestre 2026" },
      subjects: [
        {
          subjectName: "Matematica",
          teacherName: "Laura Fernandez",
          criteria: [{ name: "Calculo", gradeLabel: "Logrado" }],
        },
      ],
      directorObservation: "Continua acompanamiento.",
      branding: { primaryColor: "#0f766e", secondaryColor: "#f59e0b" },
    })

    expect(result.fileName).toContain("martina-garcia")
    expect(result.buffer.byteLength).toBeGreaterThan(0)
    expect(result.buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-")
    expect(result.url).toContain("data:application/pdf;base64,")
    expect(result.buffer.toString("latin1")).toContain("Observación: Continua acompanamiento.")
    expect(result.buffer.toString("latin1")).not.toContain("Observación dirección")
  })

  it("keeps the official Labarden grid format used by the reference PDF", async () => {
    const result = await generateReportCardPdf({
      student: { fullName: "Inaki Casanova", grade: "6", division: "B" },
      period: { name: "Demo Direccion 2026" },
      subjects: [
        {
          subjectName: "Ciencias Naturales",
          teacherName: "Cicciaro, Ma. Isabel",
          criteria: [
            criterion(
              "Observacion y registro",
              "EXCELENTE",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Explicacion de fenomenos",
              "BUENO",
              "Muestra interes por aprender y aporta ideas pertinentes en los intercambios.",
            ),
            criterion(
              "Trabajo experimental",
              "MUY BUENO",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
          ],
        },
        {
          subjectName: "Ciencias Sociales",
          teacherName: "Chevallier B. Mandy",
          criteria: [
            criterion(
              "Comprension de procesos",
              "MUY BUENO",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion("Uso de fuentes", "BUENO", "Avanza con seguridad y demuestra autonomia en las actividades del periodo."),
            criterion(
              "Trabajo en clase",
              "EN PROCESO",
              "Se observa progreso sostenido; conviene seguir fortaleciendo la organizacion del trabajo.",
            ),
          ],
        },
        {
          subjectName: "Educacion Artistica",
          teacherName: "Cura Olivera, Josefina",
          criteria: [
            criterion(
              "Exploracion de materiales",
              "EXCELENTE",
              "Muestra interes por aprender y aporta ideas pertinentes en los intercambios.",
            ),
            criterion(
              "Proceso creativo",
              "MUY BUENO",
              "Responde bien al acompanamiento docente y completa las tareas con mayor continuidad.",
            ),
            criterion(
              "Presentacion de trabajos",
              "EN PROCESO",
              "Muestra interes por aprender y aporta ideas pertinentes en los intercambios.",
            ),
          ],
        },
        {
          subjectName: "Ingles",
          teacherName: "Cuper B, Daniela M.",
          criteria: [
            criterion("Comprension", "BUENO", "Sostiene un muy buen compromiso con las propuestas y participa activamente."),
            criterion(
              "Produccion oral",
              "MUY BUENO",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Produccion escrita",
              "BUENO",
              "Muestra interes por aprender y aporta ideas pertinentes en los intercambios.",
            ),
          ],
        },
        {
          subjectName: "Matematica",
          teacherName: "Cejas, Andrea",
          criteria: [
            criterion(
              "Resolucion de problemas",
              "EXCELENTE",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Calculo mental",
              "MUY BUENO",
              "Responde bien al acompanamiento docente y completa las tareas con mayor continuidad.",
            ),
            criterion(
              "Geometria y medida",
              "EXCELENTE",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Argumentacion",
              "BUENO",
              "Se observa progreso sostenido; conviene seguir fortaleciendo la organizacion del trabajo.",
            ),
          ],
        },
        {
          subjectName: "Practicas del Lenguaje",
          teacherName: "Cavallero, Camila",
          criteria: [
            criterion(
              "Comprension lectora",
              "EXCELENTE",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Produccion escrita",
              "MUY BUENO",
              "Responde bien al acompanamiento docente y completa las tareas con mayor continuidad.",
            ),
            criterion(
              "Participacion oral",
              "EXCELENTE",
              "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
            ),
            criterion(
              "Uso de convenciones",
              "BUENO",
              "Avanza con seguridad y demuestra autonomia en las actividades del periodo.",
            ),
          ],
        },
      ],
      directorObservation: "Continua acompanamiento desde direccion.",
      branding: { primaryColor: "#2563eb", secondaryColor: "#64748b" },
    })

    const pdf = result.buffer.toString("latin1")
    const pageCount = pdf.match(/\/Type \/Page\b/g)?.length ?? 0

    expect(pageCount).toBe(2)
    expect(pdf).toContain("/MediaBox [0 0 595 842]")
    expect(pdf).toContain("COLEGIO LABARDÉN")
    expect(pdf).toContain("DEMO DIRECCION 2026")
    expect(pdf.match(/Indicadores de logro en las áreas/g)).toHaveLength(2)
    expect(pdf).toContain("NOMBRE DEL ALUMNO: Inaki Casanova")
    expect(pdf).toContain("CURSO: 6 B")
    expect(pdf).toContain("DESTACADO")
    expect(pdf).toContain("EXCELENTE")
    expect(pdf).toContain("DOCENTE: Cicciaro, Ma. Isabel")
    expect(pdf).not.toContain("Observación docente")
    expect(pdf).toContain("Observación: Continua acompanamiento desde direccion.")
    expect(pdf).not.toContain("Observación dirección")
  })

  it("places absences above the achievement grid and comments at the bottom", async () => {
    const result = await generateReportCardPdf({
      student: { fullName: "Zoe Federico", grade: "6", division: "B" },
      period: { name: "Demo Direccion 2026" },
      subjects: [
        {
          subjectName: "Ingles",
          teacherName: "Daniela Cuper",
          criteria: [{ name: "Comprension oral", gradeLabel: "AVANZADO" }],
        },
      ],
      absences: [{ label: "Inasistencias", value: "2" }],
      comments: [{ label: "Comentario", value: "Participa con entusiasmo." }],
      branding: { primaryColor: "#2563eb", secondaryColor: "#64748b" },
    })

    const pdf = result.buffer.toString("latin1")
    const absencesIndex = pdf.indexOf("Inasistencias: 2")
    const gridIndex = pdf.indexOf("Indicadores de logro en las áreas")
    const subjectIndex = pdf.indexOf("INGLES")
    const commentIndex = pdf.indexOf("Comentario: Participa con entusiasmo.")

    expect(absencesIndex).toBeGreaterThan(-1)
    expect(gridIndex).toBeGreaterThan(-1)
    expect(subjectIndex).toBeGreaterThan(-1)
    expect(commentIndex).toBeGreaterThan(-1)
    expect(absencesIndex).toBeLessThan(gridIndex)
    expect(commentIndex).toBeGreaterThan(subjectIndex)
  })

  it("renders numeric grade after a subject criteria grid", async () => {
    const result = await generateReportCardPdf({
      student: { fullName: "Pilar Carera", grade: "4", division: "B" },
      period: { name: "Demo Direccion 2026" },
      subjects: [
        {
          subjectName: "Matematica",
          teacherName: "Laura Fernandez",
          numericGrade: 7,
          criteria: [
            { name: "Resolucion de problemas", gradeLabel: "AVANZADO" },
            { name: "Calculo", gradeLabel: "ALCANZADO" },
          ],
        },
      ],
      branding: { primaryColor: "#2563eb", secondaryColor: "#64748b" },
    })

    const pdf = result.buffer.toString("latin1")
    const subjectIndex = pdf.indexOf("MATEMATICA")
    const criterionIndex = pdf.indexOf("Calculo")
    const noteIndex = pdf.indexOf("Nota: 7")

    expect(subjectIndex).toBeGreaterThan(-1)
    expect(criterionIndex).toBeGreaterThan(subjectIndex)
    expect(noteIndex).toBeGreaterThan(criterionIndex)
  })
})
