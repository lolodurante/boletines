export interface ReportCardEmailInput {
  to: string
  studentName: string
  periodName: string
  pdfUrl: string
  pdfFileName: string
  pdfBuffer: Buffer
}

export interface EmailSendResult {
  status: "SENT" | "SKIPPED" | "FAILED"
  providerMessageId?: string
  errorMessage?: string
}
