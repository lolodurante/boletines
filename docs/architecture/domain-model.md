# Modelo de dominio inicial

## Identidad

- `User`: usuario autenticable con rol `DIRECTOR`, `TEACHER` o `ADMIN`, email, timestamps y `zohoId` opcional.
- `Teacher`: perfil docente vinculado a `User`, con cursos asignados y `zohoId` opcional.

## Alumnos y cursada

- `Student`: alumno con nombre, grado, division, email familiar opcional, estado y relacion futura con Zoho.
- `Subject`: materia activa para un rango de grados.
- `EvaluationCriterion`: criterio por materia y rango de grados.
- `CourseAssignment`: asignacion de docente, materia, grado, division y periodo.

## Calificacion

- `GradingScale`: escala aplicable a un rango de grados.
- `GradingScaleLevel`: nivel ordenado dentro de una escala.
- `AcademicPeriod`: periodo academico `TRIMESTER`, `BIMESTER`, `QUARTER` o `CUSTOM`.
- `Evaluation`: evaluacion docente por alumno, materia y periodo.
- `EvaluationGrade`: calificacion por criterio dentro de una evaluacion.

## Boletin y entrega

- `ReportCard`: boletin por alumno y periodo, con observacion del director, PDF y estado de subida a Zoho.
- `ReportDelivery`: intento de envio por email.
- `ZohoSyncLog`: auditoria de acciones contra Zoho.

Los tipos base viven en `types/domain.ts`. Los inputs externos se validan con schemas en `lib/validations`.
