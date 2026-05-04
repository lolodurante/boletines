import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/config"

const disableSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({ email: z.string().email() }),
])

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = disableSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: "userId" in parsed.data ? { id: parsed.data.userId } : { email: parsed.data.email },
    data: { status: "DISABLED" },
  })

  if (user.authUserId && isSupabaseAdminConfigured()) {
    const supabase = createSupabaseAdminClient()
    await supabase.auth.admin.signOut(user.authUserId).catch(() => undefined)
  }

  return NextResponse.json({ ok: true })
}
