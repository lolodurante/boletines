import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authUser: { id: "director-1", role: "DIRECTOR" },
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  teacherFindUnique: vi.fn(),
  teacherUpsert: vi.fn(),
  assignmentFindMany: vi.fn(),
  assignmentDeleteMany: vi.fn(),
  evaluationFindMany: vi.fn(),
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
      findUnique: mocks.teacherFindUnique,
      upsert: mocks.teacherUpsert,
    },
    courseAssignment: {
      findMany: mocks.assignmentFindMany,
      deleteMany: mocks.assignmentDeleteMany,
    },
    evaluation: {
      findMany: mocks.evaluationFindMany,
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
    expect(mocks.assignmentDeleteMany).not.toHaveBeenCalled()
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

  it("keeps teacher history and removes only open empty assignments when a user changes to a non-teacher role", async () => {
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
    mocks.teacherFindUnique.mockResolvedValue({ id: "teacher-1" })
    mocks.assignmentFindMany.mockResolvedValue([
      {
        id: "assignment-empty",
        teacherId: "teacher-1",
        subjectId: "subject-1",
        periodId: "period-active",
        grade: "3",
        division: "A",
      },
      {
        id: "assignment-with-evaluation",
        teacherId: "teacher-1",
        subjectId: "subject-2",
        periodId: "period-active",
        grade: "3",
        division: "A",
      },
    ])
    mocks.evaluationFindMany.mockResolvedValue([
      {
        teacherId: "teacher-1",
        subjectId: "subject-2",
        periodId: "period-active",
        student: { grade: "3", division: "A" },
      },
    ])

    const { POST } = await import("@/app/api/auth/allow-user/route")
    const response = await POST(post({
      email: "persona@labarden.edu.ar",
      name: "Persona",
      role: "DIRECTOR",
    }))

    expect(response.status).toBe(200)
    expect(mocks.teacherUpsert).not.toHaveBeenCalled()
    expect(mocks.teacherFindUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    })
    expect(mocks.assignmentFindMany).toHaveBeenCalledWith({
      where: {
        teacherId: "teacher-1",
        period: { status: { in: ["DRAFT", "ACTIVE"] } },
      },
      select: {
        id: true,
        teacherId: true,
        subjectId: true,
        periodId: true,
        grade: true,
        division: true,
      },
    })
    expect(mocks.assignmentDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["assignment-empty"] } },
    })
  })
})
