import { defineConfig } from "prisma/config"
import { existsSync, readFileSync } from "node:fs"

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

loadLocalEnv()

const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/boletines_labarden"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
})
