import { describe, expect, it } from "vitest"
import { mapZohoAssignmentToCourseAssignment, mapZohoStudentToStudent, mapZohoTeacherToTeacher } from "@/lib/zoho/mappers"

describe("zoho mappers", () => {
  it("maps Zoho student into domain student", () => {
    const student = mapZohoStudentToStudent({
      id: "z-st-1",
      firstName: "Martina",
      lastName: "Garcia",
      grade: "3",
      division: "A",
      familyEmail: "familia@example.com",
    })

    expect(student).toMatchObject({
      id: "student-z-st-1",
      zohoId: "z-st-1",
      status: "ACTIVE",
    })
  })

  it("maps Zoho teacher into domain teacher", () => {
    const teacher = mapZohoTeacherToTeacher({ id: "z-t-1", name: "Laura Fernandez", email: "laura@example.com" })

    expect(teacher.userId).toBe("user-z-t-1")
    expect(teacher.assignedCourses).toEqual([])
  })

  it("maps Zoho assignment with explicit local ids", () => {
    const assignment = mapZohoAssignmentToCourseAssignment({
      id: "z-a-1",
      teacherZohoId: "z-t-1",
      subjectName: "Matematica",
      grade: "3",
      division: "A",
    }, {
      teacherId: "teacher-1",
      subjectId: "subject-matematica",
      periodId: "period-1",
    })

    expect(assignment).toMatchObject({
      teacherId: "teacher-1",
      subjectId: "subject-matematica",
      periodId: "period-1",
    })
  })
})
