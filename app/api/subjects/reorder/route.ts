import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

const schema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), order: z.number().int().min(0) })),
})

export async function POST(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 400 })

  await prisma.$transaction(
    parsed.data.order.map(({ id, order }) =>
      prisma.subject.update({ where: { id }, data: { order } }),
    ),
  )

  return NextResponse.json({ ok: true })
}
