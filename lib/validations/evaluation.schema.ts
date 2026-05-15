import { z } from "zod"
import { idSchema, isoDateSchema } from "./common"
import { TEACHER_OBSERVATION_MAX_LENGTH } from "@/lib/evaluation-limits"

export const evaluationStatusSchema = z.enum(["DRAFT", "SUBMITTED", "NEEDS_REVISION", "APPROVED"])

export const evaluationSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  teacherId: idSchema,
  subjectId: idSchema,
  periodId: idSchema,
  status: evaluationStatusSchema,
  generalObservation: z.string().max(TEACHER_OBSERVATION_MAX_LENGTH).optional(),
  specialValue: z.string().optional(),
  numericGrade: z.number().int().min(1).max(10).optional(),
  submittedAt: isoDateSchema.optional(),
})

export const evaluationGradeSchema = z.object({
  id: idSchema,
  evaluationId: idSchema,
  criterionId: idSchema,
  scaleLevelId: idSchema,
  observation: z.string().optional(),
})

export const courseAssignmentSchema = z.object({
  id: idSchema,
  teacherId: idSchema,
  subjectId: idSchema,
  grade: z.string().min(1),
  division: z.string().min(1),
  periodId: idSchema,
})

export type EvaluationInput = z.infer<typeof evaluationSchema>
export type EvaluationGradeInput = z.infer<typeof evaluationGradeSchema>
export type CourseAssignmentInput = z.infer<typeof courseAssignmentSchema>
