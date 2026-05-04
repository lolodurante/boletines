# Reglas para agentes

Este repositorio se trabaja agent-first. Cualquier agente debe leer primero `docs/repo-map.md`, `docs/conventions.md`, la spec afectada y el flujo relacionado antes de codear.

## Reglas obligatorias

- Revisar patrones existentes antes de crear archivos nuevos.
- No duplicar logica: buscar primero en `server/services`, `server/repositories`, `lib/validations` y `lib/mock-data`.
- No crear features fuera de scope.
- No modificar infraestructura, CI, dependencias o variables de entorno sin necesidad directa.
- Mantener cambios atomicos, pequenos y verificables.
- Agregar tests cuando se toca logica de negocio, permisos, validaciones, flujos criticos o integraciones.
- Actualizar docs cuando se agregan features, contratos, estados o decisiones.
- Correr validaciones antes de terminar.
- Mantener TypeScript estricto.
- Usar Zod para validar inputs externos, server actions, API routes, webhooks y respuestas de Zoho.
- Separar UI, dominio, servicios y persistencia.
- No mezclar logica de negocio en componentes visuales.
- No hardcodear datos sensibles.
- No usar `any` salvo justificacion documentada en el PR.
- No crear archivos gigantes; dividir por responsabilidad cuando un archivo deja de ser facil de revisar.
- No tocar integracion Zoho real hasta tener variables, nombres de modulos, campos y contratos confirmados.
- Usar mocks/stubs para Zoho, email y PDF durante desarrollo local y tests.

## Checklist final obligatorio

Antes de terminar cualquier tarea:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Resumir cambios.
- Listar archivos modificados.
- Listar riesgos.
- Listar proximos pasos.
