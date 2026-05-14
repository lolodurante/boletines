import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const criterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
})

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  reportType: z.enum(["ESPANOL", "INGLES"]).default("ESPANOL"),
  entryKind: z.enum(["ACADEMIC", "TEACHER_OBSERVATION", "ABSENCES"]).default("ACADEMIC"),
  hasNumericGrade: z.boolean().default(false),
  appliesTo: z.array(z.string().min(1)).min(1),
  criteriaByGrade: z.array(
    z.object({
      grade: z.string().min(1),
      criteria: z.array(criterionSchema),
    }),
  ),
})

const subjectsSaveSchema = z.object({
  subjects: z.array(subjectSchema),
})

const SUBJECT_DELETE_TRANSACTION_TIMEOUT_MS = 10_000
const SUBJECTS_SAVE_TRANSACTION_TIMEOUT_MS = 20_000

function normalizeGrade(grade: string) {
  return grade.replace("°", "")
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function DELETE(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.evaluationCriterion.updateMany({
          where: { subjectId: id },
          data: { active: false },
        })
        await tx.courseAssignment.deleteMany({
          where: { subjectId: id },
        })
        await tx.subject.update({
          where: { id },
          data: { active: false },
        })
      },
      { timeout: SUBJECT_DELETE_TRANSACTION_TIMEOUT_MS },
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    logWarning("Could not delete subject", {
      reason: error instanceof Error ? error.message : "Unknown delete error",
    })
    return NextResponse.json({ error: "No se pudo eliminar la materia" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = subjectsSaveSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    const subjectsToSave = parsed.data.subjects.map((subject) => {
      const gradeRange = subject.appliesTo.map(normalizeGrade)
      const activeGrades = new Set(gradeRange)
      const reportType = subject.entryKind === "ABSENCES" ? "INGLES" : subject.reportType
      const hasNumericGrade = subject.entryKind === "ACADEMIC" && subject.hasNumericGrade
      const criteriaByKey = new Map<string, { id: string; name: string; description?: string; gradeRange: string[] }>()

      for (const gradeCriteria of subject.criteriaByGrade) {
        const grade = normalizeGrade(gradeCriteria.grade)
        if (!activeGrades.has(grade)) continue

        for (const criterion of gradeCriteria.criteria) {
          const key = criterion.id
          const existing = criteriaByKey.get(key)
          if (existing) {
            existing.name = criterion.name
            existing.description = criterion.description
            if (!existing.gradeRange.includes(grade)) existing.gradeRange.push(grade)
            continue
          }

          criteriaByKey.set(key, {
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
            gradeRange: [grade],
          })
        }
      }

      return {
        id: subject.id,
        name: subject.name,
        entryKind: subject.entryKind,
        reportType,
        hasNumericGrade,
        gradeRange,
        criteria: Array.from(criteriaByKey.values()),
      }
    })

    await prisma.$transaction(
      async (tx) => {
        for (const subject of subjectsToSave) {
          const savedSubject = isUuid(subject.id)
            ? await tx.subject.upsert({
                where: { id: subject.id },
                create: {
                  name: subject.name,
                  type: subject.reportType,
                  entryKind: subject.entryKind,
                  hasNumericGrade: subject.hasNumericGrade,
                  gradeRange: subject.gradeRange,
                },
                update: {
                  name: subject.name,
                  type: subject.reportType,
                  entryKind: subject.entryKind,
                  hasNumericGrade: subject.hasNumericGrade,
                  gradeRange: subject.gradeRange,
                  active: true,
                },
                select: { id: true },
              })
            : await tx.subject.upsert({
                where: { name: subject.name },
                create: {
                  name: subject.name,
                  type: subject.reportType,
                  entryKind: subject.entryKind,
                  hasNumericGrade: subject.hasNumericGrade,
                  gradeRange: subject.gradeRange,
                },
                update: {
                  type: subject.reportType,
                  entryKind: subject.entryKind,
                  hasNumericGrade: subject.hasNumericGrade,
                  gradeRange: subject.gradeRange,
                  active: true,
                },
                select: { id: true },
              })

          const activeCriterionIds: string[] = []
          const newCriteria: Array<{
            subjectId: string
            name: string
            description: string
            gradeRange: string[]
            active: boolean
          }> = []

          for (const criterion of subject.criteria) {
            const data = {
              subjectId: savedSubject.id,
              name: criterion.name,
              description: criterion.description || criterion.name,
              gradeRange: criterion.gradeRange,
              active: true,
            }
            if (isUuid(criterion.id)) {
              const savedCriterion = await tx.evaluationCriterion.upsert({
                  where: { id: criterion.id },
                  create: data,
                  update: data,
                  select: { id: true },
                })
              activeCriterionIds.push(savedCriterion.id)
            } else {
              newCriteria.push(data)
            }
          }

          await tx.evaluationCriterion.updateMany({
            where: {
              subjectId: savedSubject.id,
              id: { notIn: activeCriterionIds },
            },
            data: { active: false },
          })

          if (newCriteria.length > 0) {
            await tx.evaluationCriterion.createMany({ data: newCriteria })
          }
        }
      },
      { timeout: SUBJECTS_SAVE_TRANSACTION_TIMEOUT_MS },
    )

    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    logWarning("Could not save subjects", {
      reason: error instanceof Error ? error.message : "Unknown subjects save error",
    })
    return NextResponse.json({ error: "No se pudieron guardar las materias" }, { status: 500 })
  }
}
