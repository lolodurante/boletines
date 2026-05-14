import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrPsico } from "@/lib/auth/current-user"
import { logWarning } from "@/lib/logger"

export const dynamic = "force-dynamic"

const saveSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    id: z.string().uuid().optional(),
    studentId: z.string().uuid(),
    subjectId: z.string().uuid(),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    order: z.number().int().min(0).optional(),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("mark-student-adapted"),
    studentId: z.string().uuid(),
    isAdapted: z.boolean(),
  }),
])

export async function GET(request: Request) {
  const auth = await requireApiDirectorOrPsico()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")
  const subjectId = searchParams.get("subjectId")

  if (!studentId) {
    return NextResponse.json({ error: "studentId requerido" }, { status: 400 })
  }

  const criteria = await prisma.adaptedCriterion.findMany({
    where: {
      studentId,
      ...(subjectId ? { subjectId } : {}),
      active: true,
    },
    orderBy: [{ subjectId: "asc" }, { order: "asc" }],
  })

  return NextResponse.json(criteria)
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrPsico()
  if (auth.response) return auth.response

  const parsed = saveSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "mark-student-adapted") {
      await prisma.student.update({
        where: { id: parsed.data.studentId },
        data: { isAdapted: parsed.data.isAdapted },
      })
      return NextResponse.json({ ok: true })
    }

    if (parsed.data.action === "delete") {
      await prisma.adaptedCriterion.update({
        where: { id: parsed.data.id },
        data: { active: false },
      })
      return NextResponse.json({ ok: true })
    }

    const { id, studentId, subjectId, name, description, order } = parsed.data

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } })
    if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 })

    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } })
    if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 })

    let nextOrder = order
    if (nextOrder === undefined) {
      const last = await prisma.adaptedCriterion.findFirst({
        where: { studentId, subjectId, active: true },
        orderBy: { order: "desc" },
        select: { order: true },
      })
      nextOrder = (last?.order ?? -1) + 1
    }

    const criterion = id
      ? await prisma.adaptedCriterion.update({
          where: { id },
          data: { name, description, order: nextOrder },
        })
      : await prisma.adaptedCriterion.create({
          data: { studentId, subjectId, name, description, order: nextOrder },
        })

    return NextResponse.json({ ok: true, id: criterion.id })
  } catch (error) {
    logWarning("Could not save adapted criterion", {
      reason: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "No se pudo guardar el criterio" }, { status: 500 })
  }
}
