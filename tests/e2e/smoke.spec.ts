import { expect, test } from "@playwright/test"

async function expectLogin(page: import("@playwright/test").Page) {
  await expect(page.getByText("Sistema de Evaluacion")).toBeVisible()
  await expect(page.getByRole("button", { name: /Ingresar con Google/i })).toBeVisible()
}

test("home entry point renders auth login or local demo picker", async ({ page }) => {
  await page.goto("/")

  if (page.url().includes("/login")) {
    await expectLogin(page)
    return
  }

  await expect(page.getByRole("link", { name: /Ingresar como Director/i })).toBeVisible()
  await expect(page.getByRole("link", { name: /Ingresar como Docente/i })).toBeVisible()
})

test("main app routes render or enforce authentication", async ({ page, request }) => {
  const routes = [
    "/director/dashboard",
    "/director/evaluaciones",
    "/director/boletines",
    "/director/estadisticas",
    "/director/configuracion/docentes",
    "/director/configuracion/materias",
    "/director/configuracion/periodos",
    "/director/configuracion/escalas",
    "/docente/dashboard",
    "/docente/cursos",
    "/docente/calificaciones",
    "/docente/calificaciones/c3a/s2",
  ]

  for (const route of routes) {
    await page.goto(route)
    if (page.url().includes("/login")) {
      await expectLogin(page)
    } else {
      await expect(page.locator("body")).toContainText("Colegio Labarden")
    }
  }

  const platformData = await request.get("/api/platform-data")
  expect([200, 401]).toContain(platformData.status())

  const gradingScales = await request.get("/api/grading-scales")
  expect([200, 401]).toContain(gradingScales.status())
})

test("teacher grade entry is protected or renders an assigned-period form", async ({ page }) => {
  await page.goto("/docente/calificaciones/c3a/s2")

  if (page.url().includes("/login")) {
    await expectLogin(page)
    return
  }

  const saveButton = page.getByRole("button", { name: /Guardar borrador/i })
  const notFound = page.getByText("Curso o materia no encontrado")
  await expect(saveButton.or(notFound)).toBeVisible()
})

test("director configuration APIs mutate data only when authorized", async ({ request }) => {
  const assignment = await request.post("/api/course-assignments", {
    data: {
      action: "add",
      teacherId: "t1",
      courseId: "c3a",
      subjectId: "s1",
      periodId: "p2",
    },
  })
  expect([200, 401, 403, 503]).toContain(assignment.status())
  if (!assignment.ok()) return

  const period = await request.post("/api/periods", {
    data: {
      action: "save",
      name: "Periodo E2E",
      startDate: "01/03/2026",
      endDate: "30/05/2026",
      teacherDeadline: "25/05/2026",
      active: false,
    },
  })
  expect(period.ok()).toBe(true)

  const subjects = await request.post("/api/subjects", {
    data: {
      subjects: [
        {
          id: "subject-e2e",
          name: "Materia E2E",
          appliesTo: ["1°"],
          criteriaByGrade: [
            {
              grade: "1°",
              criteria: [{ id: "criterion-e2e", name: "Criterio E2E", description: "Validacion E2E" }],
            },
          ],
        },
      ],
    },
  })
  expect(subjects.ok()).toBe(true)
})
