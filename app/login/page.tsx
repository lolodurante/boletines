import { redirect } from "next/navigation"
import { isSupabaseAuthConfigured } from "@/lib/supabase/config"
import { getCurrentAuthUser } from "@/lib/auth/current-user"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams

  if (isSupabaseAuthConfigured()) {
    const user = await getCurrentAuthUser()
    if (user?.role === "TEACHER") redirect("/docente/dashboard")
    if (user?.role === "DIRECTOR" || user?.role === "ADMIN") redirect("/director/dashboard")
  }

  return <LoginForm nextPath={params.next} authEnabled={isSupabaseAuthConfigured()} error={params.error} />
}
