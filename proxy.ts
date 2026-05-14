import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const INVALID_REFRESH_TOKEN_CODES = new Set(["refresh_token_not_found", "invalid_refresh_token"])

function isSupabaseConfigured() {
  return Boolean(
    process.env.AUTH_PROVIDER === "supabase" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token")
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(({ name }) => {
    if (!isSupabaseAuthCookie(name)) return

    request.cookies.delete(name)
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
    })
  })
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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  const hasInvalidRefreshToken = Boolean(error?.code && INVALID_REFRESH_TOKEN_CODES.has(error.code))
  if (hasInvalidRefreshToken) {
    clearSupabaseAuthCookies(request, response)
  }

  const pathname = request.nextUrl.pathname
  const isProtectedPage =
    pathname.startsWith("/director") || pathname.startsWith("/docente") || pathname.startsWith("/psicopedagoga")
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
    const redirectResponse = NextResponse.redirect(url)
    if (hasInvalidRefreshToken) {
      clearSupabaseAuthCookies(request, redirectResponse)
    }
    return redirectResponse
  }

  if (!user && isProtectedApi) {
    const unauthorizedResponse = NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if (hasInvalidRefreshToken) {
      clearSupabaseAuthCookies(request, unauthorizedResponse)
    }
    return unauthorizedResponse
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-light-32x32.png|icon-dark-32x32.png|apple-icon.png).*)",
  ],
}
