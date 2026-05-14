import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/client"
import { logWarning } from "@/lib/logger"
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

  try {
    await prisma.$transaction(
      parsed.data.order.map(({ id, order }) =>
        prisma.subject.update({ where: { id }, data: { order } }),
      ),
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    logWarning("Could not reorder subjects", {
      reason: error instanceof Error ? error.message : "Unknown subject reorder error",
    })
    return NextResponse.json({ error: "No se pudo guardar el orden" }, { status: 500 })
  }
}
