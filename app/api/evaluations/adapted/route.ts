import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiTeacher } from "@/lib/auth/current-user"
import { teacherOwnsAssignment } from "@/lib/auth/assignment-guards"
import { coursePartsFromId } from "@/lib/academic-course"

export const dynamic = "force-dynamic"

const ADAPTED_EVALUATION_SAVE_TRANSACTION_TIMEOUT_MS = 20_000

const adaptedEvaluationSchema = z.object({
  courseId: z.string().min(1),
  subjectId: z.string().uuid(),
  periodId: z.string().uuid(),
  submit: z.boolean().optional(),
  grades: z.array(
    z.object({
      studentId: z.string().uuid(),
      adaptedCriterionId: z.string().uuid(),
      grade: z.string().min(1),
    }),
  ),
  observations: z.record(z.string(), z.string()).optional(),
  numericGrades: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
})

export async function GET(request: Request) {
  const auth = await requireApiTeacher()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get("courseId")
  const subjectId = searchParams.get("subjectId")
  const periodId = searchParams.get("periodId")

  if (!courseId || !subjectId || !periodId) {
    return NextResponse.json({ error: "courseId, subjectId y periodId son requeridos" }, { status: 400 })
  }

  const teacherId = auth.user.teacherId
  if (!teacherId) return NextResponse.json({ error: "Docente no encontrado" }, { status: 403 })

  const ownsAssignment = await teacherOwnsAssignment({ teacherId, courseId, subjectId, periodId })
  if (!ownsAssignment) {
    return NextResponse.json({ error: "No autorizado para esta asignacion" }, { status: 403 })
  }

  const course = coursePartsFromId(courseId)
  if (!course) return NextResponse.json({ error: "Curso invalido" }, { status: 400 })

  const students = await prisma.student.findMany({
    where: { grade: course.grade, division: course.division, status: "ACTIVE", isAdapted: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  })

  const studentIds = students.map((s) => s.id)

  const adaptedCriteria = studentIds.length > 0
    ? await prisma.adaptedCriterion.findMany({
        where: { studentId: { in: studentIds }, subjectId, active: true },
        orderBy: { order: "asc" },
      })
    : []

  const evaluations = studentIds.length > 0
    ? await prisma.evaluation.findMany({
        where: { studentId: { in: studentIds }, subjectId, periodId, teacherId },
        include: {
          adaptedGrades: { include: { scaleLevel: true } },
        },
      })
    : []

  return NextResponse.json({
    students: students.map((s) => ({ id: s.id, name: `${s.lastName}, ${s.firstName}` })),
    adaptedCriteriaByStudent: studentIds.map((studentId) => ({
      studentId,
      criteria: adaptedCriteria
        .filter((c) => c.studentId === studentId)
        .map((c) => ({ id: c.id, name: c.name, description: c.description, order: c.order })),
    })),
    evaluations: evaluations.map((ev) => ({
      studentId: ev.studentId,
      status: ev.status,
      numericGrade: ev.numericGrade,
      observation: ev.generalObservation,
      grades: Object.fromEntries(
        ev.adaptedGrades.map((g) => [g.adaptedCriterionId, g.scaleLevel.label]),
      ),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireApiTeacher()
  if (auth.response) return auth.response

  const parsed = adaptedEvaluationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const input = parsed.data
  const teacherId = auth.user.teacherId
  if (!teacherId) return NextResponse.json({ error: "Docente no encontrado" }, { status: 403 })

  const ownsAssignment = await teacherOwnsAssignment({
    teacherId,
    courseId: input.courseId,
    subjectId: input.subjectId,
    periodId: input.periodId,
  })
  if (!ownsAssignment) {
    return NextResponse.json({ error: "No autorizado para esta asignacion" }, { status: 403 })
  }

  const course = coursePartsFromId(input.courseId)
  if (!course) return NextResponse.json({ error: "Curso invalido" }, { status: 400 })

  try {
    const period = await prisma.academicPeriod.findUnique({
      where: { id: input.periodId },
      select: { status: true, dueDate: true, teacherDeadline: true },
    })
    if (!period) return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 })
    if (period.status !== "ACTIVE") {
      return NextResponse.json({ error: "El periodo no esta habilitado para carga docente" }, { status: 409 })
    }

    const deadline = period.teacherDeadline ?? period.dueDate
    const deadlineEnd = new Date(deadline)
    deadlineEnd.setHours(23, 59, 59, 999)
    if (Date.now() > deadlineEnd.getTime()) {
      return NextResponse.json({ error: "La fecha limite de carga docente ya vencio" }, { status: 409 })
    }

    const adaptedStudents = await prisma.student.findMany({
      where: { grade: course.grade, division: course.division, status: "ACTIVE", isAdapted: true },
      select: { id: true },
    })
    const validStudentIds = new Set(adaptedStudents.map((s) => s.id))

    const unknownStudentIds = Array.from(new Set(input.grades.map((g) => g.studentId))).filter(
      (id) => !validStudentIds.has(id),
    )
    if (unknownStudentIds.length > 0) {
      return NextResponse.json({ error: "El payload incluye alumnos no adaptados o no pertenecen al curso" }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { hasNumericGrade: true },
    })
    if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 })

    const adaptedCriteriaIds = await prisma.adaptedCriterion.findMany({
      where: { studentId: { in: Array.from(validStudentIds) }, subjectId: input.subjectId, active: true },
      select: { id: true, studentId: true },
    })
    const validCriterionIds = new Set(adaptedCriteriaIds.map((c) => c.id))

    for (const g of input.grades) {
      if (!validCriterionIds.has(g.adaptedCriterionId)) {
        return NextResponse.json({ error: "Criterio adaptado invalido en el payload" }, { status: 400 })
      }
    }

    if (input.submit) {
      for (const studentId of validStudentIds) {
        const studentCriteria = adaptedCriteriaIds.filter((c) => c.studentId === studentId)
        for (const criterion of studentCriteria) {
          const hasGrade = input.grades.some(
            (g) => g.studentId === studentId && g.adaptedCriterionId === criterion.id && g.grade !== "No evaluado",
          )
          if (!hasGrade) {
            return NextResponse.json({ error: "Faltan calificaciones para marcar como completo" }, { status: 400 })
          }
        }
        if (subject.hasNumericGrade && !input.numericGrades?.[studentId]) {
          return NextResponse.json({ error: "Faltan notas numericas para marcar como completo" }, { status: 400 })
        }
      }
    }

    const requestedLabels = Array.from(
      new Set(input.grades.map((g) => g.grade).filter((g) => g !== "No evaluado")),
    )
    const scaleLevels = await prisma.gradingScaleLevel.findMany({
      where: { label: { in: requestedLabels } },
      select: { id: true, label: true },
    })
    const scaleLevelByLabel = new Map(scaleLevels.map((l) => [l.label, l.id]))

    const status = input.submit ? "SUBMITTED" : "DRAFT"
    const submittedAt = input.submit ? new Date() : null
    const studentIdsToPersist = new Set<string>()
    input.grades.forEach((g) => studentIdsToPersist.add(g.studentId))
    if (input.submit) adaptedStudents.forEach((s) => studentIdsToPersist.add(s.id))
    const gradesByStudent = new Map<string, typeof input.grades>()
    for (const grade of input.grades) {
      const studentGrades = gradesByStudent.get(grade.studentId) ?? []
      studentGrades.push(grade)
      gradesByStudent.set(grade.studentId, studentGrades)
    }

    await prisma.$transaction(
      async (tx) => {
        for (const studentId of studentIdsToPersist) {
          const studentGrades = gradesByStudent.get(studentId) ?? []

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
              generalObservation: input.observations?.[studentId]?.trim() || null,
              numericGrade: subject.hasNumericGrade ? input.numericGrades?.[studentId] ?? null : null,
            },
            update: {
              status,
              submittedAt,
              generalObservation: input.observations?.[studentId]?.trim() || null,
              numericGrade: subject.hasNumericGrade ? input.numericGrades?.[studentId] ?? null : null,
            },
            select: { id: true },
          })

          for (const g of studentGrades) {
            if (g.grade === "No evaluado") {
              await tx.adaptedEvaluationGrade.deleteMany({
                where: { evaluationId: evaluation.id, adaptedCriterionId: g.adaptedCriterionId },
              })
              continue
            }

            const scaleLevelId = scaleLevelByLabel.get(g.grade)
            if (!scaleLevelId) throw new Error(`Invalid grade label: ${g.grade}`)

            await tx.adaptedEvaluationGrade.upsert({
              where: {
                evaluationId_adaptedCriterionId: {
                  evaluationId: evaluation.id,
                  adaptedCriterionId: g.adaptedCriterionId,
                },
              },
              create: { evaluationId: evaluation.id, adaptedCriterionId: g.adaptedCriterionId, scaleLevelId },
              update: { scaleLevelId },
            })
          }
        }
      },
      { timeout: ADAPTED_EVALUATION_SAVE_TRANSACTION_TIMEOUT_MS },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    logWarning("Could not save adapted evaluations", {
      reason: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "No se pudieron guardar las calificaciones" }, { status: 500 })
  }
}
