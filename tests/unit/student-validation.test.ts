import { describe, expect, it } from "vitest"
import { studentSchema } from "@/lib/validations"

describe("studentSchema", () => {
  it("accepts a student with family email", () => {
    const result = studentSchema.safeParse({
      id: "student-1",
      firstName: "Martina",
      lastName: "Garcia",
      grade: "3",
      division: "A",
      familyEmail: "familia@example.com",
      status: "ACTIVE",
    })

    expect(result.success).toBe(true)
  })

  it("accepts a student without family email so delivery can block later", () => {
    const result = studentSchema.safeParse({
      id: "student-2",
      firstName: "Joaquin",
      lastName: "Martinez",
      grade: "3",
      division: "A",
      status: "ACTIVE",
    })

    expect(result.success).toBe(true)
  })
})
