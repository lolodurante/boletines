import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/client"
import type { AuthUser } from "@/lib/auth/roles"
import { isSupabaseAuthConfigured } from "@/lib/supabase/config"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getInitialPlatformData } from "@/lib/presentation-data"

export interface CurrentAuthUser extends AuthUser {
  name: string
  email: string
  status: "INVITED" | "ACTIVE" | "DISABLED"
}

function demoUserForRole(role: "DIRECTOR" | "TEACHER" | "PSICOPEDAGOGA" = "DIRECTOR"): CurrentAuthUser {
  const data = getInitialPlatformData()
  if (role === "TEACHER") {
    return {
      id: data.currentTeacher.id,
      teacherId: data.currentTeacher.id,
      role: "TEACHER",
      name: data.currentTeacher.name,
      email: data.currentTeacher.email,
      status: "ACTIVE",
    }
  }

  if (role === "PSICOPEDAGOGA") {
    return {
      id: "demo-psicopedagoga",
      role: "PSICOPEDAGOGA",
      name: "Demo Psicopedagoga",
      email: "psicopedagoga@demo.local",
      status: "ACTIVE",
    }
  }

  return {
    id: "demo-director",
    role: "DIRECTOR",
    name: data.directorUser.name,
    email: data.directorUser.email,
    status: "ACTIVE",
  }
}

export function authFallbackEnabled() {
  return process.env.NODE_ENV !== "production" && !isSupabaseAuthConfigured()
}

export async function getCurrentAuthUser(options?: { fallbackRole?: "DIRECTOR" | "TEACHER" | "PSICOPEDAGOGA" }) {
  if (authFallbackEnabled()) {
    return demoUserForRole(options?.fallbackRole ?? "DIRECTOR")
  }

  if (!isSupabaseAuthConfigured()) return null

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  const authUser = data.user
  if (error || !authUser?.email) return null

  const localUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: { teacher: true },
  })
  if (!localUser || localUser.status === "DISABLED") return null

  if (!localUser.authUserId || localUser.authUserId !== authUser.id || localUser.status === "INVITED") {
    await prisma.user.update({
      where: { id: localUser.id },
      data: {
        authUserId: authUser.id,
        status: "ACTIVE",
      },
    })
  }

  return {
    id: localUser.id,
    role: localUser.role,
    teacherId: localUser.teacher?.id,
    name: localUser.name,
    email: localUser.email,
    status: localUser.status === "INVITED" ? "ACTIVE" : localUser.status,
  } satisfies CurrentAuthUser
}

export async function requireAuthUser(options?: { fallbackRole?: "DIRECTOR" | "TEACHER" | "PSICOPEDAGOGA" }) {
  const user = await getCurrentAuthUser(options)
  if (!user) redirect("/login")
  return user
}

export async function requireDirectorOrAdmin() {
  const user = await requireAuthUser({ fallbackRole: "DIRECTOR" })
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN") {
    if (user.role === "TEACHER") redirect("/docente/dashboard")
    if (user.role === "PSICOPEDAGOGA") redirect("/psicopedagoga/dashboard")
    redirect("/login")
  }
  return user
}

export async function requireTeacher() {
  const user = await requireAuthUser({ fallbackRole: "TEACHER" })
  if (user.role !== "TEACHER" || !user.teacherId) {
    if (user.role === "DIRECTOR" || user.role === "ADMIN") redirect("/director/dashboard")
    if (user.role === "PSICOPEDAGOGA") redirect("/psicopedagoga/dashboard")
    redirect("/login")
  }
  return user
}

export async function requirePsicopedagoga() {
  const user = await requireAuthUser({ fallbackRole: "PSICOPEDAGOGA" })
  if (user.role !== "PSICOPEDAGOGA") {
    if (user.role === "DIRECTOR" || user.role === "ADMIN") redirect("/director/dashboard")
    if (user.role === "TEACHER") redirect("/docente/dashboard")
    redirect("/login")
  }
  return user
}

export async function requireApiAuthUser(options?: { fallbackRole?: "DIRECTOR" | "TEACHER" | "PSICOPEDAGOGA" }) {
  const user = await getCurrentAuthUser(options)
  if (!user) {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 401 }) }
  }

  return { user, response: null }
}

export async function requireApiDirectorOrAdmin() {
  const { user, response } = await requireApiAuthUser({ fallbackRole: "DIRECTOR" })
  if (response) return { user: null, response }
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN") {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function requireApiTeacher() {
  const { user, response } = await requireApiAuthUser({ fallbackRole: "TEACHER" })
  if (response) return { user: null, response }
  if (user.role !== "TEACHER" || !user.teacherId) {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function requireApiPsicopedagoga() {
  const { user, response } = await requireApiAuthUser({ fallbackRole: "PSICOPEDAGOGA" })
  if (response) return { user: null, response }
  if (user.role !== "PSICOPEDAGOGA") {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}
