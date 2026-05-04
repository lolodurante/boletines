import { z } from "zod"
import { optionalEmailSchema } from "./common"

export const zohoStudentSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  grade: z.string().min(1),
  division: z.string().min(1),
  familyEmail: optionalEmailSchema,
  status: z.string().optional(),
})

export const zohoTeacherSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1).optional(),
  name: z.string().min(1),
  email: z.string().email(),
})

export const zohoAssignmentSchema = z.object({
  id: z.string().min(1),
  teacherZohoId: z.string().min(1),
  subjectName: z.string().min(1),
  grade: z.string().min(1),
  division: z.string().min(1),
})

export const zohoUploadResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SUCCESS", "FAILED"]),
  fileUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
})

export type ZohoStudentInput = z.infer<typeof zohoStudentSchema>
export type ZohoTeacherInput = z.infer<typeof zohoTeacherSchema>
export type ZohoAssignmentInput = z.infer<typeof zohoAssignmentSchema>
export type ZohoUploadResponseInput = z.infer<typeof zohoUploadResponseSchema>
