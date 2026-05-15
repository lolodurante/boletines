import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import { prisma } from "@/lib/db/client"

export async function getDirectorStudentConfigData() {
  const [courses, students] = await Promise.all([
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE", isAdapted: false },
      select: { id: true, firstName: true, lastName: true, grade: true, division: true, familyEmail: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ])

  return {
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
      studentCount: students.filter((student) => student.grade === course.grade && student.division === course.division).length,
    })),
    students: students.map((student) => ({
      id: student.id,
      name: `${student.lastName}, ${student.firstName}`,
      courseId: courseIdFromParts(student.grade, student.division),
      parentEmail: student.familyEmail,
    })),
  }
}
