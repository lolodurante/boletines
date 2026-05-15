import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import { prisma } from "@/lib/db/client"
import type { PeriodStatus } from "@/lib/data"

function mapPeriodStatus(status: string): PeriodStatus {
  if (status === "ACTIVE") return "Activo"
  if (status === "CLOSED") return "Cerrado"
  return "Próximo"
}

export async function getDirectorTeacherConfigData() {
  const [periods, courses, subjects, teachers, courseAssignments] = await Promise.all([
    prisma.academicPeriod.findMany({
      select: { id: true, name: true, status: true, startDate: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true, order: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: { select: { name: true, email: true, status: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.courseAssignment.findMany({
      select: {
        teacherId: true,
        subjectId: true,
        periodId: true,
        grade: true,
        division: true,
      },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
  ])

  return {
    periods: periods.map((period) => ({
      id: period.id,
      name: period.name,
      status: mapPeriodStatus(period.status),
    })),
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      isActive: teacher.user.status === "ACTIVE",
    })),
    courseAssignments: courseAssignments.map((assignment) => ({
      teacherId: assignment.teacherId,
      courseId: courseIdFromParts(assignment.grade, assignment.division),
      subjectId: assignment.subjectId,
      periodId: assignment.periodId,
    })),
  }
}
