import { z } from "zod"

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value)
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional())
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional())

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  AUTH_SECRET: z.string().optional(),
  AUTH_PROVIDER: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REFRESH_TOKEN: z.string().optional(),
  ZOHO_ORG_ID: z.string().optional(),
  ZOHO_BASE_URL: optionalUrl,
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_FROM: optionalEmail,
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  ENABLE_REAL_EMAIL_SENDING: z.enum(["true", "false"]).default("false"),
  PDF_STORAGE_PROVIDER: z.string().optional(),
  PDF_STORAGE_BUCKET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
})

export const env = envSchema.parse(process.env)
