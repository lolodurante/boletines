import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const criterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
})

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
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
        const savedSubject = isUuid(subject.id)
          ? await tx.subject.upsert({
              where: { id: subject.id },
              create: {
                name: subject.name,
                gradeRange,
              },
              update: {
                name: subject.name,
                gradeRange,
                active: true,
              },
              select: { id: true },
            })
          : await tx.subject.upsert({
              where: { name: subject.name },
              create: {
                name: subject.name,
                gradeRange,
              },
              update: {
                gradeRange,
                active: true,
              },
              select: { id: true },
            })

        const activeCriterionIds: string[] = []
        for (const gradeCriteria of subject.criteriaByGrade) {
          const grade = normalizeGrade(gradeCriteria.grade)

          for (const criterion of gradeCriteria.criteria) {
            const savedCriterion = isUuid(criterion.id)
              ? await tx.evaluationCriterion.upsert({
                  where: { id: criterion.id },
                  create: {
                    subjectId: savedSubject.id,
                    name: criterion.name,
                    description: criterion.description || criterion.name,
                    gradeRange: [grade],
                  },
                  update: {
                    name: criterion.name,
                    description: criterion.description || criterion.name,
                    gradeRange: [grade],
                    active: true,
                  },
                  select: { id: true },
                })
              : await tx.evaluationCriterion.create({
                  data: {
                    subjectId: savedSubject.id,
                    name: criterion.name,
                    description: criterion.description || criterion.name,
                    gradeRange: [grade],
                  },
                  select: { id: true },
                })

            activeCriterionIds.push(savedCriterion.id)
          }
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
