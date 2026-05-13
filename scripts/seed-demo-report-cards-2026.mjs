import { existsSync, readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DEFAULT_PERIOD_NAME = "Demo Direccion 2026"
const DEFAULT_STUDENT_LIMIT_PER_COURSE = 12

const subjects = [
  {
    name: "Practicas del Lenguaje",
    type: "ESPANOL",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: [
      "Comprension lectora",
      "Produccion escrita",
      "Participacion oral",
      "Uso de convenciones",
    ],
  },
  {
    name: "Matematica",
    type: "ESPANOL",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: ["Resolucion de problemas", "Calculo mental", "Geometria y medida", "Argumentacion"],
  },
  {
    name: "Ciencias Sociales",
    type: "ESPANOL",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: ["Comprension de procesos", "Uso de fuentes", "Trabajo en clase"],
  },
  {
    name: "Ciencias Naturales",
    type: "ESPANOL",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: ["Observacion y registro", "Explicacion de fenomenos", "Trabajo experimental"],
  },
  {
    name: "Ingles",
    type: "INGLES",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: ["Comprension", "Produccion oral", "Produccion escrita"],
  },
  {
    name: "Educacion Artistica",
    type: "ESPANOL",
    gradeRange: ["1", "2", "3", "4", "5", "6"],
    criteria: ["Exploracion de materiales", "Proceso creativo", "Presentacion de trabajos"],
  },
]

const scaleLevels = [
  { label: "Excelente", value: "EXCELENTE", order: 4, description: "Supera ampliamente lo esperado." },
  { label: "Muy Bueno", value: "MUY_BUENO", order: 3, description: "Alcanza solidamente lo esperado." },
  { label: "Bueno", value: "BUENO", order: 2, description: "Alcanza lo esperado con acompanamiento ocasional." },
  { label: "En Proceso", value: "EN_PROCESO", order: 1, description: "Requiere mayor acompanamiento." },
]

const observations = [
  "Sostiene un muy buen compromiso con las propuestas y participa activamente.",
  "Avanza con seguridad y demuestra autonomia en las actividades del periodo.",
  "Se observa progreso sostenido; conviene seguir fortaleciendo la organizacion del trabajo.",
  "Responde bien al acompanamiento docente y completa las tareas con mayor continuidad.",
  "Muestra interes por aprender y aporta ideas pertinentes en los intercambios.",
]

function loadLocalEnv() {
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue

    const lines = readFileSync(file, "utf8").split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/)
      const key = match?.[1]
      const value = match?.[2]
      if (!key || value === undefined || process.env[key] !== undefined) continue

      process.env[key] = value.trim().replace(/^["']|["']$/g, "")
    }
  }
}

function getArgValue(name, fallback) {
  const prefix = `--${name}=`
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : fallback
}

function getStudentLimit() {
  const raw = getArgValue("limit-students-per-course", String(DEFAULT_STUDENT_LIMIT_PER_COURSE))
  const limit = Number.parseInt(raw, 10)
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("--limit-students-per-course debe ser un numero mayor a 0")
  }
  return limit
}

function stableIndex(parts, modulo) {
  const text = parts.join(":")
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash % modulo
}

function pick(items, parts) {
  return items[stableIndex(parts, items.length)]
}

function uniqueCourseKey(course) {
  return `${course.grade}:${course.division}`
}

async function upsertPeriod(prisma, periodName) {
  const existing = await prisma.academicPeriod.findFirst({ where: { name: periodName } })
  const data = {
    name: periodName,
    type: "TRIMESTER",
    startDate: new Date("2026-03-02T00:00:00.000Z"),
    dueDate: new Date("2026-07-10T00:00:00.000Z"),
    teacherDeadline: new Date("2026-06-26T00:00:00.000Z"),
    status: "ACTIVE",
  }

  if (existing) {
    return prisma.academicPeriod.update({ where: { id: existing.id }, data })
  }

  return prisma.academicPeriod.create({ data })
}

