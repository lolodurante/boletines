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

async function syncTeacherRecord(user: { id: string; role: "TEACHER" | "DIRECTOR" | "ADMIN" | "PSICOPEDAGOGA" }) {
  if (user.role === "TEACHER") {
    await prisma.teacher.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })
    return
  }

  await prisma.teacher.deleteMany({ where: { userId: user.id } })
}

async function activateExistingUser(userId: string, actorRole: "TEACHER" | "DIRECTOR" | "ADMIN" | "PSICOPEDAGOGA") {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  if (user.role === "ADMIN" && actorRole !== "ADMIN") return "forbidden" as const

  const activeUser = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  })

  await syncTeacherRecord(activeUser)

  return activeUser
}

async function saveAllowedUser(
  input: { email: string; name: string; role: "TEACHER" | "DIRECTOR" | "PSICOPEDAGOGA" },
  actorRole: "TEACHER" | "DIRECTOR" | "ADMIN" | "PSICOPEDAGOGA",
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

  await syncTeacherRecord(user)

  return user
}
