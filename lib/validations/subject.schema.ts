import { z } from "zod"
import { idSchema } from "./common"

export const subjectSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  gradeRange: z.array(z.string().min(1)).min(1),
  active: z.boolean(),
})

export const evaluationCriterionSchema = z.object({
  id: idSchema,
  subjectId: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  gradeRange: z.array(z.string().min(1)).min(1),
  active: z.boolean(),
})

export type SubjectInput = z.infer<typeof subjectSchema>
export type EvaluationCriterionInput = z.infer<typeof evaluationCriterionSchema>
