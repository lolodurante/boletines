import { describe, expect, it } from "vitest"
import { generateReportCardPdf } from "@/lib/pdf/generate-report-card-pdf"

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
          teacherObservation: "Buen trabajo.",
        },
      ],
      directorObservation: "Continua acompanamiento.",
      branding: { primaryColor: "#0f766e", secondaryColor: "#f59e0b" },
    })

    expect(result.fileName).toContain("martina-garcia")
    expect(result.buffer.byteLength).toBeGreaterThan(0)
    expect(result.buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-")
    expect(result.url).toContain("data:application/pdf;base64,")
  })
})
