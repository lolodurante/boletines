import type { AcademicPeriod } from "@/types/domain"

export function getActiveAcademicPeriod(periods: AcademicPeriod[]) {
  return periods.find((period) => period.status === "ACTIVE")
}

export function closeAcademicPeriod(period: AcademicPeriod): AcademicPeriod {
  return { ...period, status: "CLOSED" }
}
