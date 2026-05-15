import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorReportCardListData } from "@/server/services/director-report-card-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const data = await getDirectorReportCardListData()
  return NextResponse.json(data)
}
