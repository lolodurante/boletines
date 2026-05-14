import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

const schema = z.object({
  userId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const { userId } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "ADMIN" && auth.user!.role !== "ADMIN") {
    return NextResponse.json({ error: "No podés habilitar un administrador" }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "INVITED" },
  })

  return NextResponse.json({ ok: true })
}
