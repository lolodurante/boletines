import { NextResponse } from "next/server"
import { isSupabaseAuthConfigured } from "@/lib/supabase/config"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL("/login", request.url))
}
