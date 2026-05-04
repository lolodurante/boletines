import { z } from "zod"
import { idSchema } from "./common"

export const gradingScaleLevelSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  value: z.string().min(1),
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
})

export const gradingScaleSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  gradeFrom: z.number().int().positive(),
  gradeTo: z.number().int().positive(),
  levels: z.array(gradingScaleLevelSchema).min(1),
}).refine((scale) => scale.gradeFrom <= scale.gradeTo, {
  message: "gradeFrom must be lower than or equal to gradeTo",
  path: ["gradeFrom"],
})

export type GradingScaleInput = z.infer<typeof gradingScaleSchema>
export type GradingScaleLevelInput = z.infer<typeof gradingScaleLevelSchema>
