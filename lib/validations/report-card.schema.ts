import { z } from "zod"
import { idSchema, isoDateSchema, optionalEmailSchema } from "./common"

export const reportCardStatusSchema = z.enum([
  "NOT_READY",
  "READY_FOR_REVIEW",
  "NEEDS_REVISION",
  "APPROVED",
  "SENT",
  "BLOCKED_MISSING_EMAIL",
])

export const reportCardTypeSchema = z.enum(["ESPANOL", "INGLES"])

export const reportCardSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  periodId: idSchema,
  type: reportCardTypeSchema,
  status: reportCardStatusSchema,
  directorObservation: z.string().optional(),
  pdfUrl: z.string().url().optional(),
  sentAt: isoDateSchema.optional(),
  pdfStatus: z.enum(["PENDING", "GENERATED", "FAILED", "SKIPPED"]),
})

export const reportDeliverySchema = z.object({
  id: idSchema,
  reportCardId: idSchema,
  recipientEmail: optionalEmailSchema,
  status: z.enum(["PENDING", "SENT", "FAILED", "BLOCKED"]),
  errorMessage: z.string().optional(),
  sentAt: isoDateSchema.optional(),
})

export const generateReportCardPdfSchema = z.object({
  reportCardId: idSchema,
  directorObservation: z.string().optional(),
})

export type ReportCardInput = z.infer<typeof reportCardSchema>
export type ReportDeliveryInput = z.infer<typeof reportDeliverySchema>
export type GenerateReportCardPdfInput = z.infer<typeof generateReportCardPdfSchema>
