import { prisma } from "@/lib/db/client"
import type { PlatformData } from "@/lib/presentation-data"

const GRADES = ["1", "2", "3", "4", "5", "6"]

export async function getDirectorSubjectConfigData() {
  const subjects = await prisma.subject.findMany({
    where: { active: true },
    include: {
      criteria: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  })

  return {
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      reportType: subject.type,
      entryKind: subject.entryKind,
      hasNumericGrade: subject.hasNumericGrade,
      appliesTo: subject.gradeRange.map((grade) => `${grade}°`),
      criteriaByGrade: GRADES.map((grade) => ({
        grade: `${grade}°`,
        criteria: subject.criteria
          .filter((criterion) => criterion.gradeRange.includes(grade))
          .map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
          })),
      })),
    })) satisfies PlatformData["subjects"],
  }
}
