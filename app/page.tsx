import { redirect } from "next/navigation"
import { getCurrentAuthUser } from "@/lib/auth/current-user"

export default async function HomePage() {
  const user = await getCurrentAuthUser()
  if (!user) redirect("/login")
  if (user.role === "TEACHER") redirect("/docente/dashboard")
  if (user.role === "PSICOPEDAGOGA") redirect("/psicopedagoga/dashboard")
  redirect("/director/dashboard")
}
