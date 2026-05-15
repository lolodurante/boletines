import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authUser: { id: "director-1", role: "DIRECTOR" },
  gradingScaleFindUnique: vi.fn(),
  gradingScaleDelete: vi.fn(),
  evaluationGradeCount: vi.fn(),
  adaptedEvaluationGradeCount: vi.fn(),
}))

vi.mock("@/lib/auth/current-user", () => ({
  requireApiDirectorOrAdmin: vi.fn(async () => ({
    user: mocks.authUser,
    response: null,
  })),
}))

vi.mock("@/lib/logger", () => ({
  logWarning: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  prisma: {
    gradingScale: {
      findUnique: mocks.gradingScaleFindUnique,
      delete: mocks.gradingScaleDelete,
    },
    evaluationGrade: {
      count: mocks.evaluationGradeCount,
    },
    adaptedEvaluationGrade: {
      count: mocks.adaptedEvaluationGradeCount,
    },
  },
}))

function post(body: unknown) {
  return new Request("http://localhost/api/grading-scales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("grading scales route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authUser = { id: "director-1", role: "DIRECTOR" }
    mocks.evaluationGradeCount.mockResolvedValue(0)
    mocks.adaptedEvaluationGradeCount.mockResolvedValue(0)
  })

  it("does not delete a grading scale with historical regular grades", async () => {
    const scaleId = "11111111-1111-4111-8111-111111111111"
    mocks.gradingScaleFindUnique.mockResolvedValue({
      levels: [{ id: "level-1" }],
    })
    mocks.evaluationGradeCount.mockResolvedValue(1)

    const { POST } = await import("@/app/api/grading-scales/route")
    const response = await POST(post({ action: "delete", id: scaleId }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("No se puede eliminar una escala que ya tiene calificaciones asignadas")
    expect(mocks.gradingScaleDelete).not.toHaveBeenCalled()
  })

  it("does not delete a grading scale with historical adapted grades", async () => {
    const scaleId = "22222222-2222-4222-8222-222222222222"
    mocks.gradingScaleFindUnique.mockResolvedValue({
      levels: [{ id: "level-1" }],
    })
    mocks.adaptedEvaluationGradeCount.mockResolvedValue(1)

    const { POST } = await import("@/app/api/grading-scales/route")
    const response = await POST(post({ action: "delete", id: scaleId }))

    expect(response.status).toBe(409)
    expect(mocks.gradingScaleDelete).not.toHaveBeenCalled()
  })

  it("deletes an unused grading scale", async () => {
    const scaleId = "33333333-3333-4333-8333-333333333333"
    mocks.gradingScaleFindUnique.mockResolvedValue({
      levels: [{ id: "level-1" }],
    })
    mocks.gradingScaleDelete.mockResolvedValue({})

    const { POST } = await import("@/app/api/grading-scales/route")
    const response = await POST(post({ action: "delete", id: scaleId }))

    expect(response.status).toBe(200)
    expect(mocks.gradingScaleDelete).toHaveBeenCalledWith({ where: { id: scaleId } })
  })
})
