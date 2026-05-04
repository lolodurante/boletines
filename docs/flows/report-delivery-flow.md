# Flujo de boletin y entrega

## Estados de boletin

- `NOT_READY`: faltan evaluaciones requeridas.
- `READY_FOR_REVIEW`: todas las evaluaciones requeridas estan completas.
- `NEEDS_REVISION`: direccion pidio correccion.
- `APPROVED`: listo para generar PDF y enviar.
- `SENT`: enviado.
- `BLOCKED_MISSING_EMAIL`: falta email de padre/tutor.

## Estados de entrega

- `PENDING`: preparado para enviar.
- `SENT`: email enviado.
- `FAILED`: fallo proveedor o storage.
- `BLOCKED`: no puede enviarse por datos incompletos.

## Reglas

- No enviar boletin sin email familiar.
- No generar envio real en test/dev salvo `ENABLE_REAL_EMAIL_SENDING=true`.
- Subida a Zoho ocurre despues de generar PDF y debe registrar resultado.
- Si falla Zoho, el envio por email no debe ocultar el error operativo.
