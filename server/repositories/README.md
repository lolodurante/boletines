# Repositories

Ubicacion para acceso a datos. Todavia no hay implementacion porque falta decidir Prisma o Drizzle.

Reglas:

- Un repository por agregado o caso de persistencia claro.
- No exponer modelos crudos de ORM a UI.
- Los servicios consumen repositories; los componentes no.
