import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { generateReportCardPdf } from "@/server/services/pdf-service"
import { sendReportCardEmail } from "@/server/services/email-service"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const reportCardActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
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

function hasConfiguredDatabase() {
  const url = process.env.DATABASE_URL
  return Boolean(url && !url.includes("localhost:5432/boletines_labarden"))
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = reportCardActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    if (parsed.data.action === "request_revision") {
      const revisionInput = parsed.data
      const reportCard = await prisma.reportCard.findUnique({
        where: { id: revisionInput.reportCardId },
        select: { id: true, studentId: true, periodId: true },
      })
      if (!reportCard) {
        return NextResponse.json({ error: "Boletin no encontrado" }, { status: 404 })
      }

      const updateResult = await prisma.$transaction(async (tx) => {
        const evaluations = await tx.evaluation.updateMany({
          where: {
            studentId: reportCard.studentId,
            periodId: reportCard.periodId,
            teacherId: revisionInput.teacherId,
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
      })
      if (updateResult.count === 0) {
        return NextResponse.json({ error: "El docente seleccionado no tiene evaluaciones en este boletin" }, { status: 400 })
      }

      return NextResponse.json({ ok: true, persisted: true, status: "Requiere revisión" })
    }

    const sendInput = parsed.data
    const reportCard = await prisma.reportCard.findUnique({
      where: { id: sendInput.reportCardId },
      include: {
        student: true,
        period: true,
      },
    })
    if (!reportCard) {
      return NextResponse.json({ error: "Boletin no encontrado" }, { status: 404 })
    }
    if (reportCard.status !== "READY_FOR_REVIEW" && reportCard.status !== "APPROVED" && reportCard.status !== "SENT") {
      return NextResponse.json({ error: "El boletin todavia no esta listo para enviar" }, { status: 400 })
    }
    if (!reportCard.student.familyEmail) {
      await prisma.reportCard.update({
        where: { id: reportCard.id },
        data: { status: "BLOCKED_MISSING_EMAIL", zohoUploadStatus: "SKIPPED" },
      })
      return NextResponse.json({ error: "El alumno no tiene correo de tutor" }, { status: 400 })
    }

    // Validate that all required course assignments have been submitted
    const courseAssignments = await prisma.courseAssignment.findMany({
      where: {
        grade: reportCard.student.grade,
        division: reportCard.student.division,
        periodId: reportCard.periodId,
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
        return NextResponse.json({ error: "El boletin tiene evaluaciones pendientes de envio" }, { status: 400 })
      }
    }

    const evaluations = await prisma.evaluation.findMany({
      where: {
        studentId: reportCard.studentId,
        periodId: reportCard.periodId,
      },
      include: {
        teacher: { include: { user: true } },
        subject: true,
        grades: { include: { criterion: true, scaleLevel: true } },
      },
      orderBy: [{ subject: { name: "asc" } }],
    })
    if (evaluations.length === 0 || evaluations.every((evaluation) => evaluation.grades.length === 0)) {
      return NextResponse.json({ error: "El boletin no tiene evaluaciones completas para enviar" }, { status: 400 })
    }

    const pdf = await generateReportCardPdf({
      student: {
        fullName: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
        grade: reportCard.student.grade,
        division: reportCard.student.division,
      },
      period: { name: reportCard.period.name },
      subjects: evaluations.map((evaluation) => ({
        subjectName: evaluation.subject.name,
        teacherName: evaluation.teacher.user.name,
        criteria: evaluation.grades.map((grade) => ({
          name: grade.criterion.name,
          gradeLabel: grade.scaleLevel.label,
          observation: grade.observation ?? undefined,
        })),
        teacherObservation: evaluation.generalObservation ?? undefined,
      })),
      directorObservation: sendInput.directorObservation || undefined,
      branding: {
        primaryColor: "#2563eb",
        secondaryColor: "#64748b",
      },
    })

    const email = await sendReportCardEmail({
      to: reportCard.student.familyEmail,
      studentName: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
      periodName: reportCard.period.name,
      pdfUrl: pdf.url,
      pdfFileName: pdf.fileName,
      pdfBuffer: pdf.buffer,
    })
    const sentAt = new Date()

    const emailDelivered = email.status === "SENT"

    await prisma.$transaction(async (tx) => {
      if (emailDelivered) {
        await tx.reportCard.update({
          where: { id: reportCard.id },
          data: {
            status: "SENT",
            directorObservation: sendInput.directorObservation || null,
            pdfUrl: pdf.url,
            sentAt,
          },
        })

        await tx.reportDelivery.create({
          data: {
            reportCardId: reportCard.id,
            recipientEmail: reportCard.student.familyEmail,
            status: "SENT",
            sentAt,
          },
        })
        return
      }

      await tx.reportDelivery.create({
        data: {
          reportCardId: reportCard.id,
          recipientEmail: reportCard.student.familyEmail,
          status: "FAILED",
          errorMessage: email.errorMessage ?? (email.status === "SKIPPED" ? "Envio real deshabilitado." : "No se pudo enviar el correo."),
        },
      })
    })

    if (!emailDelivered) {
      return NextResponse.json(
        { error: email.errorMessage ?? "No se pudo enviar el correo" },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, persisted: true, status: "Enviado", pdfUrl: pdf.url })
  } catch (error) {
    logWarning("Could not update report card", {
      reason: error instanceof Error ? error.message : "Unknown report card action error",
    })
    return NextResponse.json({ error: "No se pudo actualizar el boletin" }, { status: 500 })
  }
}
