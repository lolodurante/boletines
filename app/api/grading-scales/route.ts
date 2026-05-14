import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const GRADING_SCALE_SAVE_TRANSACTION_TIMEOUT_MS = 10_000

const levelSchema = z.object({
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
        await prisma.gradingScale.delete({ where: { id: parsed.data.id } })
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

        await tx.gradingScaleLevel.deleteMany({ where: { gradingScaleId: savedScale.id } })
        await tx.gradingScaleLevel.createMany({
          data: input.levels.map((level) => ({
            gradingScaleId: savedScale.id,
            label: level.name,
            value: level.name.toUpperCase().replaceAll(" ", "_"),
            order: level.order,
          })),
        })

        return savedScale
      },
      { timeout: GRADING_SCALE_SAVE_TRANSACTION_TIMEOUT_MS },
    )

    return NextResponse.json({ ok: true, persisted: true, id: scale.id })
  } catch (error) {
    logWarning("Could not save grading scale", {
      reason: error instanceof Error ? error.message : "Unknown grading scale error",
    })
    return NextResponse.json({ error: "No se pudo guardar la escala" }, { status: 500 })
  }
}
