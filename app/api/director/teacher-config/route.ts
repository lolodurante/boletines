import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorTeacherConfigData } from "@/server/services/director-teacher-config-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const data = await getDirectorTeacherConfigData()
  return NextResponse.json(data)
}
