import { z } from "zod"
import { idSchema, isoDateSchema } from "./common"

export const academicPeriodSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  type: z.enum(["TRIMESTER", "BIMESTER", "QUARTER", "CUSTOM"]),
  startDate: isoDateSchema,
  dueDate: isoDateSchema,
  teacherDeadline: isoDateSchema.optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]),
}).refine((period) => period.startDate <= period.dueDate, {
  message: "startDate must be before dueDate",
  path: ["dueDate"],
})

export type AcademicPeriodInput = z.infer<typeof academicPeriodSchema>
