import { existsSync, readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { createClient } from "@supabase/supabase-js"

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

const staff = [
  { name: "Gómez D'hers Rosario", email: "rosariogomezdhers@colegiolabarden.edu.ar", role: "DIRECTOR" },
  { name: "Sanjurjo Victoria E.", email: "secretariaprimaria@colegiolabarden.edu.ar", role: "DIRECTOR" },
  { name: "Pacheco, Milagros", email: "milagrospacheco@colegiolabarden.edu.ar", role: "DIRECTOR" },
  { name: "Lynch, Ana", email: "primaria@colegiolabarden.edu.ar", role: "DIRECTOR" },
  { name: "Durante, Lorenzo", email: "lolodurante2003@gmail.com", role: "DIRECTOR" },
  { name: "Inchausti, Jimena", email: "jimenainchausti@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Cavallero, Camila", email: "camilacavallero@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Iglesias, Agustina", email: "agustinaiglesias@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Curone, Camila", email: "camilacurone@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Suarez, Lucila", email: "lucilasuarez@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Cuper B, Daniela M.", email: "danielacuper@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Godoy Camila", email: "camilagodoy@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Amitrano, Mariana", email: "marianaamitrano@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Cura Olivera, Josefina", email: "mariajosefinacura@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Casado, Diego", email: "martincasado@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Campos, Agustina", email: "agustinacampos@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Cicciaro, Ma. Isabel", email: "mariacicciaro@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Argüelles, Mercedes", email: "mercedesarguelles@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Quispe María Ximena", email: "ximenaquispe@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Simari Diego", email: "diegosimari@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Maino, Andrea", email: "andreamaino@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Zavoluk, Ari", email: "arizavoluk@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Iorio, Agustina", email: "agustinaiorio@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Cejas, Andrea", email: "andrescejas@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "De Cristófano, Julio", email: "juliodecristofano@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Novelli, Andrea", email: "andreanovelli@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Godoy Pablo", email: "pablogodoy@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Boni, Leonardo", email: "leonardoboni@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Mendez, Marty", email: "martymendez@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Chevallier B. Mandy", email: "mandychevallierboutell@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Galíndez, Camila", email: "camilagalindez@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Arrechea, Clara", email: "claraarrechea@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Durante, Lorenzo", email: "lorenzodurante@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Giri Agüero, Ludmila", email: "ludmilagiriaguero@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Grondona, Delfina", email: "delfinagrondona@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Nari, Fátima", email: "fatimanari@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Santa Maria, Sol", email: "solsantamaria@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Gahan, Melania", email: "melaniegahan@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Rodino, Fernanda", email: "fernandarodino@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Gomez Oromi, Asunción", email: "asunciongomez@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Pagliettini, Antonela", email: "antonelapagliettini@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Leoni, Graciela", email: "gracielaleoni@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Tuero, María", email: "mariatuero@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Lavergne, Matías", email: "matiaslavergne@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Lavia, Agustina", email: "agustinalavia@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Funes, Martina", email: "martinafunes@colegiolabarden.edu.ar", role: "TEACHER" },
  { name: "Lastra, Gabriela", email: "gabrielalastra@colegiolabarden.edu.ar", role: "TEACHER" },
]

loadLocalEnv()

async function importWithSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin no esta configurado")
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let directors = 0
  let teachers = 0

  for (const person of staff) {
    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          name: person.name,
          email: person.email,
          role: person.role,
          status: "ACTIVE",
        },
        { onConflict: "email" },
      )
      .select("id, role")
      .single()

    if (userError) throw userError

    if (person.role === "TEACHER") {
      const { error: teacherError } = await supabase
        .from("teachers")
        .upsert({ user_id: user.id }, { onConflict: "user_id" })

      if (teacherError) throw teacherError
      teachers += 1
    } else {
      directors += 1
    }
  }

  return { directors, teachers }
}

async function importWithPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurada")
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
    log: ["error"],
  })

  let directors = 0
  let teachers = 0

  for (const person of staff) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      create: {
        name: person.name,
        email: person.email,
        role: person.role,
        status: "ACTIVE",
      },
      update: {
        name: person.name,
        role: person.role,
        status: "ACTIVE",
      },
    })

    if (person.role === "TEACHER") {
      await prisma.teacher.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      })
      teachers += 1
    } else {
      directors += 1
    }
  }

  await prisma.$disconnect()
  return { directors, teachers }
}

let result
try {
  result = await importWithPrisma()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`Prisma no pudo conectar (${message}). Reintentando con Supabase admin...`)
  result = await importWithSupabase()
}

console.log(`Importados ${staff.length} usuarios: ${result.directors} directivos y ${result.teachers} docentes.`)
