# Modelo de dominio inicial

## Identidad

- `User`: usuario autenticable con rol `DIRECTOR`, `TEACHER` o `ADMIN`, email y timestamps.
- `Teacher`: perfil docente vinculado a `User`, con cursos asignados.

## Alumnos y cursada

- `Student`: alumno con nombre, grado, division, email familiar opcional y estado.
- `Subject`: materia activa para un rango de grados.
- `EvaluationCriterion`: criterio por materia y rango de grados.
- `CourseAssignment`: asignacion de docente, materia, grado, division y periodo.

## Calificacion

- `GradingScale`: escala aplicable a un rango de grados.
- `GradingScaleLevel`: nivel ordenado dentro de una escala.
- `AcademicPeriod`: periodo academico `TRIMESTER`, `BIMESTER`, `QUARTER` o `CUSTOM`.
- `Evaluation`: evaluacion docente por alumno, materia y periodo.
- `EvaluationGrade`: calificacion por criterio dentro de una evaluacion.

## Boletin y PDF

- `ReportCard`: boletin por alumno y periodo, con observacion del director, URL de PDF y estado local de PDF.
- `ReportDelivery`: legado de envio por email; revisar si se elimina.

Los tipos base viven en `types/domain.ts`. Los inputs externos se validan con schemas en `lib/validations`.
