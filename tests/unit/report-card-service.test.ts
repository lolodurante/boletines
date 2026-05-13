import { describe, expect, it } from "vitest"
import { ReportCardNotReadyError } from "@/lib/errors"
import { mockAssignments, mockEvaluations, mockReportCards, mockStudents } from "@/lib/mock-data"
import { approveReportCard, blockIfMissingEmail, isReportCardReady, markReportCardPdfGenerated } from "@/server/services/report-card-service"

describe("report-card-service", () => {
  it("does not block report cards without family email", () => {
    const reportCard = mockReportCards[0]
    const student = mockStudents.find((item) => item.id === "student-2")

    expect(reportCard).toBeDefined()
    expect(student).toBeDefined()
    expect(blockIfMissingEmail(reportCard!, student!).status).toBe(reportCard!.status)
  })

  it("marks report card ready only when every required evaluation is submitted", () => {
    expect(isReportCardReady({
      studentId: "student-1",
      periodId: "period-2026-t1",
      assignments: mockAssignments,
      evaluations: mockEvaluations,
    })).toBe(true)

    expect(isReportCardReady({
      studentId: "student-2",
      periodId: "period-2026-t1",
      assignments: mockAssignments,
      evaluations: mockEvaluations,
    })).toBe(false)
  })

  it("allows ready report cards to generate a PDF", () => {
    const approved = { ...mockReportCards[0]!, status: "APPROVED" as const }

    expect(markReportCardPdfGenerated(approved, "https://example.com/boletin.pdf").status).toBe("APPROVED")
    expect(markReportCardPdfGenerated(approved, "https://example.com/boletin.pdf").pdfStatus).toBe("GENERATED")
  })

  it("rejects PDF generation if report card is not ready", () => {
    const notReady = { ...mockReportCards[0]!, status: "NOT_READY" as const }

    expect(() => markReportCardPdfGenerated(notReady, "https://example.com/boletin.pdf")).toThrow(ReportCardNotReadyError)
  })

  it("rejects approval if report card is not ready for review", () => {
    expect(() => approveReportCard(mockReportCards[2]!)).toThrow(ReportCardNotReadyError)
  })
})
