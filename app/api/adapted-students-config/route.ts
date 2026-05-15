import { NextResponse } from "next/server"
import { requireApiDirectorOrPsico } from "@/lib/auth/current-user"
import { getAdaptedStudentsConfigData } from "@/server/services/adapted-students-config-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiDirectorOrPsico()
  if (auth.response) return auth.response

  const data = await getAdaptedStudentsConfigData()
  return NextResponse.json(data)
}
