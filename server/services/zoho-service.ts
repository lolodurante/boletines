import { createZohoClient } from "@/lib/zoho/client"
import { mapZohoAssignmentToCourseAssignment, mapZohoStudentToStudent, mapZohoTeacherToTeacher } from "@/lib/zoho/mappers"

export async function getZohoStudents() {
  const client = createZohoClient()
  return (await client.getStudents()).map(mapZohoStudentToStudent)
}

export async function getZohoTeachers() {
  const client = createZohoClient()
  return (await client.getTeachers()).map(mapZohoTeacherToTeacher)
}

export async function getZohoAssignments(params: { teacherId: string; subjectId: string; periodId: string }) {
  const client = createZohoClient()
  return (await client.getAssignments()).map((assignment) => mapZohoAssignmentToCourseAssignment(assignment, params))
}

export async function uploadReportCardToZoho(input: { studentZohoId: string; fileName: string; pdf: Buffer }) {
  const client = createZohoClient()
  return client.uploadReportCardPdf(input)
}