async function upsertScale(prisma) {
  const scale = await prisma.gradingScale.upsert({
    where: { name: "Escala conceptual demo" },
    create: { name: "Escala conceptual demo", gradeFrom: 1, gradeTo: 6 },
    update: { gradeFrom: 1, gradeTo: 6 },
  })

  for (const level of scaleLevels) {
    await prisma.gradingScaleLevel.upsert({
      where: { gradingScaleId_value: { gradingScaleId: scale.id, value: level.value } },
      create: { gradingScaleId: scale.id, ...level },
      update: { label: level.label, order: level.order, description: level.description },
    })
  }

  return prisma.gradingScaleLevel.findMany({
    where: { gradingScaleId: scale.id },
    orderBy: { order: "desc" },
  })
}

async function upsertSubjectsAndCriteria(prisma) {
  const result = []

  for (const subjectInput of subjects) {
    const subject = await prisma.subject.upsert({
      where: { name: subjectInput.name },
      create: { name: subjectInput.name, type: subjectInput.type, gradeRange: subjectInput.gradeRange, active: true },
      update: { type: subjectInput.type, gradeRange: subjectInput.gradeRange, active: true },
    })

    const criteria = []
    for (const criterionName of subjectInput.criteria) {
      const existing = await prisma.evaluationCriterion.findFirst({
        where: { subjectId: subject.id, name: criterionName },
      })
      const data = {
        subjectId: subject.id,
        name: criterionName,
        description: `${criterionName} segun los contenidos trabajados en el periodo.`,
        gradeRange: subjectInput.gradeRange,
        active: true,
      }

      criteria.push(
        existing
          ? await prisma.evaluationCriterion.update({ where: { id: existing.id }, data })
          : await prisma.evaluationCriterion.create({ data }),
      )
    }

    result.push({ subject, criteria })
  }

  return result
}

