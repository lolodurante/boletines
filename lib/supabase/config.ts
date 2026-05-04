import { env } from "@/lib/env"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseAuthConfigured() {
  return Boolean(
    env.AUTH_PROVIDER === "supabase" &&
      supabaseUrl &&
      supabaseAnonKey,
  )
}

export function isSupabaseAdminConfigured() {
  return Boolean(isSupabaseAuthConfigured() && env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getSupabasePublicConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are not configured")
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}
