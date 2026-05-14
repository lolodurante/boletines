import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

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

function hasConfiguredDatabase() {
  const url = process.env.DATABASE_URL
  return Boolean(url && !url.includes("localhost:5432/boletines_labarden"))
}

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

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ scales: [], persisted: false })
  }

  const scales = await prisma.gradingScale.findMany({
    include: { levels: { orderBy: { order: "asc" } } },
    orderBy: { gradeFrom: "asc" },
  })

  return NextResponse.json({
    persisted: true,
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

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
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

    const scale = isUuid(input.id)
      ? await prisma.gradingScale.upsert({
          where: { id: input.id },
          create: { name: input.name, gradeFrom, gradeTo },
          update: { name: input.name, gradeFrom, gradeTo },
          select: { id: true },
        })
      : await prisma.gradingScale.upsert({
          where: { name: input.name },
          create: { name: input.name, gradeFrom, gradeTo },
          update: { gradeFrom, gradeTo },
          select: { id: true },
        })

    await prisma.$transaction([
      prisma.gradingScaleLevel.deleteMany({ where: { gradingScaleId: scale.id } }),
      ...input.levels.map((level) =>
        prisma.gradingScaleLevel.create({
          data: {
            gradingScaleId: scale.id,
            label: level.name,
            value: level.name.toUpperCase().replaceAll(" ", "_"),
            order: level.order,
          },
        }),
      ),
    ])

    return NextResponse.json({ ok: true, persisted: true, id: scale.id })
  } catch (error) {
    logWarning("Could not save grading scale", {
      reason: error instanceof Error ? error.message : "Unknown grading scale error",
    })
    return NextResponse.json({ error: "No se pudo guardar la escala" }, { status: 500 })
  }
}
