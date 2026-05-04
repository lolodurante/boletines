import { env } from "@/lib/env"
import { MissingEmailError } from "@/lib/errors"
import { emailPayloadSchema } from "@/lib/validations"
import type { EmailSendResult } from "./types"

interface EmailPayload {
  to?: string
  subject: string
  html: string
  attachmentUrl?: string
  attachment?: {
    fileName: string
    contentType: string
    content: Buffer
  }
}

async function sendWithResend(payload: Required<Pick<EmailPayload, "to" | "subject" | "html">> & EmailPayload) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { status: "FAILED", errorMessage: "Resend no esta configurado." } satisfies EmailSendResult
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachment
        ? [
            {
              filename: payload.attachment.fileName,
              content: payload.attachment.content.toString("base64"),
            },
          ]
        : undefined,
    }),
  })

  const body = await response.json().catch(() => null) as { id?: string; message?: string } | null
  if (!response.ok) {
    return { status: "FAILED", errorMessage: body?.message ?? "Resend rechazo el envio." } satisfies EmailSendResult
  }

  return { status: "SENT", providerMessageId: body?.id } satisfies EmailSendResult
}

async function sendWithSendGrid(payload: Required<Pick<EmailPayload, "to" | "subject" | "html">> & EmailPayload) {
  if (!env.SENDGRID_API_KEY || !env.EMAIL_FROM) {
    return { status: "FAILED", errorMessage: "SendGrid no esta configurado." } satisfies EmailSendResult
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: env.EMAIL_FROM },
      subject: payload.subject,
      content: [{ type: "text/html", value: payload.html }],
      attachments: payload.attachment
        ? [
            {
              content: payload.attachment.content.toString("base64"),
              filename: payload.attachment.fileName,
              type: payload.attachment.contentType,
              disposition: "attachment",
            },
          ]
        : undefined,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { errors?: Array<{ message?: string }> } | null
    return { status: "FAILED", errorMessage: body?.errors?.[0]?.message ?? "SendGrid rechazo el envio." } satisfies EmailSendResult
  }

  return { status: "SENT", providerMessageId: response.headers.get("x-message-id") ?? undefined } satisfies EmailSendResult
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  if (!payload.to) {
    throw new MissingEmailError("unknown")
  }

  const parsed = emailPayloadSchema.parse({ ...payload, to: payload.to })
  const realSendingEnabled = env.ENABLE_REAL_EMAIL_SENDING === "true"

  if (!realSendingEnabled) {
    return {
      status: "SKIPPED",
      providerMessageId: `mock-email-${parsed.to}`,
    }
  }

  const provider = env.EMAIL_PROVIDER?.toLowerCase()
  if (provider === "resend") return sendWithResend({ ...payload, to: parsed.to })
  if (provider === "sendgrid") return sendWithSendGrid({ ...payload, to: parsed.to })

  return { status: "FAILED", errorMessage: "Proveedor de email no configurado." }
}
