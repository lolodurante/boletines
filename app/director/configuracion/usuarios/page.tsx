"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/domain"

type UserStatus = "INVITED" | "ACTIVE" | "DISABLED"

interface UserRow {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

const roleLabel: Record<UserRole, string> = {
  DIRECTOR: "Director",
  ADMIN: "Administrador",
  TEACHER: "Docente",
  PSICOPEDAGOGA: "Psicopedagoga",
}

const statusLabel: Record<UserStatus, string> = {
  INVITED: "Habilitado",
  ACTIVE: "Habilitado",
  DISABLED: "Desactivado",
}

const statusVariant = (status: UserStatus): "default" | "secondary" | "outline" | "destructive" => {
  if (status === "ACTIVE") return "default"
  if (status === "INVITED") return "secondary"
  return "outline"
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("TEACHER")

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch {
      toast.error("No se pudo cargar la lista de usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || isCreating) return

    setIsCreating(true)
    try {
      const res = await fetch("/api/auth/allow-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim(), role: newRole }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? "No se pudo crear el usuario")
        return
      }

      toast.success("Usuario habilitado")
      setIsCreateOpen(false)
      setNewName("")
      setNewEmail("")
      setNewRole("TEACHER")
      fetchUsers()
    } finally {
      setIsCreating(false)
    }
  }

  const handleDisable = async (user: UserRow) => {
    if (actioningId) return
    setActioningId(user.id)
    try {
      const res = await fetch("/api/auth/disable-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? "No se pudo desactivar el usuario")
        return
      }

      toast.success("Acceso desactivado")
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: "DISABLED" } : u)),
      )
    } finally {
      setActioningId(null)
    }
  }

  const handleEnable = async (user: UserRow) => {
    if (actioningId) return
    setActioningId(user.id)
    try {
      const res = await fetch("/api/auth/enable-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? "No se pudo habilitar el usuario")
        return
      }

      toast.success("Usuario habilitado")
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: "ACTIVE" } : u)),
      )
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestión de usuarios"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuración" },
          { label: "Usuarios" },
        ]}
      />

      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-2" />
              Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription>
                El usuario quedará habilitado y podrá ingresar con su cuenta autorizada.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@labarden.edu.ar"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Rol</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">Docente</SelectItem>
                    <SelectItem value="PSICOPEDAGOGA">Psicopedagoga</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || !newEmail.trim() || isCreating}
              >
                {isCreating ? "Guardando..." : "Habilitar usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuarios del sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No hay usuarios</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          user.role === "PSICOPEDAGOGA" && "border-violet-300 text-violet-700 bg-violet-50",
                          user.role === "DIRECTOR" && "border-blue-300 text-blue-700 bg-blue-50",
                          user.role === "ADMIN" && "border-orange-300 text-orange-700 bg-orange-50",
                        )}
                      >
                        {roleLabel[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(user.status)}>
                        {statusLabel[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status !== "DISABLED" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Desactivar acceso"
                                disabled={actioningId === user.id}
                              >
                                <UserX className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Desactivar a {user.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  El usuario no podrá iniciar sesión. Sus datos se conservan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDisable(user)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Desactivar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {user.status === "DISABLED" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Habilitar acceso"
                                disabled={actioningId === user.id}
                              >
                                <UserCheck className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Habilitar a {user.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  El usuario podrá volver a ingresar con su cuenta autorizada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleEnable(user)}>
                                  Habilitar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
