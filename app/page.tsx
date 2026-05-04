import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentAuthUser } from "@/lib/auth/current-user"
import { getInitialPlatformData } from "@/lib/presentation-data"
import { isSupabaseAuthConfigured } from "@/lib/supabase/config"

export default async function HomePage() {
  if (isSupabaseAuthConfigured()) {
    const user = await getCurrentAuthUser()
    if (!user) redirect("/login")
    redirect(user.role === "TEACHER" ? "/docente/dashboard" : "/director/dashboard")
  }

  const { directorUser, currentTeacher } = getInitialPlatformData()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Colegio Labarden</h1>
              <p className="text-xs text-muted-foreground">Sistema de Evaluacion</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Bienvenido al Sistema de Evaluacion
            </h2>
            <p className="text-muted-foreground">
              Selecciona tu perfil para acceder al sistema
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {/* Director Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <Link href="/director/dashboard">
                <CardHeader className="text-center pb-2">
                  <Avatar className="size-16 mx-auto mb-2 sm:size-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {directorUser.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl">{directorUser.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="secondary" className="mt-1">
                      {directorUser.role}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Accede al panel de direccion para gestionar evaluaciones, boletines y configuracion del sistema.
                  </p>
                  <Button className="group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    Ingresar como Director
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {/* Teacher Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <Link href="/docente/dashboard">
                <CardHeader className="text-center pb-2">
                  <Avatar className="size-16 mx-auto mb-2 sm:size-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {currentTeacher.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl">{currentTeacher.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="secondary" className="mt-1">
                      Docente
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Accede al panel docente para cargar calificaciones y gestionar tus cursos asignados.
                  </p>
                  <Button className="group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    Ingresar como Docente
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Sistema de Evaluacion Escolar v1.0 • Colegio Labarden
          </p>
        </div>
      </main>
    </div>
  )
}
