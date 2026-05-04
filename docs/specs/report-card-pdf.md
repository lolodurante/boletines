# Spec boletin PDF

## Requisitos actuales

- Datos del alumno.
- Grado/division.
- Periodo.
- Materias.
- Criterios.
- Calificaciones.
- Observaciones por materia.
- Observacion general docente.
- Observacion del director.
- Logo del colegio.
- Colores institucionales.

## Pendiente del colegio

- Modelo visual definitivo del boletin.
- Logo oficial en alta calidad.
- Colores institucionales oficiales.
- Tipografia institucional si aplica.
- Texto legal o firmas requeridas.

## Reglas de generacion

- Validar datos con `reportCardPdfDataSchema`.
- No generar PDF para boletines `NOT_READY` o `BLOCKED_MISSING_EMAIL`.
- El template actual es stub y debe evolucionar sin cambiar el contrato de entrada salvo ADR.
