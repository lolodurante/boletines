# TODO

Este archivo concentra lo pendiente para la siguiente etapa. La base de datos de la app es la fuente unica para datos academicos, evaluaciones, boletines, entregas y auditoria.

## Decisiones por tomar

- [x] Elegir proveedor PostgreSQL: Supabase.
- [x] Elegir ORM: Prisma.
- [x] Elegir auth provider: Supabase Auth con Google.
- [x] Descartar envios de email desde la app.
- [ ] Elegir storage de PDFs: Vercel Blob, Supabase Storage u otro.
- [ ] Confirmar plataforma de deploy: Vercel u otra.

## Datos academicos

- [x] Definir la DB propia como fuente unica de alumnos, docentes, directivos y familias.
- [x] Quitar dependencia operativa de sistemas externos de datos maestros.
- [x] Preparar importador idempotente de docentes/directivos primaria 2026: `npm run import:docentes:2026`.
- [x] Corregir variables Supabase (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) y ejecutar `npm run import:docentes:2026`.
- [x] Verificar en DB que queden 4 directivos importados, 42 docentes y 42 perfiles `Teacher`.
- [ ] Confirmar campos exactos de alumno: nombre, apellido, grado, division, estado, email familiar, legajo interno.
- [ ] Confirmar campos exactos de docente/directivo: nombre, email, rol, estado.
- [ ] Definir pantallas o scripts para alta, edicion e importacion inicial de alumnos.
- [ ] Definir pantallas o scripts para alta, edicion e importacion inicial de docentes.
- [ ] Definir manejo de alumnos sin email familiar.
- [ ] Definir alta inicial de directivos en auth y DB local.

## Base de datos propia

- [x] Crear `prisma/schema.prisma`.
- [x] Modelar tablas locales para periodos.
- [x] Modelar materias, criterios/rubricas y escalas.
- [x] Modelar asignaciones docente-curso-materia en DB.
- [x] Modelar evaluaciones y notas por criterio.
- [x] Modelar borradores y estado de envio docente.
- [x] Modelar boletines, observaciones del director y estados.
- [x] Modelar entregas por email.
- [x] Modelar estado local de PDF en boletines.
- [x] Crear migracion inicial.
- [x] Crear `lib/db/client.ts`.
- [x] Crear repositories iniciales en `server/repositories`.
- [x] Crear servicio dinamico `getPlatformData()` con fallback a mocks si Supabase no esta configurado.
- [x] Exponer `/api/platform-data` para hidratar pantallas desde DB cuando exista `DATABASE_URL`.
- [ ] Conectar `.env.local` real de Supabase y ejecutar migracion contra el proyecto.
- [ ] Crear seed local con datos realistas.

## Auth y roles

- [x] Definir login real: Supabase Auth con Google.
- [ ] Configurar Google OAuth en Supabase para produccion.
- [x] Definir alta inicial de directivos en DB local.
- [ ] Verificar alta inicial de directivos en Supabase Auth con primer login Google.
- [x] Proteger rutas de director.
- [x] Proteger rutas de docente.
- [x] Validar permisos a nivel API/services.
- [ ] Agregar tests de autorizacion por flujo.

## Entrega de boletines

- [x] Confirmar que no habra envios de email desde la app.
- [ ] Definir entrega manual del PDF: descarga, impresion o envio externo.
- [x] Ajustar UI y estados para reemplazar "enviar" por generar/aprobar PDF.
- [ ] Revisar si siguen haciendo falta email familiar y `ReportDelivery`.

## PDF

- [ ] Conseguir logo oficial.
- [ ] Confirmar colores institucionales.
- [ ] Confirmar modelo visual del boletin.
- [ ] Confirmar textos, firmas o disclaimers requeridos.
- [ ] Implementar generacion PDF real.
- [ ] Guardar PDF en storage.
- [ ] Asociar URL/storage key al boletin local.

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
- [ ] Actualizar runbook de deploy con variables definitivas.
- [ ] Documentar administracion/importacion de datos academicos en DB.
