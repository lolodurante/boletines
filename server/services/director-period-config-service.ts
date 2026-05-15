import { prisma } from "@/lib/db/client"
import type { PeriodStatus } from "@/lib/data"

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR")
}

function mapPeriodStatus(status: string): PeriodStatus {
  if (status === "ACTIVE") return "Activo"
  if (status === "CLOSED") return "Cerrado"
  return "Próximo"
}

export async function getDirectorPeriodConfigData() {
  const [periods, evaluationCounts] = await Promise.all([
    prisma.academicPeriod.findMany({
      select: { id: true, name: true, startDate: true, dueDate: true, teacherDeadline: true, status: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.evaluation.groupBy({
      by: ["periodId", "status"],
      _count: { _all: true },
    }),
  ])

  const progressByPeriod = new Map<string, { total: number; completed: number }>()
  for (const count of evaluationCounts) {
    const progress = progressByPeriod.get(count.periodId) ?? { total: 0, completed: 0 }
    progress.total += count._count._all
    if (count.status === "APPROVED" || count.status === "SUBMITTED") {
      progress.completed += count._count._all
    }
    progressByPeriod.set(count.periodId, progress)
  }

  return {
    periods: periods.map((period) => ({
      id: period.id,
      name: period.name,
      startDate: formatDate(period.startDate),
      endDate: formatDate(period.dueDate),
      teacherDeadline: formatDate(period.teacherDeadline ?? period.dueDate),
      status: mapPeriodStatus(period.status),
      progress: (() => {
        const counts = progressByPeriod.get(period.id)
        if (!counts?.total) return 0
        return Math.round((counts.completed / counts.total) * 100)
      })(),
    })),
  }
}
