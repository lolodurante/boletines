import { sendEmail } from "@/lib/email/client"
import { renderReportCardEmail } from "@/lib/email/templates/report-card-email"
import type { ReportCardEmailInput } from "@/lib/email/types"

export async function sendReportCardEmail(input: ReportCardEmailInput) {
  const rendered = renderReportCardEmail(input)
  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    attachmentUrl: input.pdfUrl,
    attachment: {
      fileName: input.pdfFileName,
      contentType: "application/pdf",
      content: input.pdfBuffer,
    },
  })
}
