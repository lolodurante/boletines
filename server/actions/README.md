# Server actions

Ubicacion para server actions de Next.js. Cada action debe validar payload con Zod antes de llamar servicios.

Reglas:

- Mantener actions pequenas.
- No mezclar persistencia directa si existe repository.
- Devolver errores user-friendly.
- Cubrir flujos criticos con tests de servicio o integracion.
