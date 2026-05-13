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

export async function upsertStudent(input: {
  id?: string
  firstName: string
  lastName: string
  grade: string
  division: string
  familyEmail?: string
}) {
  if (input.id) {
    return prisma.student.update({
      where: { id: input.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        grade: input.grade,
        division: input.division,
        familyEmail: input.familyEmail,
      },
    })
  }

  return prisma.student.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      grade: input.grade,
      division: input.division,
      familyEmail: input.familyEmail,
    },
  })
}
