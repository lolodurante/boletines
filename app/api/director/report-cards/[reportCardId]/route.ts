import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorReportCardDetail } from "@/server/services/director-report-card-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportCardId: string }> },
) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { reportCardId } = await context.params
  const reportCard = await getDirectorReportCardDetail(reportCardId)
  if (!reportCard) {
    return NextResponse.json({ error: "Boletin no encontrado" }, { status: 404 })
  }

  return NextResponse.json(reportCard)
}
