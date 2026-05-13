# Product requirements

## Roles

- Director: configura el sistema, revisa boletines, solicita correcciones, envia boletines y ve estadisticas.
- Docente: carga evaluaciones para sus cursos, materias y alumnos asignados.
- Alumno: sujeto evaluado.
- Padre/tutor: destinatario del boletin por entrega externa al sistema.
- Sistema/servicios externos: storage PDF.

## Director puede

- Configurar materias.
- Configurar criterios y rubricas.
- Configurar escalas de calificacion.
- Configurar periodos.
- Asignar docentes a cursos/materias.
- Ver avance por curso y periodo.
- Ver historial con filtros.
- Ver boletines listos.
- Revisar boletines.
- Agregar observacion del director.
- Solicitar correccion a docente.
- Generar y aprobar boletines en PDF.
- Ver estadisticas de avance y estado de boletines.

## Docente puede

- Ver solo cursos/alumnos asignados.
- Cargar calificaciones.
- Guardar parcialmente.
- Retomar despues.
- Agregar observaciones por materia.
- Agregar observaciones generales.
- Ver periodo vigente.
- Ver fecha limite.

## Proceso

1. Director configura periodo y asignaciones.
2. Docentes cargan evaluaciones.
3. Si varios docentes evaluan al mismo alumno, el boletin queda listo solo cuando todos completan su parte.
4. Director revisa boletines listos.
5. Director puede aprobar o pedir correccion.
6. Sistema genera PDF.
7. Sistema guarda URL/estado del PDF en la DB.
8. La entrega a familias ocurre fuera de la app.
