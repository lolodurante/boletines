import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorReportCardListData } from "@/server/services/director-report-card-service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get("periodId") ?? undefined

  const data = await getDirectorReportCardListData(periodId)
  return NextResponse.json(data)
}
