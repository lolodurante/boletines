# Base de datos

Esta carpeta queda reservada para el cliente de base de datos y helpers compartidos cuando se elija Prisma o Drizzle.

Reglas:

- No importar el cliente DB desde componentes visuales.
- El acceso a datos debe pasar por `server/repositories`.
- Las migraciones y schema definitivo se agregan despues de elegir ORM y modelo persistente.
