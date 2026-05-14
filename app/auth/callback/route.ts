import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { normalizeAuthEmail } from "@/lib/auth/email"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const rawNext = url.searchParams.get("next") ?? "/"
  // Reject absolute URLs and protocol-relative paths to prevent open redirect
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : "/"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_error", url.origin))
    }

    const { data, error: userError } = await supabase.auth.getUser()
    const authUser = data.user
    if (userError || !authUser?.email) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?error=auth_error", url.origin))
    }
    const email = normalizeAuthEmail(authUser.email)

    const localUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    })

    if (!localUser || localUser.status === "DISABLED") {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?error=access_denied", url.origin))
    }

    if (!localUser.authUserId || localUser.authUserId !== authUser.id || localUser.status === "INVITED") {
      await prisma.user.update({
        where: { id: localUser.id },
        data: {
          authUserId: authUser.id,
          status: "ACTIVE",
        },
      })
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
