import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { generateReportCardPdf } from "@/server/services/pdf-service"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const REPORT_CARD_REVISION_TRANSACTION_TIMEOUT_MS = 10_000

const reportCardActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate_pdf"),
    reportCardId: z.string().min(1),
    directorObservation: z.string().optional(),
  }),
  z.object({
    action: z.literal("request_revision"),
    reportCardId: z.string().min(1),
    teacherId: z.string().min(1),
    message: z.string().min(1),
  }),
])

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = reportCardActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "request_revision") {
      const revisionInput = parsed.data
      const reportCard = await prisma.reportCard.findUnique({
        where: { id: revisionInput.reportCardId },
        select: { id: true, studentId: true, periodId: true, type: true },
      })
      if (!reportCard) {
        return NextResponse.json({ error: "Boletin no encontrado" }, { status: 404 })
      }

      const updateResult = await prisma.$transaction(
        async (tx) => {
          const evaluations = await tx.evaluation.updateMany({
            where: {
              studentId: reportCard.studentId,
              periodId: reportCard.periodId,
              teacherId: revisionInput.teacherId,
              subject: { type: reportCard.type },
            },
            data: { status: "NEEDS_REVISION" },
          })
          if (evaluations.count === 0) return evaluations

          await tx.reportCard.update({
            where: { id: revisionInput.reportCardId },
            data: {
              status: "NEEDS_REVISION",
              directorObservation: revisionInput.message,
            },
          })

          return evaluations
        },
        { timeout: REPORT_CARD_REVISION_TRANSACTION_TIMEOUT_MS },
      )
      if (updateResult.count === 0) {
        return NextResponse.json({ error: "El docente seleccionado no tiene evaluaciones en este boletin" }, { status: 400 })
      }

      return NextResponse.json({ ok: true, persisted: true, status: "Requiere revisión" })
    }

    const generateInput = parsed.data
    const reportCard = await prisma.reportCard.findUnique({
      where: { id: generateInput.reportCardId },
      include: {
        student: true,
        period: true,
      },
    })
    if (!reportCard) {
      return NextResponse.json({ error: "Boletin no encontrado" }, { status: 404 })
    }
    if (reportCard.status !== "READY_FOR_REVIEW" && reportCard.status !== "APPROVED") {
      return NextResponse.json({ error: "El boletin todavia no esta listo para generar" }, { status: 400 })
    }

    // Validate that all required course assignments have been submitted
    const courseAssignments = await prisma.courseAssignment.findMany({
      where: {
        grade: reportCard.student.grade,
        division: reportCard.student.division,
        periodId: reportCard.periodId,
        subject: { active: true, type: reportCard.type },
      },
      select: { teacherId: true, subjectId: true },
    })
    if (courseAssignments.length > 0) {
      const evalStatuses = await prisma.evaluation.findMany({
        where: { studentId: reportCard.studentId, periodId: reportCard.periodId },
        select: { teacherId: true, subjectId: true, status: true },
      })
      const hasIncomplete = courseAssignments.some(
        (assignment) =>
          !evalStatuses.some(
            (e) =>
              e.teacherId === assignment.teacherId &&
              e.subjectId === assignment.subjectId &&
              (e.status === "SUBMITTED" || e.status === "APPROVED"),
          ),
      )
      if (hasIncomplete) {
        return NextResponse.json({ error: "El boletin tiene evaluaciones pendientes" }, { status: 400 })
      }
    }

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
    const absenceEvaluations = evaluations.filter(
      (evaluation) => evaluation.subject.entryKind === "ABSENCES" && evaluation.specialValue,
    )
    const commentEvaluations = evaluations.filter((evaluation) => {
      const value = evaluation.subject.entryKind === "TEACHER_OBSERVATION"
        ? evaluation.generalObservation || evaluation.specialValue
        : evaluation.generalObservation

      return Boolean(value)
    })
    if (evaluationsWithGrades.length === 0) {
      return NextResponse.json({ error: "El boletin no tiene evaluaciones completas para generar" }, { status: 400 })
    }

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
        reportCard.type === "INGLES"
          ? absenceEvaluations.map((evaluation) => ({
              label: evaluation.subject.name,
              value: evaluation.specialValue ?? "",
            }))
          : undefined,
      comments:
        reportCard.type === "INGLES"
          ? commentEvaluations.map((evaluation) => ({
              label: evaluation.subject.entryKind === "TEACHER_OBSERVATION"
                ? "Comentario"
                : `Comentario ${evaluation.subject.name}`,
              value: evaluation.generalObservation || evaluation.specialValue || "",
            }))
          : undefined,
      directorObservation: generateInput.directorObservation || undefined,
      branding: {
        primaryColor: "#2563eb",
        secondaryColor: "#64748b",
      },
    })

    await prisma.reportCard.update({
      where: { id: reportCard.id },
      data: {
        status: "APPROVED",
        directorObservation: generateInput.directorObservation || null,
        pdfUrl: pdf.url,
        pdfStatus: "GENERATED",
      },
    })

    return NextResponse.json({
      ok: true,
      persisted: true,
      status: "PDF generado",
      pdfDownloadUrl: `/api/report-cards/${reportCard.id}/pdf`,
    })
  } catch (error) {
    logWarning("Could not update report card", {
      reason: error instanceof Error ? error.message : "Unknown report card action error",
    })
    return NextResponse.json({ error: "No se pudo actualizar el boletin" }, { status: 500 })
  }
}
