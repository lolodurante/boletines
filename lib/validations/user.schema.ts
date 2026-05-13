import { z } from "zod"
import { idSchema, isoDateSchema, optionalEmailSchema, requiredEmailSchema } from "./common"

export const userRoleSchema = z.enum(["DIRECTOR", "TEACHER", "ADMIN"])

export const userSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  email: requiredEmailSchema,
  role: userRoleSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const teacherSchema = z.object({
  id: idSchema,
  userId: idSchema,
  assignedCourses: z.array(idSchema),
})

export const emailPayloadSchema = z.object({
  to: requiredEmailSchema,
  subject: z.string().min(1),
  html: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
})

export type UserInput = z.infer<typeof userSchema>
export type TeacherInput = z.infer<typeof teacherSchema>
export type EmailPayloadInput = z.infer<typeof emailPayloadSchema>
