import { prisma } from "@/lib/db/client"

export async function findEvaluationWithGrades(id: string) {
  return prisma.evaluation.findUnique({
    where: { id },
    include: {
      grades: true,
      student: true,
      teacher: {
        include: {
          user: true,
        },
      },
      subject: true,
      period: true,
    },
  })
}

export async function findEvaluationsForReportCard(input: { studentId: string; periodId: string; type?: "ESPANOL" | "INGLES" }) {
  return prisma.evaluation.findMany({
    where: {
      studentId: input.studentId,
      periodId: input.periodId,
      subject: input.type ? { type: input.type } : undefined,
    },
    include: {
      grades: {
        include: {
          criterion: true,
          scaleLevel: true,
        },
      },
      teacher: {
        include: {
          user: true,
        },
      },
      subject: true,
    },
    orderBy: [{ subject: { name: "asc" } }],
  })
}
