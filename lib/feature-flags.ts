import { env } from "./env"

function enabled(value: string | undefined, defaultValue = false) {
  if (value === undefined) return defaultValue
  return value === "true"
}

export const featureFlags = {
  enableRealEmailSending: env.ENABLE_REAL_EMAIL_SENDING === "true",
  enablePdfGeneration: enabled(process.env.ENABLE_PDF_GENERATION, true),
  enableDirectorDashboardStats: enabled(process.env.ENABLE_DIRECTOR_DASHBOARD_STATS, true),
  enableTeacherDraftAutosave: enabled(process.env.ENABLE_TEACHER_DRAFT_AUTOSAVE),
}
