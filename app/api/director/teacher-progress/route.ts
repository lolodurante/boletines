import { NextResponse } from "next/server"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"
import { getDirectorTeacherProgressData } from "@/server/services/director-teacher-progress-service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const data = await getDirectorTeacherProgressData({
    periodId: searchParams.get("periodId") ?? undefined,
    courseId: searchParams.get("courseId") ?? undefined,
  })

  return NextResponse.json(data)
}
