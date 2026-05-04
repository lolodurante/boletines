import { AppSidebar } from "@/components/app-sidebar"
import { requireDirectorOrAdmin } from "@/lib/auth/current-user"

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireDirectorOrAdmin()

  return (
    <div className="flex min-h-screen">
      <AppSidebar 
        role="director" 
        userName={user.name} 
        userRole={user.role === "ADMIN" ? "Administrador" : "Director"} 
      />
      <main className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 lg:ml-60 lg:p-6">
        {children}
      </main>
    </div>
  )
}
