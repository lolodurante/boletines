import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/config"

const inviteSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["TEACHER", "DIRECTOR", "PSICOPEDAGOGA"]),
  }),
])

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = inviteSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const input = parsed.data
  const user = "userId" in input
    ? await prisma.user.findUnique({ where: { id: input.userId } })
    : await prisma.user.upsert({
        where: { email: input.email },
        create: { email: input.email, name: input.name, role: input.role, status: "INVITED" },
        update: { name: input.name, role: input.role, status: "INVITED" },
      })

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  if (user.authUserId && user.status === "ACTIVE") {
    return NextResponse.json({ ok: true, status: "already_active" })
  }

  if (isSupabaseAdminConfigured()) {
    const supabase = createSupabaseAdminClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/callback`
    const { error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
      redirectTo,
      data: { role: user.role, localUserId: user.id },
    })
    if (error) {
      return NextResponse.json({ error: "No se pudo enviar la invitacion" }, { status: 502 })
    }
  }

  return NextResponse.json({ ok: true, status: "invited" })
}
