import { describe, expect, it } from "vitest"
import { MissingEmailError, ReportCardNotReadyError } from "@/lib/errors"
import { mockAssignments, mockEvaluations, mockReportCards, mockStudents } from "@/lib/mock-data"
import { approveReportCard, blockIfMissingEmail, isReportCardReady, markReportCardAsSent } from "@/server/services/report-card-service"

describe("report-card-service", () => {
  it("blocks report card when student has no family email", () => {
    const reportCard = mockReportCards[0]
    const student = mockStudents.find((item) => item.id === "student-2")

    expect(reportCard).toBeDefined()
    expect(student).toBeDefined()
    expect(blockIfMissingEmail(reportCard!, student!).status).toBe("BLOCKED_MISSING_EMAIL")
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

  it("allows approved report cards to be marked as sent", () => {
    const student = mockStudents[0]
    const approved = { ...mockReportCards[0]!, status: "APPROVED" as const }

    expect(markReportCardAsSent(approved, student!).status).toBe("SENT")
  })

  it("rejects sending when family email is missing", () => {
    const student = mockStudents.find((item) => item.id === "student-2")
    const approved = { ...mockReportCards[0]!, status: "APPROVED" as const }

    expect(() => markReportCardAsSent(approved, student!)).toThrow(MissingEmailError)
  })

  it("rejects approval if report card is not ready for review", () => {
    expect(() => approveReportCard(mockReportCards[2]!)).toThrow(ReportCardNotReadyError)
  })
})
