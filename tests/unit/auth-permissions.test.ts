import { describe, expect, it } from "vitest"
import { canEditEvaluation, canReviewReportCard } from "@/lib/auth/permissions"

describe("auth permissions", () => {
  it("allows teacher to edit their own assigned student", () => {
    expect(canEditEvaluation({
      id: "user-teacher-1",
      role: "TEACHER",
      teacherId: "teacher-1",
    }, {
      teacherId: "teacher-1",
      assignedStudentIds: ["student-1"],
      studentId: "student-1",
    })).toBe(true)
  })

  it("prevents teacher from editing another teacher assignment", () => {
    expect(canEditEvaluation({
      id: "user-teacher-1",
      role: "TEACHER",
      teacherId: "teacher-1",
    }, {
      teacherId: "teacher-2",
      assignedStudentIds: ["student-1"],
      studentId: "student-1",
    })).toBe(false)
  })

  it("prevents teacher from editing a non-assigned student", () => {
    expect(canEditEvaluation({
      id: "user-teacher-1",
      role: "TEACHER",
      teacherId: "teacher-1",
    }, {
      teacherId: "teacher-1",
      assignedStudentIds: ["student-1"],
      studentId: "student-2",
    })).toBe(false)
  })

  it("allows director to review report cards", () => {
    expect(canReviewReportCard({ id: "user-director", role: "DIRECTOR" })).toBe(true)
  })

  it("prevents teacher from reviewing report cards", () => {
    expect(canReviewReportCard({ id: "user-teacher", role: "TEACHER", teacherId: "teacher-1" })).toBe(false)
  })
})
