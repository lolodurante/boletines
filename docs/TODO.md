# TODO

Este archivo concentra lo pendiente para la siguiente etapa. Zoho CRM queda definido como fuente unica de datos maestros; la app mantiene una base propia para operar evaluaciones, boletines, entregas y auditoria.

## Decisiones por tomar

- [x] Elegir proveedor PostgreSQL: Supabase.
- [x] Elegir ORM: Prisma.
- [ ] Elegir auth provider: Auth.js, Clerk u otro.
- [ ] Elegir email provider: recomendacion inicial, Resend.
- [ ] Elegir storage de PDFs: Vercel Blob, Supabase Storage u otro.
- [ ] Confirmar plataforma de deploy: Vercel u otra.

## Zoho CRM

- [x] Definir Zoho CRM como fuente unica de datos maestros.
- [ ] Confirmar nombres reales de modulos Zoho para alumnos, docentes, directivos y familias.
- [ ] Confirmar campos exactos de alumno: nombre, apellido, grado, division, estado, email familiar, legajo.
- [ ] Confirmar campos exactos de docente/directivo: nombre, email, rol, estado.
- [ ] Confirmar si asignaciones docente-curso-materia viven en Zoho o se configuran en la app.
- [ ] Confirmar endpoint/proceso correcto para adjuntar PDF al legajo del alumno.
- [ ] Definir estrategia de sync inicial desde Zoho hacia DB local.
- [ ] Definir estrategia de actualizacion incremental desde Zoho.
- [ ] Definir manejo de alumnos sin email familiar.
- [ ] Confirmar si directivos se sincronizan como usuarios desde Zoho o se crean primero en auth local y se vinculan por `zohoId`.

## Base de datos propia

- [x] Crear `prisma/schema.prisma`.
- [x] Modelar tablas locales para periodos.
- [x] Modelar materias, criterios/rubricas y escalas.
- [x] Modelar asignaciones si no vienen completas desde Zoho.
- [x] Modelar evaluaciones y notas por criterio.
- [x] Modelar borradores y estado de envio docente.
- [x] Modelar boletines, observaciones del director y estados.
- [x] Modelar entregas por email.
- [x] Modelar logs de sync con Zoho.
- [x] Crear migracion inicial.
- [x] Crear `lib/db/client.ts`.
- [x] Crear repositories iniciales en `server/repositories`.
- [x] Crear servicio dinamico `getPlatformData()` con fallback a mocks si Supabase no esta configurado.
- [x] Exponer `/api/platform-data` para hidratar pantallas desde DB cuando exista `DATABASE_URL`.
- [ ] Conectar `.env.local` real de Supabase y ejecutar migracion contra el proyecto.
- [ ] Crear seed local con datos realistas sincronizables desde Zoho.

## Auth y roles

- [ ] Definir login real.
- [ ] Mapear usuarios de Zoho a usuarios locales.
- [ ] Definir alta inicial de directivos.
- [ ] Proteger rutas de director.
- [ ] Proteger rutas de docente.
- [ ] Validar permisos a nivel server actions/services.
- [ ] Agregar tests de autorizacion por flujo.

## Email

- [ ] Confirmar proveedor.
- [ ] Configurar dominio/remitente institucional.
- [ ] Implementar envio real solo para produccion.
- [ ] Registrar resultados de envio en DB.
- [ ] Agregar retry/manual resend para fallos.
- [ ] Bloquear envio si falta email familiar.

## PDF

- [ ] Conseguir logo oficial.
- [ ] Confirmar colores institucionales.
- [ ] Confirmar modelo visual del boletin.
- [ ] Confirmar textos, firmas o disclaimers requeridos.
- [ ] Implementar generacion PDF real.
- [ ] Guardar PDF en storage.
- [ ] Asociar URL/storage key al boletin local.
- [ ] Subir PDF final a Zoho.

## UI v0 pendiente de ordenar

- [ ] Migrar mocks legacy de `lib/data.ts` hacia `lib/mock-data` o DB.
- [x] Mover calculos principales de dashboard/listados a servicio/API de plataforma.
- [ ] Separar pantallas grandes en componentes `features/director`.
- [ ] Separar pantallas docentes en componentes `features/teacher`.
- [x] Reemplazar pantallas principales por hook dinamico `usePlatformData()`.
- [ ] Reemplazar acciones UI simuladas por server actions persistentes.
- [ ] Persistir altas/ediciones de periodos, materias y asignaciones en DB.
- [ ] Mantener diseno visual existente salvo ajustes necesarios.

## Testing y CI

- [ ] Agregar tests de repositories cuando exista DB.
- [ ] Agregar integration tests para server actions.
- [ ] Completar Playwright para flujo director.
- [ ] Completar Playwright para flujo docente.
- [ ] Completar Playwright para bloqueo por email faltante.
- [ ] Definir si e2e corre en CI o queda job separado/manual.

## Documentacion

- [x] Crear ADR de DB/ORM elegido.
- [ ] Crear ADR de auth provider.
- [ ] Crear ADR de email/storage.
- [ ] Actualizar specs Zoho con campos reales.
- [ ] Actualizar runbook de deploy con variables definitivas.
- [ ] Documentar sync Zoho -> DB local.
