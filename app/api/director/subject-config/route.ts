import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorSubjectConfigData } from "@/server/services/director-subject-config-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const data = await getDirectorSubjectConfigData()
  return NextResponse.json(data)
}
