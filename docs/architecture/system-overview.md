# System overview

El sistema gestiona evaluaciones escolares y boletines para Colegio Labarden. El flujo principal va de configuracion academica en la DB a carga docente, revision directiva y generacion de PDF.

## Capas

- UI: rutas App Router y componentes shadcn.
- Dominio: tipos en `types/domain.ts` y estados explicitos.
- Validacion: Zod en `lib/validations`.
- Servicios: reglas de negocio en `server/services`.
- Persistencia: Supabase Postgres con Prisma; acceso a datos en `server/repositories`.
- Integraciones: PDF aislado en `lib`.

## Principios

- Los componentes visuales no deciden permisos ni estados finales.
- Todo dato externo se valida antes de entrar al dominio.
- Email se desarrolla con cliente seguro para local/test hasta confirmar credenciales y contrato.
- La generacion de PDF recibe datos ya validados.
