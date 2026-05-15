import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { normalizeAuthEmail } from "@/lib/auth/email"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

const allowUserSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({
    email: z.string().trim().email().transform(normalizeAuthEmail),
    name: z.string().min(1),
    role: z.enum(["TEACHER", "DIRECTOR", "PSICOPEDAGOGA"]),
  }),
])

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = allowUserSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const input = parsed.data
  const actorRole = auth.user.role
  const user = "userId" in input
    ? await activateExistingUser(input.userId, actorRole)
    : await saveAllowedUser(input, actorRole)

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  if (user === "forbidden") return NextResponse.json({ error: "No podés habilitar un administrador" }, { status: 403 })
  return NextResponse.json({ ok: true, status: "allowed", userId: user.id })
}

type ManagedUserRole = "TEACHER" | "DIRECTOR" | "ADMIN" | "PSICOPEDAGOGA"

function assignmentKey(input: { teacherId: string; subjectId: string; periodId: string; grade: string; division: string }) {
  return `${input.teacherId}:${input.subjectId}:${input.periodId}:${input.grade}:${input.division}`
}

async function removeOpenAssignmentsWithoutEvaluations(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!teacher) return

  const assignments = await prisma.courseAssignment.findMany({
    where: {
      teacherId: teacher.id,
      period: { status: { in: ["DRAFT", "ACTIVE"] } },
    },
    select: {
      id: true,
      teacherId: true,
      subjectId: true,
      periodId: true,
      grade: true,
      division: true,
    },
  })
  if (assignments.length === 0) return

  const evaluations = await prisma.evaluation.findMany({
    where: {
      OR: assignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        subjectId: assignment.subjectId,
        periodId: assignment.periodId,
        student: {
          grade: assignment.grade,
          division: assignment.division,
        },
      })),
    },
    select: {
      teacherId: true,
      subjectId: true,
      periodId: true,
      student: { select: { grade: true, division: true } },
    },
  })
  const assignmentsWithEvaluations = new Set(
    evaluations.map((evaluation) =>
      assignmentKey({
        teacherId: evaluation.teacherId,
        subjectId: evaluation.subjectId,
        periodId: evaluation.periodId,
        grade: evaluation.student.grade,
        division: evaluation.student.division,
      }),
    ),
  )
  const assignmentIdsToRemove = assignments
    .filter((assignment) => !assignmentsWithEvaluations.has(assignmentKey(assignment)))
    .map((assignment) => assignment.id)

  if (assignmentIdsToRemove.length === 0) return

  await prisma.courseAssignment.deleteMany({
    where: { id: { in: assignmentIdsToRemove } },
  })
}

async function syncTeacherAccess(user: { id: string; role: ManagedUserRole }) {
  if (user.role !== "TEACHER") {
    await removeOpenAssignmentsWithoutEvaluations(user.id)
    return
  }

  await prisma.teacher.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })
}

async function activateExistingUser(userId: string, actorRole: ManagedUserRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  if (user.role === "ADMIN" && actorRole !== "ADMIN") return "forbidden" as const

  const activeUser = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  })

  await syncTeacherAccess(activeUser)

  return activeUser
}

async function saveAllowedUser(
  input: { email: string; name: string; role: "TEACHER" | "DIRECTOR" | "PSICOPEDAGOGA" },
  actorRole: ManagedUserRole,
) {
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
  })
  if (existingUser?.role === "ADMIN" && actorRole !== "ADMIN") return "forbidden" as const

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          status: "ACTIVE",
        },
      })
    : await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          status: "ACTIVE",
        },
      })

  await syncTeacherAccess(user)

  return user
}
