import { NextResponse } from "next/server"
import { getPlatformData } from "@/server/services/platform-data-service"
import { requireApiAuthUser } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireApiAuthUser()
  if (auth.response) return auth.response

  const data = await getPlatformData(auth.user)
  return NextResponse.json(data)
}
