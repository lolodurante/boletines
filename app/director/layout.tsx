import { AppSidebar } from "@/components/app-sidebar"
import { requireDirectorOrAdmin } from "@/lib/auth/current-user"
import { prisma } from "@/lib/db/client"

export const dynamic = "force-dynamic"

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireDirectorOrAdmin()
  const pendingReportCount = await prisma.reportCard.count({
    where: { status: "READY_FOR_REVIEW" },
  })

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        role="director"
        userName={user.name}
        userRole={user.role === "ADMIN" ? "Administrador" : "Director"}
        pendingReportCount={pendingReportCount}
      />
      <main className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 lg:ml-60 lg:p-6">
        {children}
      </main>
    </div>
  )
}
