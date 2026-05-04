import type { UserRole } from "@/types/domain"

export const roles: Record<UserRole, UserRole> = {
  DIRECTOR: "DIRECTOR",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
}

export interface AuthUser {
  id: string
  role: UserRole
  teacherId?: string
}
