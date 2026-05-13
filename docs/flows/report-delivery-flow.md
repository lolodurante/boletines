# Flujo de boletin y PDF

## Estados de boletin

- `NOT_READY`: faltan evaluaciones requeridas.
- `READY_FOR_REVIEW`: todas las evaluaciones requeridas estan completas.
- `NEEDS_REVISION`: direccion pidio correccion.
- `APPROVED`: listo para generar PDF.
- `SENT`: legado; no se usa si la entrega queda fuera de la app.
- `BLOCKED_MISSING_EMAIL`: legado; no se usa si la entrega queda fuera de la app.

## Estados de PDF

- `PENDING`: pendiente de generar.
- `GENERATED`: PDF generado y asociado al boletin.
- `FAILED`: fallo la generacion o el storage.
- `SKIPPED`: no se genero PDF.

## Reglas

- La generacion de PDF debe registrar `pdfUrl` y `pdfStatus` en la DB.
- La entrega a familias ocurre fuera de la app; no se envia email desde el sistema.
- Revisar si `ReportDelivery`, `familyEmail`, `SENT` y `BLOCKED_MISSING_EMAIL` siguen siendo necesarios.
