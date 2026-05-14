import { AppSidebar } from "@/components/app-sidebar"
import { requirePsicopedagoga } from "@/lib/auth/current-user"

export default async function PsicopedagogaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requirePsicopedagoga()

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        role="psicopedagoga"
        userName={user.name}
        userRole="Psicopedagoga"
      />
      <main className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 lg:ml-60 lg:p-6">
        {children}
      </main>
    </div>
  )
}
