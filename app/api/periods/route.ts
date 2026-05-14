import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const PERIOD_SAVE_TRANSACTION_TIMEOUT_MS = 10_000

const periodActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    id: z.string().optional(),
    name: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    teacherDeadline: z.string().min(1),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("archive"),
    id: z.string().min(1),
  }),
])

function parseLocalDate(value: string) {
  const [day, month, year] = value.split("/")
  if (!day || !month || !year) return null

  const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = periodActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "archive") {
      await prisma.academicPeriod.update({
        where: { id: parsed.data.id },
        data: { status: "CLOSED" },
      })
      return NextResponse.json({ ok: true, persisted: true })
    }

    const input = parsed.data
    const startDate = parseLocalDate(input.startDate)
    const dueDate = parseLocalDate(input.endDate)
    const teacherDeadline = parseLocalDate(input.teacherDeadline)
    if (!startDate || !dueDate || !teacherDeadline) {
      return NextResponse.json({ error: "Fechas invalidas" }, { status: 400 })
    }
    if (teacherDeadline > dueDate || startDate > teacherDeadline) {
      return NextResponse.json(
        { error: "El orden de fechas es invalido: inicio ≤ cierre docente ≤ fin de periodo" },
        { status: 400 },
      )
    }

    const period = await prisma.$transaction(
      async (tx) => {
        if (input.active) {
          await tx.academicPeriod.updateMany({
            where: { status: "ACTIVE", ...(input.id ? { id: { not: input.id } } : {}) },
            data: { status: "CLOSED" },
          })
        }

        if (input.id) {
          return tx.academicPeriod.update({
            where: { id: input.id },
            data: {
              name: input.name,
              startDate,
              dueDate,
              teacherDeadline,
              status: input.active ? "ACTIVE" : "DRAFT",
            },
            select: { id: true },
          })
        }

        return tx.academicPeriod.create({
          data: {
            name: input.name,
            type: "TRIMESTER",
            startDate,
            dueDate,
            teacherDeadline,
            status: input.active ? "ACTIVE" : "DRAFT",
          },
          select: { id: true },
        })
      },
      { timeout: PERIOD_SAVE_TRANSACTION_TIMEOUT_MS },
    )

    return NextResponse.json({ ok: true, persisted: true, id: period.id })
  } catch (error) {
    logWarning("Could not update academic period", {
      reason: error instanceof Error ? error.message : "Unknown period update error",
    })
    return NextResponse.json({ error: "No se pudo actualizar el periodo" }, { status: 500 })
  }
}
