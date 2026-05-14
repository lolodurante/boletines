import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authUser: { id: "director-1", role: "DIRECTOR" },
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  teacherUpsert: vi.fn(),
  teacherDeleteMany: vi.fn(),
}))

vi.mock("@/lib/auth/current-user", () => ({
  requireApiDirectorOrAdmin: vi.fn(async () => ({
    user: mocks.authUser,
    response: null,
  })),
}))

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
      create: mocks.create,
    },
    teacher: {
      upsert: mocks.teacherUpsert,
      deleteMany: mocks.teacherDeleteMany,
    },
  },
}))

function post(body: unknown) {
  return new Request("http://localhost/api/auth/allow-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("allow-user route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authUser = { id: "director-1", role: "DIRECTOR" }
  })

  it("prevents directors from activating administrator users by id", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      status: "DISABLED",
    })

    const { POST } = await import("@/app/api/auth/allow-user/route")
    const response = await POST(post({ userId: "admin-1" }))

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.teacherUpsert).not.toHaveBeenCalled()
    expect(mocks.teacherDeleteMany).not.toHaveBeenCalled()
  })

  it("prevents directors from overwriting administrator users by email", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "admin-1",
      email: "admin@labarden.edu.ar",
      role: "ADMIN",
      status: "DISABLED",
    })

    const { POST } = await import("@/app/api/auth/allow-user/route")
    const response = await POST(post({
      email: "ADMIN@LABARDEN.EDU.AR",
      name: "Admin",
      role: "TEACHER",
    }))

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("removes stale teacher records when a user is changed to a non-teacher role", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "user-1",
      email: "persona@labarden.edu.ar",
      role: "TEACHER",
      status: "ACTIVE",
    })
    mocks.update.mockResolvedValue({
      id: "user-1",
      role: "DIRECTOR",
    })

    const { POST } = await import("@/app/api/auth/allow-user/route")
    const response = await POST(post({
      email: "persona@labarden.edu.ar",
      name: "Persona",
      role: "DIRECTOR",
    }))

    expect(response.status).toBe(200)
    expect(mocks.teacherDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mocks.teacherUpsert).not.toHaveBeenCalled()
  })
})
