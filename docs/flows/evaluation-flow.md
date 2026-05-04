# Flujo de evaluacion

## Estados

- `DRAFT`: evaluacion guardada parcialmente.
- `SUBMITTED`: docente completo criterios requeridos y envio.
- `NEEDS_REVISION`: director solicito correccion.
- `APPROVED`: evaluacion aceptada para boletin.

## Transiciones validas

- `DRAFT` -> `SUBMITTED` cuando todos los criterios requeridos tienen calificacion.
- `SUBMITTED` -> `NEEDS_REVISION` si direccion pide cambios.
- `NEEDS_REVISION` -> `SUBMITTED` cuando docente corrige y reenvia.
- `SUBMITTED` -> `APPROVED` cuando direccion aprueba.

## Transiciones invalidas

- `DRAFT` -> `APPROVED`.
- `NEEDS_REVISION` -> `APPROVED` sin reenvio docente.
- Cualquier docente editando alumnos no asignados.

El guardado parcial nunca marca un boletin como listo.
