import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorReportHistoryData } from "@/server/services/director-report-history-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const data = await getDirectorReportHistoryData()
  return NextResponse.json(data)
}
