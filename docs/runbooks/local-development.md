# Runbook desarrollo local

1. Instalar dependencias: `pnpm install`.
2. Copiar `.env.example` a `.env.local` y completar solo variables disponibles.
3. Para Supabase + Prisma, completar `DATABASE_URL` con el pooler de Supabase y `DIRECT_URL` con la conexion directa para migraciones.
4. Validar Prisma: `npm run db:validate`.
5. Generar Prisma Client: `npm run db:generate`.
6. Aplicar migraciones cuando la DB este lista: `npm run db:migrate`.
7. Ejecutar app: `npm run dev`.
8. Validar cambios: `npm run validate`.

## Integraciones

- Email real desactivado por defecto con `ENABLE_REAL_EMAIL_SENDING=false`.
- Zoho usa mocks si faltan credenciales.
- PDF genera un buffer stub hasta definir diseno final.
- Prisma usa `prisma.config.ts`; no poner URLs dentro de `schema.prisma`.
- En Supabase, usar pooler para runtime y conexion directa para migraciones.
