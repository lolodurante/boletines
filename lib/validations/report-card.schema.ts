import { z } from "zod"
import { idSchema, isoDateSchema, optionalEmailSchema, requiredEmailSchema } from "./common"

export const reportCardStatusSchema = z.enum([
  "NOT_READY",
  "READY_FOR_REVIEW",
  "NEEDS_REVISION",
  "APPROVED",
  "SENT",
  "BLOCKED_MISSING_EMAIL",
])

export const reportCardSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  periodId: idSchema,
  status: reportCardStatusSchema,
  directorObservation: z.string().optional(),
  pdfUrl: z.string().url().optional(),
  sentAt: isoDateSchema.optional(),
  zohoUploadStatus: z.enum(["PENDING", "UPLOADED", "FAILED", "SKIPPED"]),
})

export const reportDeliverySchema = z.object({
  id: idSchema,
  reportCardId: idSchema,
  recipientEmail: optionalEmailSchema,
  status: z.enum(["PENDING", "SENT", "FAILED", "BLOCKED"]),
  errorMessage: z.string().optional(),
  sentAt: isoDateSchema.optional(),
})

export const sendReportCardSchema = z.object({
  reportCardId: idSchema,
  recipientEmail: requiredEmailSchema,
})

export type ReportCardInput = z.infer<typeof reportCardSchema>
export type ReportDeliveryInput = z.infer<typeof reportDeliverySchema>
export type SendReportCardInput = z.infer<typeof sendReportCardSchema>
