import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

function isSupabaseConfigured() {
  return Boolean(
    process.env.AUTH_PROVIDER === "supabase" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isProtectedPage = pathname.startsWith("/director") || pathname.startsWith("/docente")
  const isProtectedApi =
    pathname.startsWith("/api/evaluations") ||
    pathname.startsWith("/api/report-cards") ||
    pathname.startsWith("/api/course-assignments") ||
    pathname.startsWith("/api/periods") ||
    pathname.startsWith("/api/subjects") ||
    pathname.startsWith("/api/grading-scales") ||
    pathname.startsWith("/api/auth/")

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (!user && isProtectedApi) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-light-32x32.png|icon-dark-32x32.png|apple-icon.png).*)",
  ],
}
