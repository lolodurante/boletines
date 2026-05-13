# ADR-002 Supabase Postgres + Prisma

## Estado

Aceptada.

## Contexto

La app necesita una base propia como fuente unica para alumnos, docentes, configuracion academica, evaluaciones, borradores, boletines, entregas, observaciones y auditoria.

## Decision

Usar Supabase Postgres como base de datos operativa y Prisma como ORM.

La configuracion usa Prisma 7:

- `prisma/schema.prisma` define modelos y relaciones.
- `prisma.config.ts` define la URL de migraciones.
- `lib/db/client.ts` usa `@prisma/adapter-pg`.
- `DATABASE_URL` se reserva para runtime, idealmente el pooler de Supabase.
- `DIRECT_URL` se reserva para migraciones y comandos administrativos.

## Consideraciones Supabase/Postgres

- Indexar columnas FK explicitamente porque Postgres no lo hace por defecto.
- Mantener constraints y uniques en DB para proteger reglas de negocio.
- Usar connection pooling para runtime.
- Mantener transacciones cortas en server actions y servicios.

## Consecuencias

- Las rutas y servicios no deben acceder directo a Supabase desde UI.
- El acceso a datos pasa por `server/repositories`.
- Las migraciones Prisma deben ejecutarse contra `DIRECT_URL`.
- Los datos academicos se administran en la DB local mediante pantallas, seeds o scripts idempotentes.
