import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { coursePartsFromId } from "@/lib/academic-course"
import { generateReportCardPdf } from "@/server/services/pdf-service"
import { buildZip, gradeFolder, sanitizeName } from "@/lib/zip/build-zip"

export const dynamic = "force-dynamic"

function pdfBufferFromUrl(pdfUrl: string) {
  const base64 = pdfUrl.replace(/^data:application\/pdf;base64,/, "")
  return Buffer.from(base64, "base64")
}

async function generateMissingPdf(reportCard: {
  id: string
  studentId: string
  periodId: string
  type: "ESPANOL" | "INGLES"
  directorObservation: string | null
  student: { firstName: string; lastName: string; grade: string; division: string }
  period: { name: string }
}) {
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

  const evaluationsWithGrades = evaluations.filter(
    (evaluation) => evaluation.subject.entryKind === "ACADEMIC" && evaluation.grades.length > 0,
  )
  if (evaluationsWithGrades.length === 0) return null

  const absenceEvaluations = evaluations.filter(
    (evaluation) => evaluation.subject.entryKind === "ABSENCES" && evaluation.specialValue,
  )
  const commentEvaluations = evaluations.filter((evaluation) => {
    const value = evaluation.subject.entryKind === "TEACHER_OBSERVATION"
      ? evaluation.generalObservation || evaluation.specialValue
      : evaluation.generalObservation

    return Boolean(value)
  })

  const pdf = await generateReportCardPdf({
    student: {
      fullName: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
      grade: reportCard.student.grade,
      division: reportCard.student.division,
    },
    period: { name: reportCard.period.name },
    subjects: evaluationsWithGrades.map((evaluation) => ({
      subjectName: evaluation.subject.name,
      teacherName: evaluation.teacher.user.name,
      numericGrade: evaluation.subject.hasNumericGrade ? evaluation.numericGrade ?? undefined : undefined,
      criteria: evaluation.grades.map((grade) => ({
        name: grade.criterion.name,
        gradeLabel: grade.scaleLevel.label,
      })),
    })),
    absences:
      absenceEvaluations.length > 0
        ? absenceEvaluations.map((evaluation) => ({
            label: evaluation.subject.name,
            value: evaluation.specialValue ?? "",
          }))
        : undefined,
    comments:
      reportCard.type === "INGLES" && commentEvaluations.length > 0
        ? commentEvaluations.map((evaluation) => ({
            label: evaluation.subject.entryKind === "TEACHER_OBSERVATION"
              ? "Comentario"
              : `Comentario ${evaluation.subject.name}`,
            value: evaluation.generalObservation || evaluation.specialValue || "",
          }))
        : undefined,
    directorObservation: reportCard.directorObservation || undefined,
    branding: {
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
    },
  })

  await prisma.reportCard.update({
    where: { id: reportCard.id },
    data: {
      status: "APPROVED",
      pdfUrl: pdf.url,
      pdfStatus: "GENERATED",
    },
  })

  return pdf.buffer
}

export async function GET(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get("periodId") ?? undefined
  const courseId = searchParams.get("courseId")
  const courseParts = courseId ? coursePartsFromId(courseId) : null

  const reportCards = await prisma.reportCard.findMany({
    where: {
      status: { in: ["READY_FOR_REVIEW", "APPROVED", "SENT"] },
      ...(periodId ? { periodId } : {}),
      ...(courseParts
        ? {
            student: {
              grade: courseParts.grade,
              division: courseParts.division,
            },
          }
        : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true, grade: true, division: true } },
      period: { select: { name: true } },
    },
    orderBy: [
      { student: { grade: "asc" } },
      { student: { division: "asc" } },
      { student: { lastName: "asc" } },
    ],
  })

  if (reportCards.length === 0) {
    return NextResponse.json({ error: "No hay boletines listos para descargar" }, { status: 404 })
  }

  const entries = []
  for (const rc of reportCards) {
    const pdfBuffer = rc.pdfUrl ? pdfBufferFromUrl(rc.pdfUrl) : await generateMissingPdf(rc)
    if (!pdfBuffer) continue

    const studentName = sanitizeName(`${rc.student.lastName} ${rc.student.firstName}`)
    const folder = `${gradeFolder(rc.student.grade)}/${rc.student.division}`
    const reportType = rc.type === "INGLES" ? "ingles" : "espanol"
    const fileName = `${studentName}-${reportType}.pdf`

    entries.push({ path: `${folder}/${fileName}`, data: pdfBuffer })
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "No se pudieron generar boletines para descargar" }, { status: 404 })
  }

  const periodName = reportCards[0]?.period.name ?? "boletines"
  const zipName = `boletines-${sanitizeName(periodName).replace(/\s+/g, "-").toLowerCase()}.zip`

  const zip = buildZip(entries)

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Content-Length": String(zip.length),
    },
  })
}
