import { prisma } from "@/lib/db/client"

export async function findReportCardForReview(id: string) {
  return prisma.reportCard.findUnique({
    where: { id },
    include: {
      student: true,
      period: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

export async function findReadyReportCards(periodId: string) {
  return prisma.reportCard.findMany({
    where: {
      periodId,
      status: "READY_FOR_REVIEW",
    },
    include: {
      student: true,
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  })
}

export async function createReportDelivery(input: { reportCardId: string; recipientEmail?: string; status: "PENDING" | "BLOCKED" }) {
  return prisma.reportDelivery.create({
    data: input,
  })
}
