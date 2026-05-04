import type { CourseAssignment, Student, Teacher } from "@/types/domain"
import type { ZohoAssignment, ZohoStudent, ZohoTeacher } from "./types"

export function mapZohoStudentToStudent(student: ZohoStudent): Student {
  return {
    id: `student-${student.id}`,
    firstName: student.firstName,
    lastName: student.lastName,
    grade: student.grade,
    division: student.division,
    familyEmail: student.familyEmail,
    zohoId: student.id,
    status: student.status === "inactive" ? "INACTIVE" : "ACTIVE",
  }
}

export function mapZohoTeacherToTeacher(teacher: ZohoTeacher): Teacher {
  return {
    id: `teacher-${teacher.id}`,
    userId: teacher.userId ?? `user-${teacher.id}`,
    zohoId: teacher.id,
    assignedCourses: [],
  }
}

export function mapZohoAssignmentToCourseAssignment(assignment: ZohoAssignment, params: { teacherId: string; subjectId: string; periodId: string }): CourseAssignment {
  return {
    id: `assignment-${assignment.id}`,
    teacherId: params.teacherId,
    subjectId: params.subjectId,
    grade: assignment.grade,
    division: assignment.division,
    periodId: params.periodId,
  }
}
