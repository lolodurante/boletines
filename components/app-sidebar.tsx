"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Home,
  LayoutGrid,
  History,
  FileText,
  BarChart2,
  Settings,
  BookOpen,
  ClipboardList,
  ChevronDown,
  LogOut,
  GraduationCap,
  Menu
} from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  children?: { label: string; href: string }[]
}

const directorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/director/dashboard", icon: Home },
  { label: "Seguimiento", href: "/director/evaluaciones", icon: LayoutGrid },
  {
    label: "Boletines",
    href: "/director/boletines",
    icon: FileText,
    children: [
      { label: "Generar boletines", href: "/director/boletines" },
      { label: "Historial", href: "/director/historial" },
    ]
  },
  { label: "Estadísticas", href: "/director/estadisticas", icon: BarChart2 },
  {
    label: "Configuración",
    href: "/director/configuracion",
    icon: Settings,
    children: [
      { label: "Escalas de calificación", href: "/director/configuracion/escalas" },
      { label: "Materias y criterios", href: "/director/configuracion/materias" },
      { label: "Orden de boletines", href: "/director/configuracion/orden-boletines" },
      { label: "Períodos", href: "/director/configuracion/periodos" },
      { label: "Docentes y asignaciones", href: "/director/configuracion/docentes" },
      { label: "Cursos y alumnos", href: "/director/configuracion/alumnos" },
      { label: "Alumnos con adaptación", href: "/director/configuracion/alumnos-adaptados" },
      { label: "Usuarios", href: "/director/configuracion/usuarios" },
    ]
  },
]

const teacherNavItems: NavItem[] = [
  { label: "Inicio", href: "/docente/dashboard", icon: Home },
  { label: "Mis cursos", href: "/docente/cursos", icon: BookOpen },
  { label: "Calificaciones", href: "/docente/calificaciones", icon: ClipboardList },
  { label: "Alumnos adaptados", href: "/docente/calificaciones/adaptados", icon: GraduationCap },
]

const psicopedagogaNavItems: NavItem[] = [
  { label: "Alumnos", href: "/psicopedagoga/dashboard", icon: GraduationCap },
  { label: "Adaptaciones curriculares", href: "/psicopedagoga/adaptaciones", icon: ClipboardList },
]

interface AppSidebarProps {
  role: "director" | "docente" | "psicopedagoga"
  userName: string
  userRole: string
  pendingReportCount?: number
}

export function AppSidebar({ role, userName, userRole, pendingReportCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const navItems = role === "director" ? directorNavItems : role === "psicopedagoga" ? psicopedagogaNavItems : teacherNavItems
  const [openCollapsibles, setOpenCollapsibles] = useState<string[]>([])
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleCollapsible = (label: string) => {
    setOpenCollapsibles(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((item) => (
        <li key={item.label}>
          {item.children ? (
            <Collapsible
              open={openCollapsibles.includes(item.label) || item.children.some(c => isActive(c.href))}
              onOpenChange={() => toggleCollapsible(item.label)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    item.children.some(c => isActive(c.href)) && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="ml-7 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive(child.href)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80"
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : ""
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {role === "director" && item.label === "Boletines" && pendingReportCount > 0 && (
                <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {pendingReportCount}
                </Badge>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )

  const Brand = () => (
    <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent">
          <GraduationCap className="size-5 text-sidebar-accent-foreground" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold tracking-tight">Colegio Labarden</span>
          <span className="text-xs text-sidebar-foreground/70">Sistema de Evaluacion</span>
        </div>
      </div>
  )

  const UserSection = () => (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
            {userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{userName}</span>
          <Badge variant="secondary" className="mt-0.5 w-fit bg-sidebar-accent text-sidebar-accent-foreground text-xs">
            {userRole}
          </Badge>
        </div>
        <form action="/logout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Cerrar sesion</span>
          </Button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground lg:hidden">
        <Brand />
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[min(20rem,86vw)] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="border-b border-sidebar-border p-4 text-left">
              <SheetTitle className="text-sidebar-foreground">
                <Brand />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <NavList onNavigate={() => setIsMobileOpen(false)} />
            </nav>
            <UserSection />
          </SheetContent>
        </Sheet>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <Brand />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </nav>

        <UserSection />
      </aside>
    </>
  )
}
