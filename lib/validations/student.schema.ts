import { z } from "zod"
import { idSchema, optionalEmailSchema } from "./common"

export const studentStatusSchema = z.enum(["ACTIVE", "INACTIVE"])

export const studentSchema = z.object({
  id: idSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  grade: z.string().min(1),
  division: z.string().min(1),
  familyEmail: optionalEmailSchema,
  status: studentStatusSchema,
})

export type StudentInput = z.infer<typeof studentSchema>
