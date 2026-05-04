import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`)
  }),
}))

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAuthConfigured: () => true,
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}))

describe("getCurrentAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-1", email: "teacher@example.com" } },
      error: null,
    })
  })

  it("returns an active local user and links auth id", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      authUserId: null,
      role: "TEACHER",
      name: "Docente Uno",
      email: "teacher@example.com",
      status: "INVITED",
      teacher: { id: "teacher-1" },
    })

    const { getCurrentAuthUser } = await import("@/lib/auth/current-user")
    const user = await getCurrentAuthUser()

    expect(user).toMatchObject({
      id: "user-1",
      role: "TEACHER",
      teacherId: "teacher-1",
      status: "ACTIVE",
    })
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { authUserId: "auth-1", status: "ACTIVE" },
    })
  })

  it("rejects disabled local users", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      authUserId: "auth-1",
      role: "TEACHER",
      name: "Docente Uno",
      email: "teacher@example.com",
      status: "DISABLED",
      teacher: { id: "teacher-1" },
    })

    const { getCurrentAuthUser } = await import("@/lib/auth/current-user")

    expect(await getCurrentAuthUser()).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("returns null when no matching local user exists", async () => {
    mocks.findUnique.mockResolvedValue(null)

    const { getCurrentAuthUser } = await import("@/lib/auth/current-user")

    expect(await getCurrentAuthUser()).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
