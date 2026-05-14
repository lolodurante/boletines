import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { coursePartsFromId } from "@/lib/academic-course"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { logWarning } from "@/lib/logger"

export const dynamic = "force-dynamic"

const studentActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    id: z.string().optional(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    courseId: z.string().min(1),
    familyEmail: z.string().trim().email().optional().or(z.literal("")),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().min(1),
  }),
])

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = studentActionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "delete") {
      await prisma.student.update({
        where: { id: parsed.data.id },
        data: { status: "INACTIVE" },
      })
      return NextResponse.json({ ok: true })
    }

    const course = coursePartsFromId(parsed.data.courseId)
    if (!course) return NextResponse.json({ error: "Curso invalido" }, { status: 400 })

    const courseExists = await prisma.course.findFirst({
      where: { grade: course.grade, division: course.division, active: true },
      select: { id: true },
    })
    if (!courseExists) {
      return NextResponse.json({ error: "El curso no existe o esta dado de baja" }, { status: 400 })
    }

    const data = {
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      grade: course.grade,
      division: course.division,
      familyEmail: parsed.data.familyEmail?.trim() || null,
      status: "ACTIVE" as const,
    }

    const student = parsed.data.id
      ? await prisma.student.update({ where: { id: parsed.data.id }, data })
      : await prisma.student.create({ data })

    return NextResponse.json({ ok: true, studentId: student.id })
  } catch (error) {
    logWarning("Could not update student", {
      reason: error instanceof Error ? error.message : "Unknown student error",
    })
    return NextResponse.json({ error: "No se pudo actualizar el alumno" }, { status: 500 })
  }
}

