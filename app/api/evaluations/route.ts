import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiTeacher } from "@/lib/auth/current-user"
import { teacherOwnsAssignment } from "@/lib/auth/assignment-guards"

export const dynamic = "force-dynamic"

const evaluationSaveSchema = z.object({
  courseId: z.string().min(1),
  subjectId: z.string().min(1),
  periodId: z.string().min(1),
  generalObservation: z.string().optional(),
  submit: z.boolean().optional(),
  grades: z.array(
    z.object({
      studentId: z.string().min(1),
      criterionId: z.string().min(1),
      grade: z.string().min(1),
    }),
  ),
  observations: z.record(z.string(), z.string()).optional(),
})

function hasConfiguredDatabase() {
  const url = process.env.DATABASE_URL
  return Boolean(url && !url.includes("localhost:5432/boletines_labarden"))
}

function courseParts(courseId: string) {
  const match = /^c(.+)([a-z])$/i.exec(courseId)
  if (!match) return null

  return {
    grade: match[1]!,
    division: match[2]!.toUpperCase(),
  }
}

export async function POST(request: Request) {
  const auth = await requireApiTeacher()
  if (auth.response) return auth.response

  const parsed = evaluationSaveSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const input = parsed.data
  const teacherId = auth.user.teacherId
  if (!teacherId) return NextResponse.json({ error: "Docente no encontrado" }, { status: 403 })

  const course = courseParts(input.courseId)
  if (!course) {
    return NextResponse.json({ error: "Curso invalido" }, { status: 400 })
  }

  const ownsAssignment = await teacherOwnsAssignment({
    teacherId,
    courseId: input.courseId,
    subjectId: input.subjectId,
    periodId: input.periodId,
  })
  if (!ownsAssignment) {
    return NextResponse.json({ error: "No autorizado para esta asignacion" }, { status: 403 })
  }

  try {
    const period = await prisma.academicPeriod.findUnique({
      where: { id: input.periodId },
      select: { status: true, dueDate: true, teacherDeadline: true },
    })
    if (!period) {
      return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 })
    }
    if (period.status !== "ACTIVE") {
      return NextResponse.json({ error: "El periodo no esta habilitado para carga docente" }, { status: 409 })
    }

    const deadline = period.teacherDeadline ?? period.dueDate
    const deadlineEnd = new Date(deadline)
    deadlineEnd.setHours(23, 59, 59, 999)
    if (Date.now() > deadlineEnd.getTime()) {
      return NextResponse.json({ error: "La fecha limite de carga docente ya vencio" }, { status: 409 })
    }

    const students = await prisma.student.findMany({
      where: {
        grade: course.grade,
        division: course.division,
        status: "ACTIVE",
      },
      select: { id: true },
    })
    const validStudentIds = new Set(students.map((student) => student.id))
    if (validStudentIds.size === 0) {
      return NextResponse.json({ error: "El curso no tiene alumnos cargados" }, { status: 400 })
    }

    const unknownStudentIds = Array.from(new Set(input.grades.map((grade) => grade.studentId))).filter(
      (studentId) => !validStudentIds.has(studentId),
    )
    if (unknownStudentIds.length > 0) {
      return NextResponse.json({ error: "El payload incluye alumnos que no pertenecen al curso" }, { status: 400 })
    }

    const criteria = await prisma.evaluationCriterion.findMany({
      where: {
        subjectId: input.subjectId,
        active: true,
        gradeRange: { has: course.grade },
      },
      select: { id: true },
    })
    const validCriterionIds = new Set(criteria.map((criterion) => criterion.id))
    if (validCriterionIds.size === 0) {
      return NextResponse.json({ error: "La materia no tiene criterios activos para este grado" }, { status: 400 })
    }

    const seenGradeKeys = new Set<string>()
    for (const grade of input.grades) {
      const key = `${grade.studentId}:${grade.criterionId}`
      if (seenGradeKeys.has(key)) {
        return NextResponse.json({ error: "El payload contiene criterios duplicados para un alumno" }, { status: 400 })
      }
      seenGradeKeys.add(key)
      if (!validCriterionIds.has(grade.criterionId)) {
        return NextResponse.json({ error: "El payload incluye criterios invalidos para esta materia y grado" }, { status: 400 })
      }
    }

    if (input.submit) {
      const gradeByStudentCriterion = new Map(input.grades.map((grade) => [`${grade.studentId}:${grade.criterionId}`, grade.grade]))
      for (const studentId of validStudentIds) {
        for (const criterionId of validCriterionIds) {
          const grade = gradeByStudentCriterion.get(`${studentId}:${criterionId}`)
          if (!grade || grade === "No evaluado") {
            return NextResponse.json({ error: "Faltan calificaciones para marcar como completo" }, { status: 400 })
          }
        }
      }
    }

    const requestedLabels = Array.from(
      new Set(input.grades.map((grade) => grade.grade).filter((grade) => grade !== "No evaluado")),
    )
    const scaleLevels = await prisma.gradingScaleLevel.findMany({
      where: { label: { in: requestedLabels } },
      select: { id: true, label: true },
    })
    const scaleLevelByLabel = new Map(scaleLevels.map((level) => [level.label, level.id]))
    const missingLabels = requestedLabels.filter((label) => !scaleLevelByLabel.has(label))
    if (missingLabels.length > 0) {
      return NextResponse.json(
        { error: `Faltan niveles de escala en la DB: ${missingLabels.join(", ")}` },
        { status: 400 },
      )
    }

    const status = input.submit ? "SUBMITTED" : "DRAFT"
    const submittedAt = input.submit ? new Date() : null
    const studentIdsToPersist = new Set<string>()
    input.grades.forEach((grade) => studentIdsToPersist.add(grade.studentId))
    Object.entries(input.observations ?? {}).forEach(([studentId, observation]) => {
      if (validStudentIds.has(studentId) && observation.trim()) studentIdsToPersist.add(studentId)
    })
    if (input.submit) students.forEach((student) => studentIdsToPersist.add(student.id))

    await prisma.$transaction(async (tx) => {
      for (const studentId of studentIdsToPersist) {
        const studentGrades = input.grades.filter((grade) => grade.studentId === studentId)
        const studentObservation = input.observations?.[studentId]?.trim() || null

        const evaluation = await tx.evaluation.upsert({
          where: {
            studentId_teacherId_subjectId_periodId: {
              studentId,
              teacherId,
              subjectId: input.subjectId,
              periodId: input.periodId,
            },
          },
          create: {
            studentId,
            teacherId,
            subjectId: input.subjectId,
            periodId: input.periodId,
            status,
            submittedAt,
            generalObservation: input.generalObservation?.trim() || null,
          },
          update: {
            status,
            submittedAt,
            generalObservation: input.generalObservation?.trim() || null,
          },
          select: { id: true },
        })

        for (const grade of studentGrades) {
          if (grade.grade === "No evaluado") {
            await tx.evaluationGrade.deleteMany({
              where: {
                evaluationId: evaluation.id,
                criterionId: grade.criterionId,
              },
            })
            continue
          }

          const scaleLevelId = scaleLevelByLabel.get(grade.grade)
          if (!scaleLevelId) throw new Error(`Invalid grade label: ${grade.grade}`)

          await tx.evaluationGrade.upsert({
            where: {
              evaluationId_criterionId: {
                evaluationId: evaluation.id,
                criterionId: grade.criterionId,
              },
            },
            create: {
              evaluationId: evaluation.id,
              criterionId: grade.criterionId,
              scaleLevelId,
              observation: studentObservation,
            },
            update: {
              scaleLevelId,
              observation: studentObservation,
            },
          })
        }
      }

      if (input.submit) {
        const allAssignments = await tx.courseAssignment.findMany({
          where: {
            grade: course.grade,
            division: course.division,
            periodId: input.periodId,
            subject: { active: true },
          },
          select: { teacherId: true, subjectId: true, subject: { select: { type: true } } },
        })

        if (allAssignments.length === 0) return

        const submittedEvals = await tx.evaluation.findMany({
          where: {
            studentId: { in: Array.from(validStudentIds) },
            periodId: input.periodId,
            status: { in: ["SUBMITTED", "APPROVED"] },
          },
          select: { studentId: true, teacherId: true, subjectId: true },
        })

        const reportTypes = Array.from(new Set(allAssignments.map((assignment) => assignment.subject.type)))
        for (const reportType of reportTypes) {
          const requiredAssignments = allAssignments.filter((assignment) => assignment.subject.type === reportType)
          const completeStudentIds = Array.from(validStudentIds).filter((studentId) =>
            requiredAssignments.every((assignment) =>
              submittedEvals.some(
                (e) =>
                  e.studentId === studentId &&
                  e.teacherId === assignment.teacherId &&
                  e.subjectId === assignment.subjectId,
              ),
            ),
          )

          for (const studentId of completeStudentIds) {
            const updated = await tx.reportCard.updateMany({
              where: {
                studentId,
                periodId: input.periodId,
                type: reportType,
                status: { in: ["NOT_READY", "NEEDS_REVISION"] },
              },
              data: { status: "READY_FOR_REVIEW" },
            })
            if (updated.count === 0) {
              try {
                await tx.reportCard.create({
                  data: { studentId, periodId: input.periodId, type: reportType, status: "READY_FOR_REVIEW" },
                })
              } catch {
                // ReportCard already exists in a later state (READY_FOR_REVIEW/APPROVED/SENT), leave it.
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    logWarning("Could not save evaluations", {
      reason: error instanceof Error ? error.message : "Unknown evaluation save error",
    })
    return NextResponse.json({ error: "No se pudieron guardar las calificaciones" }, { status: 500 })
  }
}
