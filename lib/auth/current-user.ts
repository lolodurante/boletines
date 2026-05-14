import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/client"
import type { AuthUser } from "@/lib/auth/roles"
import { normalizeAuthEmail } from "@/lib/auth/email"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export interface CurrentAuthUser extends AuthUser {
  name: string
  email: string
  status: "INVITED" | "ACTIVE" | "DISABLED"
}

export async function getCurrentAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  const authUser = data.user
  if (error) {
    if (error.code === "refresh_token_not_found" || error.status === 400) {
      await supabase.auth.signOut()
    }
    return null
  }
  if (!authUser?.email) return null
  const email = normalizeAuthEmail(authUser.email)

  const localUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
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

export async function requireAuthUser() {
  const user = await getCurrentAuthUser()
  if (!user) redirect("/login")
  return user
}

export async function requireDirectorOrAdmin() {
  const user = await requireAuthUser()
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN") {
    if (user.role === "TEACHER") redirect("/docente/dashboard")
    if (user.role === "PSICOPEDAGOGA") redirect("/psicopedagoga/dashboard")
    redirect("/login")
  }
  return user
}

export async function requireTeacher() {
  const user = await requireAuthUser()
  if (user.role !== "TEACHER" || !user.teacherId) {
    if (user.role === "DIRECTOR" || user.role === "ADMIN") redirect("/director/dashboard")
    if (user.role === "PSICOPEDAGOGA") redirect("/psicopedagoga/dashboard")
    redirect("/login")
  }
  return user
}

export async function requirePsicopedagoga() {
  const user = await requireAuthUser()
  if (user.role !== "PSICOPEDAGOGA") {
    if (user.role === "DIRECTOR" || user.role === "ADMIN") redirect("/director/dashboard")
    if (user.role === "TEACHER") redirect("/docente/dashboard")
    redirect("/login")
  }
  return user
}

export async function requireApiAuthUser() {
  const user = await getCurrentAuthUser()
  if (!user) {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 401 }) }
  }

  return { user, response: null }
}

export async function requireApiDirectorOrAdmin() {
  const { user, response } = await requireApiAuthUser()
  if (response) return { user: null, response }
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN") {
    return {
      user: null,
      response: Response.json({ error: "Tu usuario no tiene permisos de Director o Administrador" }, { status: 403 }),
    }
  }
  return { user, response: null }
}

export async function requireApiTeacher() {
  const { user, response } = await requireApiAuthUser()
  if (response) return { user: null, response }
  if (user.role !== "TEACHER" || !user.teacherId) {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function requireApiPsicopedagoga() {
  const { user, response } = await requireApiAuthUser()
  if (response) return { user: null, response }
  if (user.role !== "PSICOPEDAGOGA") {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function requireApiDirectorOrPsico() {
  const { user, response } = await requireApiAuthUser()
  if (response) return { user: null, response }
  if (user.role !== "DIRECTOR" && user.role !== "ADMIN" && user.role !== "PSICOPEDAGOGA") {
    return { user: null, response: Response.json({ error: "No autorizado" }, { status: 403 }) }
  }
  return { user, response: null }
}
