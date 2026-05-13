import { prisma } from "@/lib/db/client"

function courseParts(courseId: string) {
  const match = /^c(.+)([a-z])$/i.exec(courseId)
  if (!match) return null

  return {
    grade: match[1]!,
    division: match[2]!.toUpperCase(),
  }
}

export async function teacherOwnsAssignment(input: {
  teacherId: string
  courseId: string
  subjectId: string
  periodId: string
}) {
  const course = courseParts(input.courseId)
  if (!course) return false

  const count = await prisma.courseAssignment.count({
    where: {
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      periodId: input.periodId,
      grade: course.grade,
      division: course.division,
      subject: { active: true },
    },
  })

  return count > 0
}
