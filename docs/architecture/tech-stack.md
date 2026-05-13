# Tech stack

- Next.js App Router con React Server Components cuando la pantalla no requiera interaccion cliente.
- TypeScript strict.
- Tailwind CSS y shadcn/ui.
- Zod para validaciones.
- Supabase Postgres con Prisma.
- Auth con roles `DIRECTOR`, `TEACHER`, `ADMIN`.
- PDF generation mediante contrato inicial en `lib/pdf`.
- Email provider pendiente, con soporte para Resend o SendGrid.
- Tests con Vitest, Testing Library y Playwright.
- CI con GitHub Actions.

## Decisiones pendientes

- ORM definitivo: Prisma.
- Provider de auth.
- Provider de email.
- Storage definitivo de PDFs.

Ver `docs/TODO.md` para el backlog de decisiones e implementacion.
