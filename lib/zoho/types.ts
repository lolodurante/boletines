export interface ZohoStudent {
  id: string
  firstName: string
  lastName: string
  grade: string
  division: string
  familyEmail?: string
  status?: string
}

export interface ZohoTeacher {
  id: string
  userId?: string
  name: string
  email: string
}

export interface ZohoAssignment {
  id: string
  teacherZohoId: string
  subjectName: string
  grade: string
  division: string
}

export interface ZohoUploadResponse {
  id: string
  status: "SUCCESS" | "FAILED"
  fileUrl?: string
  errorMessage?: string
}
