import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import type { GradeLevel, ReportStatus } from "@/lib/data"
import { prisma } from "@/lib/db/client"

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR")
}

function mapReportStatus(status: string): ReportStatus {
  if (status === "READY_FOR_REVIEW") return "Listo para revisión"
  if (status === "APPROVED" || status === "SENT") return "PDF generado"
  if (status === "NEEDS_REVISION") return "Requiere revisión"
  return "No listo"
}

export async function getDirectorReportCardListData() {
  const [courses, reportCards] = await Promise.all([
    prisma.course.findMany({
      where: { active: true },
      select: { grade: true, division: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }),
    prisma.reportCard.findMany({
      select: {
        id: true,
        studentId: true,
        periodId: true,
        type: true,
        status: true,
        pdfStatus: true,
        updatedAt: true,
        period: { select: { name: true } },
        student: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            division: true,
          },
        },
      },
      orderBy: [
        { period: { startDate: "desc" } },
        { student: { grade: "asc" } },
        { student: { division: "asc" } },
        { student: { lastName: "asc" } },
      ],
    }),
  ])

  return {
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    reportCards: reportCards.map((reportCard) => {
      const hasPdf = reportCard.pdfStatus === "GENERATED"

      return {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: `${reportCard.student.lastName}, ${reportCard.student.firstName}`,
        periodId: reportCard.periodId,
        periodName: reportCard.period.name,
        reportType: reportCard.type,
        courseId: courseIdFromParts(reportCard.student.grade, reportCard.student.division),
        courseName: courseNameFromParts(reportCard.student.grade, reportCard.student.division),
        completedDate: formatDate(reportCard.updatedAt),
        status: mapReportStatus(reportCard.status),
        hasPdf,
        pdfDownloadUrl: hasPdf ? `/api/report-cards/${reportCard.id}/pdf` : undefined,
      }
    }),
  }
}

export async function getDirectorReportCardDetail(reportCardId: string) {
  const reportCard = await prisma.reportCard.findUnique({
    where: { id: reportCardId },
    select: {
      id: true,
      studentId: true,
      periodId: true,
      type: true,
      status: true,
      directorObservation: true,
      pdfStatus: true,
      updatedAt: true,
      period: { select: { name: true } },
      student: {
        select: {
          firstName: true,
          lastName: true,
          grade: true,
          division: true,
          familyEmail: true,
        },
      },
    },
  })
  if (!reportCard) return null

  const evaluations = await prisma.evaluation.findMany({
    where: {
      studentId: reportCard.studentId,
      periodId: reportCard.periodId,
      status: { in: ["SUBMITTED", "APPROVED"] },
      subject: { active: true, type: reportCard.type },
    },
    include: {
      teacher: { include: { user: true } },
      subject: true,
      grades: {
        where: { criterion: { active: true } },
        include: { criterion: true, scaleLevel: true },
      },
    },
    orderBy: [{ subject: { order: "asc" } }],
  })
  const printableEvaluations = evaluations.filter(
    (evaluation) => evaluation.subject.entryKind !== "TEACHER_OBSERVATION",
  )
  const hasPdf = reportCard.pdfStatus === "GENERATED"

  return {
    id: reportCard.id,
    studentId: reportCard.studentId,
    studentName: `${reportCard.student.lastName}, ${reportCard.student.firstName}`,
    periodId: reportCard.periodId,
    periodName: reportCard.period.name,
    reportType: reportCard.type,
    courseId: courseIdFromParts(reportCard.student.grade, reportCard.student.division),
    courseName: courseNameFromParts(reportCard.student.grade, reportCard.student.division),
    completedDate: formatDate(reportCard.updatedAt),
    status: mapReportStatus(reportCard.status),
    parentEmail: reportCard.student.familyEmail,
    directorObservation: reportCard.directorObservation ?? undefined,
    hasPdf,
    pdfDownloadUrl: hasPdf ? `/api/report-cards/${reportCard.id}/pdf` : undefined,
    grades: printableEvaluations.map((evaluation) => ({
      subjectName: evaluation.subject.name,
      teacherId: evaluation.teacherId,
      teacherName: evaluation.teacher.user.name,
      criteria: evaluation.grades.map((grade) => ({
        name: grade.criterion.name,
        grade: grade.scaleLevel.label as GradeLevel,
      })),
      observation: evaluation.generalObservation ?? undefined,
      specialValue: evaluation.specialValue ?? undefined,
      numericGrade: evaluation.numericGrade ?? undefined,
    })),
  }
}
