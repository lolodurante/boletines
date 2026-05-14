import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { courseIdFromParts } from "@/lib/academic-course"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { logWarning } from "@/lib/logger"

export const dynamic = "force-dynamic"

const courseActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    grade: z.string().trim().min(1),
    division: z.string().trim().length(1),
  }),
  z.object({
    action: z.literal("delete"),
    courseId: z.string().min(1),
  }),
])

function normalizeCourse(input: { grade: string; division: string }) {
  return {
    grade: input.grade.trim(),
    division: input.division.trim().toUpperCase(),
  }
}

function courseParts(courseId: string) {
  const match = /^c(.+)([a-z])$/i.exec(courseId)
  if (!match) return null
  return { grade: match[1]!, division: match[2]!.toUpperCase() }
}

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = courseActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "add") {
      const course = normalizeCourse(parsed.data)
      await prisma.course.upsert({
        where: { grade_division: course },
        create: course,
        update: { active: true },
      })

      return NextResponse.json({ ok: true, courseId: courseIdFromParts(course.grade, course.division) })
    }

    const course = courseParts(parsed.data.courseId)
    if (!course) return NextResponse.json({ error: "Curso invalido" }, { status: 400 })

    const activeStudents = await prisma.student.count({
      where: { grade: course.grade, division: course.division, status: "ACTIVE" },
    })
    if (activeStudents > 0) {
      return NextResponse.json(
        { error: "No se puede dar de baja un curso con alumnos activos" },
        { status: 409 },
      )
    }

    await prisma.$transaction([
      prisma.courseAssignment.deleteMany({
        where: { grade: course.grade, division: course.division },
      }),
      prisma.course.updateMany({
        where: { grade: course.grade, division: course.division },
        data: { active: false },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    logWarning("Could not update course", {
      reason: error instanceof Error ? error.message : "Unknown course error",
    })
    return NextResponse.json({ error: "No se pudo actualizar el curso" }, { status: 500 })
  }
}
