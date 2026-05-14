import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

const schema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().trim().email().optional(),
}).refine((value) => value.userId || value.email, {
  message: "userId o email es requerido",
})

export async function POST(request: NextRequest) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const { userId, email } = parsed.data

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.id === auth.user.id) {
    return NextResponse.json({ error: "No podés desactivar tu propio usuario" }, { status: 400 })
  }

  if (user.role === "ADMIN" && auth.user!.role !== "ADMIN") {
    return NextResponse.json({ error: "No podés desactivar un administrador" }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { status: "DISABLED" },
  })

  return NextResponse.json({ ok: true })
}
