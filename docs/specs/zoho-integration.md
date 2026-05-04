# Spec Zoho CRM

La integracion Zoho queda preparada como contrato. Zoho CRM queda definido como fuente unica de datos maestros: alumnos, docentes, directivos, roles base y emails familiares. La app tendra una base propia para operar evaluaciones, boletines, envios y auditoria; al final del flujo se sube el PDF del boletin al legajo del alumno en Zoho.

## Variables esperadas

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_ORG_ID`
- `ZOHO_BASE_URL`

## Contratos

- `ZohoStudent`
- `ZohoTeacher`
- `ZohoAssignment`
- `ZohoUploadResponse`

## Pendiente de confirmacion

- Confirmar nombres de modulos en Zoho.
- Confirmar campos exactos de alumno, docente, familia y legajo.
- Confirmar como se adjunta PDF al legajo.
- Confirmar si se necesita auditoria adicional por envio o subida.
