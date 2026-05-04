import { env } from "@/lib/env"
import { ExternalServiceError } from "@/lib/errors"
import type { ZohoAssignment, ZohoStudent, ZohoTeacher, ZohoUploadResponse } from "./types"
import { mockZohoAssignments, mockZohoStudents, mockZohoTeachers } from "./mock-data"

export interface ZohoClient {
  getStudents: () => Promise<ZohoStudent[]>
  getTeachers: () => Promise<ZohoTeacher[]>
  getAssignments: () => Promise<ZohoAssignment[]>
  uploadReportCardPdf: (input: { studentZohoId: string; fileName: string; pdf: Buffer }) => Promise<ZohoUploadResponse>
}

export function createZohoClient(): ZohoClient {
  const hasCredentials = Boolean(env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET && env.ZOHO_REFRESH_TOKEN && env.ZOHO_BASE_URL)

  return {
    async getStudents() {
      if (!hasCredentials) return mockZohoStudents
      throw new ExternalServiceError("Zoho real client is not implemented until module and field names are confirmed")
    },
    async getTeachers() {
      if (!hasCredentials) return mockZohoTeachers
      throw new ExternalServiceError("Zoho real client is not implemented until module and field names are confirmed")
    },
    async getAssignments() {
      if (!hasCredentials) return mockZohoAssignments
      throw new ExternalServiceError("Zoho real client is not implemented until module and field names are confirmed")
    },
    async uploadReportCardPdf(input) {
      if (!hasCredentials) {
        return {
          id: `mock-upload-${input.studentZohoId}`,
          status: "SUCCESS",
          fileUrl: `mock://zoho/${input.fileName}`,
        }
      }
      throw new ExternalServiceError("Zoho PDF upload requires confirmed attachment flow")
    },
  }
}
