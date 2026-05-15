import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DEFAULT_CSV_PATH = "/Users/lorenzodurante/Downloads/Datos por Alumno 2026.csv"

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

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        value += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(value)
      value = ""
    } else if (char === "\n") {
      row.push(value)
      rows.push(row)
      row = []
      value = ""
    } else if (char !== "\r") {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }

  const [headers, ...dataRows] = rows
  if (!headers) return []

  return dataRows
    .filter((dataRow) => dataRow.some((cell) => cell.trim()))
    .map((dataRow) =>
      Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""])),
    )
}

function cleanName(value) {
  return value.replace(/\s+/g, " ").replace(/\.+$/g, "").trim()
}

function splitStudentName(value) {
  const normalized = cleanName(value)
  const commaIndex = normalized.indexOf(",")

  if (commaIndex >= 0) {
    return {
      lastName: cleanName(normalized.slice(0, commaIndex)),
      firstName: cleanName(normalized.slice(commaIndex + 1)),
    }
  }

  const parts = normalized.split(" ").filter(Boolean)
  return {
    firstName: cleanName(parts.slice(0, -1).join(" ") || normalized),
    lastName: cleanName(parts.at(-1) ?? normalized),
  }
}

function readStudents(csvPath) {
  const text = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "")
  const rows = parseCsv(text)

  return rows.map((row, index) => {
    const { firstName, lastName } = splitStudentName(row.alumno)
    const grade = normalizeGrade(row.grado_numero || row.grado)
    const division = row.division?.trim().toUpperCase()

    if (!firstName || !lastName || !grade || !division) {
      throw new Error(`Fila ${index + 2} incompleta: alumno, grado y division son obligatorios`)
    }

    return {
      firstName,
      lastName,
      grade,
      division,
    }
  })
}

function normalizeGrade(value) {
  return value?.trim().replace(/[^\d]/g, "")
}

function uniqueCourses(students) {
  return Array.from(new Map(students.map((student) => [`${student.grade}:${student.division}`, student])).values())
}

function studentKey(student) {
  return `${student.grade}:${student.division}:${student.lastName}:${student.firstName}`
}

loadLocalEnv()

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no esta configurada")
}

const args = process.argv.slice(2)
const csvPath = resolve(args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_CSV_PATH)
const syncActive = args.includes("--sync-active")
const replaceExisting = args.includes("--replace-existing")
const students = readStudents(csvPath)
const importedKeys = new Set(students.map(studentKey))
const courses = uniqueCourses(students)
const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
  log: ["error"],
})

let createdCourses = 0
let updatedCourses = 0
let createdStudents = 0
let updatedStudents = 0
let deactivatedStudents = 0
let deletedStudents = 0

try {
  if (replaceExisting) {
    const existingStudents = await prisma.student.findMany({
      where: {
        OR: courses.map((course) => ({
          grade: course.grade,
          division: course.division,
        })),
      },
      select: { id: true },
    })

    const existingStudentIds = existingStudents.map((student) => student.id)
    if (existingStudentIds.length > 0) {
      const [evaluations, reportCards, adaptedCriteria] = await Promise.all([
        prisma.evaluation.count({ where: { studentId: { in: existingStudentIds } } }),
        prisma.reportCard.count({ where: { studentId: { in: existingStudentIds } } }),
        prisma.adaptedCriterion.count({ where: { studentId: { in: existingStudentIds } } }),
      ])

      if (evaluations + reportCards + adaptedCriteria > 0) {
        throw new Error(
          [
            "--replace-existing abortado: borrar alumnos existentes eliminaria datos academicos en cascada.",
            `Evaluaciones: ${evaluations}. Boletines: ${reportCards}. Criterios adaptados: ${adaptedCriteria}.`,
            "Usa el import sin --replace-existing o --sync-active para conservar historico.",
          ].join(" "),
        )
      }
    }

    const result = await prisma.student.deleteMany({
      where: {
        id: { in: existingStudentIds },
      },
    })
    deletedStudents = result.count
  }

  for (const course of courses) {
    const existing = await prisma.course.findUnique({
      where: {
        grade_division: {
          grade: course.grade,
          division: course.division,
        },
      },
      select: { id: true },
    })

    await prisma.course.upsert({
      where: {
        grade_division: {
          grade: course.grade,
          division: course.division,
        },
      },
      create: {
        grade: course.grade,
        division: course.division,
        active: true,
      },
      update: {
        active: true,
      },
    })

    if (existing) {
      updatedCourses += 1
    } else {
      createdCourses += 1
    }
  }

  for (const student of students) {
    const existing = await prisma.student.findFirst({
      where: {
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        division: student.division,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          ...student,
          familyEmail: null,
          status: "ACTIVE",
        },
      })
      updatedStudents += 1
    } else {
      await prisma.student.create({
        data: {
          ...student,
          familyEmail: null,
          status: "ACTIVE",
        },
      })
      createdStudents += 1
    }
  }

  if (syncActive) {
    const activeStudents = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        OR: courses.map((course) => ({
          grade: course.grade,
          division: course.division,
        })),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        division: true,
      },
    })

    const studentsToDeactivate = activeStudents.filter((student) => !importedKeys.has(studentKey(student)))

    if (studentsToDeactivate.length > 0) {
      const result = await prisma.student.updateMany({
        where: {
          id: { in: studentsToDeactivate.map((student) => student.id) },
        },
        data: { status: "INACTIVE" },
      })
      deactivatedStudents = result.count
    }
  }
} finally {
  await prisma.$disconnect()
}

console.log(
  [
    `CSV: ${csvPath}`,
    `Alumnos procesados: ${students.length}`,
    `Alumnos borrados antes de importar: ${deletedStudents}`,
    `Alumnos creados: ${createdStudents}`,
    `Alumnos actualizados/reactivados: ${updatedStudents}`,
    `Alumnos desactivados por no estar en el CSV: ${deactivatedStudents}`,
    `Cursos creados: ${createdCourses}`,
    `Cursos actualizados/reactivados: ${updatedCourses}`,
  ].join("\n"),
)
