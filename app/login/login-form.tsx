"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Chrome, GraduationCap } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

const errorMessages: Record<string, string> = {
  access_denied: "Tu cuenta no esta habilitada para acceder al sistema.",
  auth_error: "No se pudo completar el inicio de sesion.",
}

function getAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, "")
  if (typeof window !== "undefined") return window.location.origin
  return undefined
}

export function LoginForm({
  nextPath,
  authEnabled,
  error,
}: {
  nextPath?: string
  authEnabled: boolean
  error?: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const appOrigin = getAppOrigin()
  const redirectTo = appOrigin ? `${appOrigin}/auth/callback?next=${encodeURIComponent(nextPath || "/")}` : undefined

  async function handleGoogleLogin() {
    if (!authEnabled) {
      router.push(nextPath || "/director/dashboard")
      return
    }

    setIsLoading(true)
    setMessage("")
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    setIsLoading(false)

    if (error) {
      setMessage("No se pudo iniciar sesion con Google.")
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="size-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Sistema de Evaluacion</CardTitle>
            <CardDescription>Colegio Labarden</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authEnabled && (
            <Alert>
              <AlertDescription>
                Auth no esta configurado en este entorno. El acceso local usa modo demo.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessages[error] ?? errorMessages.auth_error}</AlertDescription>
            </Alert>
          )}

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
            <Chrome className="size-4" />
            Ingresar con Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
