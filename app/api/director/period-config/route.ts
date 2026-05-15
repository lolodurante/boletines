import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorPeriodConfigData } from "@/server/services/director-period-config-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const data = await getDirectorPeriodConfigData()
  return NextResponse.json(data)
}
