import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import { prisma } from "@/lib/db/client"

const GRADES = ["1", "2", "3", "4", "5", "6"]

export async function getAdaptedStudentsConfigData() {
  const [students, courses, subjects] = await Promise.all([
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, grade: true, division: true, familyEmail: true, isAdapted: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true, gradeRange: true, order: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ])

  const mappedStudents = students.map((student) => ({
    id: student.id,
    name: `${student.lastName}, ${student.firstName}`,
    courseId: courseIdFromParts(student.grade, student.division),
    parentEmail: student.familyEmail,
    isAdapted: student.isAdapted,
  }))

  return {
    adaptedStudents: mappedStudents.filter((student) => student.isAdapted).map(({ isAdapted: _isAdapted, ...student }) => student),
    students: mappedStudents.filter((student) => !student.isAdapted).map(({ isAdapted: _isAdapted, ...student }) => student),
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      appliesTo: (subject.gradeRange.length > 0 ? subject.gradeRange : GRADES).map((grade) => `${grade}°`),
    })),
  }
}
