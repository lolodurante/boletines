import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const GRADING_SCALE_SAVE_TRANSACTION_TIMEOUT_MS = 10_000

const levelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().positive(),
})

const scaleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    scale: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      appliesTo: z.array(z.string().regex(/^[1-9][0-9]*°?$/)).min(1),
      levels: z.array(levelSchema).min(1),
    }),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().min(1),
  }),
])

function gradeNumber(grade: string) {
  return Number.parseInt(grade.replace("°", ""), 10)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function colorForLabel(label: string) {
  if (label === "Destacado") return "bg-accent"
  if (label === "Logrado") return "bg-success"
  if (label === "En proceso") return "bg-warning"
  if (label === "En inicio") return "bg-destructive"
  return "bg-muted"
}

async function deleteScaleIfUnused(id: string) {
  const scale = await prisma.gradingScale.findUnique({
    where: { id },
    select: {
      levels: { select: { id: true } },
    },
  })

  if (!scale) return

  const levelIds = scale.levels.map((level) => level.id)
  if (levelIds.length > 0) {
    const [referenced, referencedAdapted] = await Promise.all([
      prisma.evaluationGrade.count({ where: { scaleLevelId: { in: levelIds } } }),
      prisma.adaptedEvaluationGrade.count({ where: { scaleLevelId: { in: levelIds } } }),
    ])

    if (referenced + referencedAdapted > 0) {
      throw new Error("SCALE_IN_USE")
    }
  }

  await prisma.gradingScale.delete({ where: { id } })
}

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const scales = await prisma.gradingScale.findMany({
    include: { levels: { orderBy: { order: "asc" } } },
    orderBy: { gradeFrom: "asc" },
  })

  return NextResponse.json({
    scales: scales.map((scale) => ({
      id: scale.id,
      name: scale.name,
      appliesTo: Array.from({ length: scale.gradeTo - scale.gradeFrom + 1 }, (_, index) => `${scale.gradeFrom + index}°`),
      levels: scale.levels.map((level) => ({
        id: level.id,
        name: level.label,
        color: colorForLabel(level.label),
        order: level.order,
      })),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = scaleActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "delete") {
      if (isUuid(parsed.data.id)) {
        await deleteScaleIfUnused(parsed.data.id)
      }
      return NextResponse.json({ ok: true, persisted: true })
    }

    const input = parsed.data.scale
    const grades = input.appliesTo.map(gradeNumber).filter(Number.isFinite)
    if (grades.length !== input.appliesTo.length) {
      return NextResponse.json({ error: "La escala incluye grados invalidos" }, { status: 400 })
    }
    const gradeFrom = Math.min(...grades)
    const gradeTo = Math.max(...grades)

    const scale = await prisma.$transaction(
      async (tx) => {
        const savedScale = isUuid(input.id)
          ? await tx.gradingScale.upsert({
              where: { id: input.id },
              create: { name: input.name, gradeFrom, gradeTo },
              update: { name: input.name, gradeFrom, gradeTo },
              select: { id: true },
            })
          : await tx.gradingScale.upsert({
              where: { name: input.name },
              create: { name: input.name, gradeFrom, gradeTo },
              update: { gradeFrom, gradeTo },
              select: { id: true },
            })

        const existingLevels = await tx.gradingScaleLevel.findMany({
          where: { gradingScaleId: savedScale.id },
          select: { id: true },
        })
        const existingIds = new Set(existingLevels.map((l) => l.id))
        const incomingIds = new Set(input.levels.flatMap((l) => (l.id ? [l.id] : [])))

        const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
        if (toDelete.length > 0) {
          const referenced = await tx.evaluationGrade.count({
            where: { scaleLevelId: { in: toDelete } },
          })
          const referencedAdapted = await tx.adaptedEvaluationGrade.count({
            where: { scaleLevelId: { in: toDelete } },
          })
          if (referenced + referencedAdapted > 0) {
            throw new Error("LEVEL_IN_USE")
          }
          await tx.gradingScaleLevel.deleteMany({ where: { id: { in: toDelete } } })
        }

        for (const level of input.levels) {
          const data = {
            gradingScaleId: savedScale.id,
            label: level.name,
            value: level.name.toUpperCase().replaceAll(" ", "_"),
            order: level.order,
          }
          if (level.id && existingIds.has(level.id)) {
            await tx.gradingScaleLevel.update({ where: { id: level.id }, data })
          } else {
            await tx.gradingScaleLevel.create({ data })
          }
        }

        return savedScale
      },
      { timeout: GRADING_SCALE_SAVE_TRANSACTION_TIMEOUT_MS },
    )

    return NextResponse.json({ ok: true, persisted: true, id: scale.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown grading scale error"
    if (message === "LEVEL_IN_USE") {
      return NextResponse.json(
        { error: "No se pueden eliminar niveles que ya tienen calificaciones asignadas" },
        { status: 409 },
      )
    }
    if (message === "SCALE_IN_USE") {
      return NextResponse.json(
        { error: "No se puede eliminar una escala que ya tiene calificaciones asignadas" },
        { status: 409 },
      )
    }
    logWarning("Could not save grading scale", { reason: message })
    return NextResponse.json({ error: "No se pudo guardar la escala" }, { status: 500 })
  }
}
