import { prisma } from "@/lib/db/client"

export async function findStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
  })
}

export async function findStudentsByCourse(input: { grade: string; division: string }) {
  return prisma.student.findMany({
    where: {
      grade: input.grade,
      division: input.division,
      status: "ACTIVE",
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}

export async function upsertStudentFromZoho(input: {
  zohoId: string
  firstName: string
  lastName: string
  grade: string
  division: string
  familyEmail?: string
}) {
  return prisma.student.upsert({
    where: { zohoId: input.zohoId },
    create: {
      zohoId: input.zohoId,
      firstName: input.firstName,
      lastName: input.lastName,
      grade: input.grade,
      division: input.division,
      familyEmail: input.familyEmail,
    },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      grade: input.grade,
      division: input.division,
      familyEmail: input.familyEmail,
    },
  })
}