async function main() {
  loadLocalEnv()

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurada")
  }

  const dryRun = process.argv.includes("--dry-run")
  const periodName = getArgValue("period", DEFAULT_PERIOD_NAME)
  const studentLimitPerCourse = getStudentLimit()
  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
    log: ["error"],
  })

  try {
    const [students, teachers, courses] = await Promise.all([
      prisma.student.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ grade: "asc" }, { division: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
      prisma.course.findMany({ where: { active: true }, orderBy: [{ grade: "asc" }, { division: "asc" }] }),
    ])

    if (students.length === 0) throw new Error("No hay alumnos activos cargados")
    if (teachers.length === 0) throw new Error("No hay docentes cargados")
    if (courses.length === 0) throw new Error("No hay cursos activos cargados")

    const studentsByCourse = new Map()
    for (const student of students) {
      const key = uniqueCourseKey(student)
      const current = studentsByCourse.get(key) ?? []
      if (current.length < studentLimitPerCourse) current.push(student)
      studentsByCourse.set(key, current)
    }

    const selectedCourses = courses.filter((course) => (studentsByCourse.get(uniqueCourseKey(course)) ?? []).length > 0)
    const selectedStudentCount = selectedCourses.reduce(
      (total, course) => total + (studentsByCourse.get(uniqueCourseKey(course)) ?? []).length,
      0,
    )
    const criteriaPerStudent = subjects.reduce((sum, subject) => sum + subject.criteria.length, 0)
    const expectedAssignments = selectedCourses.length * subjects.length
    const expectedEvaluations = selectedStudentCount * subjects.length
    const expectedGrades = selectedStudentCount * criteriaPerStudent

    if (dryRun) {
      console.log(
        [
          "Dry-run demo boletines",
          `Periodo: ${periodName}`,
          `Cursos con alumnos: ${selectedCourses.length}`,
          `Alumnos seleccionados: ${selectedStudentCount}`,
          `Docentes disponibles: ${teachers.length}`,
          `Materias demo: ${subjects.length}`,
          `Asignaciones estimadas: ${expectedAssignments}`,
          `Evaluaciones estimadas: ${expectedEvaluations}`,
          `Notas estimadas: ${expectedGrades}`,
          "No se escribieron cambios.",
        ].join("\n"),
      )
      return
    }

    const levels = await upsertScale(prisma)
    const period = await upsertPeriod(prisma, periodName)
    const subjectRecords = await upsertSubjectsAndCriteria(prisma)

    let assignments = 0
    let evaluations = 0
    let grades = 0
    let reportCards = 0

    for (const course of selectedCourses) {
      const courseStudents = studentsByCourse.get(uniqueCourseKey(course)) ?? []

      for (let subjectIndex = 0; subjectIndex < subjectRecords.length; subjectIndex += 1) {
        const subjectRecord = subjectRecords[subjectIndex]
        const teacher = teachers[(subjectIndex + Number(course.grade || 0)) % teachers.length]

        await prisma.courseAssignment.upsert({
          where: {
            teacherId_subjectId_grade_division_periodId: {
              teacherId: teacher.id,
              subjectId: subjectRecord.subject.id,
              grade: course.grade,
              division: course.division,
              periodId: period.id,
            },
          },
          create: {
            teacherId: teacher.id,
            subjectId: subjectRecord.subject.id,
            grade: course.grade,
            division: course.division,
            periodId: period.id,
          },
          update: {},
        })
        assignments += 1

        for (const student of courseStudents) {
          const evaluation = await prisma.evaluation.upsert({
            where: {
              studentId_teacherId_subjectId_periodId: {
                studentId: student.id,
                teacherId: teacher.id,
                subjectId: subjectRecord.subject.id,
                periodId: period.id,
              },
            },
            create: {
              studentId: student.id,
              teacherId: teacher.id,
              subjectId: subjectRecord.subject.id,
              periodId: period.id,
              status: "SUBMITTED",
              submittedAt: new Date(),
              generalObservation: pick(observations, [student.id, subjectRecord.subject.id]),
            },
            update: {
              status: "SUBMITTED",
              submittedAt: new Date(),
              generalObservation: pick(observations, [student.id, subjectRecord.subject.id]),
            },
          })
          evaluations += 1

          for (const criterion of subjectRecord.criteria) {
            const level = pick(levels, [student.id, subjectRecord.subject.id, criterion.id])
            await prisma.evaluationGrade.upsert({
              where: { evaluationId_criterionId: { evaluationId: evaluation.id, criterionId: criterion.id } },
              create: {
                evaluationId: evaluation.id,
                criterionId: criterion.id,
                scaleLevelId: level.id,
                observation: pick(observations, [criterion.id, student.id]),
              },
              update: {
                scaleLevelId: level.id,
                observation: pick(observations, [criterion.id, student.id]),
              },
            })
            grades += 1
          }
        }
      }

      for (const student of courseStudents) {
        for (const type of new Set(subjectRecords.map((record) => record.subject.type))) {
          await prisma.reportCard.upsert({
            where: { studentId_periodId_type: { studentId: student.id, periodId: period.id, type } },
            create: {
              studentId: student.id,
              periodId: period.id,
              type,
              status: "READY_FOR_REVIEW",
              pdfStatus: "PENDING",
            },
            update: {
              status: "READY_FOR_REVIEW",
              pdfStatus: "PENDING",
            },
          })
          reportCards += 1
        }
      }
    }

    console.log(
      [
        "Demo de boletines cargada",
        `Periodo: ${period.name}`,
        `Cursos: ${selectedCourses.length}`,
        `Alumnos con boletin: ${reportCards}`,
        `Materias: ${subjectRecords.length}`,
        `Asignaciones docente/materia/curso: ${assignments}`,
        `Evaluaciones cargadas: ${evaluations}`,
        `Notas cargadas: ${grades}`,
      ].join("\n"),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
