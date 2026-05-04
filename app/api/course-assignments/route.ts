import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const assignmentActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    teacherId: z.string().min(1),
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    periodId: z.string().min(1),
  }),
  z.object({
    action: z.literal("remove"),
    teacherId: z.string().min(1),
    courseId: z.string().min(1),
    subjectId: z.string().min(1),
    periodId: z.string().min(1),
  }),
])

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
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = assignmentActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  if (!hasConfiguredDatabase()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const input = parsed.data
  const course = courseParts(input.courseId)
  if (!course) {
    return NextResponse.json({ error: "Curso invalido" }, { status: 400 })
  }

  try {
    if (input.action === "remove") {
      await prisma.courseAssignment.deleteMany({
        where: {
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          periodId: input.periodId,
          grade: course.grade,
          division: course.division,
        },
      })
      return NextResponse.json({ ok: true, persisted: true })
    }

    await prisma.courseAssignment.upsert({
      where: {
        teacherId_subjectId_grade_division_periodId: {
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          periodId: input.periodId,
          grade: course.grade,
          division: course.division,
        },
      },
      create: {
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        periodId: input.periodId,
        grade: course.grade,
        division: course.division,
      },
      update: {},
    })

    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    logWarning("Could not update course assignment", {
      reason: error instanceof Error ? error.message : "Unknown course assignment error",
    })
    return NextResponse.json({ error: "No se pudo actualizar la asignacion" }, { status: 500 })
  }
}
