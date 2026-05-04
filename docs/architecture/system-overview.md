# System overview

El sistema gestiona evaluaciones escolares y boletines para Colegio Labarden. El flujo principal va de configuracion academica a carga docente, revision directiva, generacion de PDF, envio por email y guardado en Zoho CRM.

## Capas

- UI: rutas App Router y componentes shadcn.
- Dominio: tipos en `types/domain.ts` y estados explicitos.
- Validacion: Zod en `lib/validations`.
- Servicios: reglas de negocio en `server/services`.
- Persistencia: Supabase Postgres con Prisma; acceso a datos en `server/repositories`.
- Integraciones: Zoho, email y PDF aislados en `lib`.

## Principios

- Los componentes visuales no deciden permisos ni estados finales.
- Todo dato externo se valida antes de entrar al dominio.
- Zoho y email se desarrollan con mocks hasta confirmar credenciales y contratos.
- La generacion de PDF recibe datos ya validados.
