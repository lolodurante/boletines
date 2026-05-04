import { describe, expect, it } from "vitest"
import { mockEvaluationGrades, mockEvaluations } from "@/lib/mock-data"
import { isEvaluationComplete, submitEvaluation } from "@/server/services/evaluation-service"

describe("evaluation flow", () => {
  it("keeps incomplete evaluation as draft", () => {
    const evaluation = mockEvaluations[0]!
    const result = submitEvaluation({
      evaluation,
      grades: mockEvaluationGrades,
      requiredCriterionIds: ["criterion-mat-1", "criterion-mat-2", "criterion-mat-3"],
    })

    expect(result.status).toBe("DRAFT")
  })

  it("submits complete evaluation", () => {
    const evaluation = mockEvaluations[0]!

    expect(isEvaluationComplete({
      evaluation,
      grades: mockEvaluationGrades,
      requiredCriterionIds: ["criterion-mat-1", "criterion-mat-2"],
    })).toBe(true)
  })
})
