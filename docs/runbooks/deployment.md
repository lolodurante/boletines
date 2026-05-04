# Runbook deployment

## Precondiciones

- CI verde en branch principal.
- Variables de entorno configuradas en el proveedor.
- `DATABASE_URL` configurada con el pooler de Supabase.
- `DIRECT_URL` disponible para migraciones/operaciones administrativas.
- Email real habilitado solo si hay provider validado.
- Zoho real habilitado solo con modulos y campos confirmados.

## Validacion previa

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:validate`
- `npm run build`

## Riesgos operativos

- Enviar emails reales desde ambientes no productivos.
- Generar PDFs con diseno no aprobado.
- Subir archivos al modulo Zoho incorrecto.
