# Mapa del repo

- `app`: rutas Next.js App Router generadas por v0 para director, docente y home.
- `components`: componentes compartidos y shadcn/ui.
- `features`: componentes y exports por modulo funcional.
- `lib/validations`: schemas Zod y tipos derivados.
- `lib/auth`: roles, permisos y guards.
- `lib/email`: contrato de email, templates y cliente mock-safe.
- `lib/pdf`: schema de datos, template inicial y generador stub.
- `lib/mock-data`: mocks realistas del dominio Labarden.
- `lib/db`: cliente Prisma para Supabase Postgres.
- `prisma`: schema y migraciones Prisma.
- `server/services`: logica de negocio pura o coordinacion de integraciones.
- `server/repositories`: acceso a datos mediante Prisma.
- `types`: tipos base del dominio.
- `docs`: arquitectura, producto, specs, flujos, ADRs y runbooks.
- `tests`: unit, integration y e2e.
- `docs/TODO.md`: backlog tecnico y de producto pendiente para la siguiente etapa.

La UI actual puede seguir importando `lib/data.ts` hasta que cada pantalla se migre a `features` y `lib/mock-data`. No mezclar nuevos mocks en componentes.
