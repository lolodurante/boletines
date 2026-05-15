import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import type { ReportStatus } from "@/lib/data"
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

export async function getDirectorReportHistoryData() {
  const [periods, courses, reportCards] = await Promise.all([
    prisma.academicPeriod.findMany({
      select: { id: true, name: true },
      orderBy: { startDate: "asc" },
    }),
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
        student: { select: { firstName: true, lastName: true, grade: true, division: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return {
    periods,
    courses: courses.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
    })),
    reportHistory: reportCards.map((reportCard) => {
      const status = mapReportStatus(reportCard.status)
      const hasPdf = reportCard.pdfStatus === "GENERATED"

      return {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: `${reportCard.student.lastName}, ${reportCard.student.firstName}`,
        reportType: reportCard.type,
        periodId: reportCard.periodId,
        courseId: courseIdFromParts(reportCard.student.grade, reportCard.student.division),
        courseName: courseNameFromParts(reportCard.student.grade, reportCard.student.division),
        periodName: reportCard.period.name,
        generatedDate: hasPdf ? formatDate(reportCard.updatedAt) : null,
        status,
        hasPdf,
        pdfDownloadUrl: hasPdf ? `/api/report-cards/${reportCard.id}/pdf` : undefined,
      }
    }),
  }
}
