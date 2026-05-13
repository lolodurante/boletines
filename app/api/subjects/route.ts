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

function hasConfiguredDatabase() {
  const url = process.env.DATABASE_URL
  return Boolean(url && !url.includes("localhost:5432/boletines_labarden"))
}

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

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    await prisma.$transaction(async (tx) => {
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
    })
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

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const subject of parsed.data.subjects) {
        const gradeRange = subject.appliesTo.map(normalizeGrade)
        const activeGrades = new Set(gradeRange)
        const savedSubject = isUuid(subject.id)
          ? await tx.subject.upsert({
              where: { id: subject.id },
              create: {
                name: subject.name,
                type: subject.reportType,
                gradeRange,
              },
              update: {
                name: subject.name,
                type: subject.reportType,
                gradeRange,
                active: true,
              },
              select: { id: true },
            })
          : await tx.subject.upsert({
              where: { name: subject.name },
              create: {
                name: subject.name,
                type: subject.reportType,
                gradeRange,
              },
              update: {
                type: subject.reportType,
                gradeRange,
                active: true,
              },
              select: { id: true },
            })

        const criteriaByKey = new Map<
          string,
          { id: string; name: string; description?: string; gradeRange: string[] }
        >()
        const activeCriterionIds: string[] = []
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

        for (const criterion of criteriaByKey.values()) {
          const data = {
            subjectId: savedSubject.id,
            name: criterion.name,
            description: criterion.description || criterion.name,
            gradeRange: criterion.gradeRange,
            active: true,
          }
          const savedCriterion = isUuid(criterion.id)
            ? await tx.evaluationCriterion.upsert({
                where: { id: criterion.id },
                create: data,
                update: data,
                select: { id: true },
              })
            : await tx.evaluationCriterion.create({ data, select: { id: true } })

          activeCriterionIds.push(savedCriterion.id)
        }

        await tx.evaluationCriterion.updateMany({
          where: {
            subjectId: savedSubject.id,
            id: { notIn: activeCriterionIds },
          },
          data: { active: false },
        })
      }
    })

    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    logWarning("Could not save subjects", {
      reason: error instanceof Error ? error.message : "Unknown subjects save error",
    })
    return NextResponse.json({ error: "No se pudieron guardar las materias" }, { status: 500 })
  }
}
