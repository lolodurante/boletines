# Convenciones

## Naming

- Componentes React en PascalCase.
- Hooks en camelCase empezando con `use`.
- Servicios con sufijo `Service` cuando sean clases o con nombre de dominio claro cuando sean funciones.
- Repositorios con sufijo `Repository`.
- Schemas con sufijo `Schema`.
- Tipos con nombres explicitos del dominio, no abreviaturas genericas.

## Arquitectura

- UI compartida en `components` y UI por dominio en `features`.
- Logica de negocio en `server/services`.
- Acceso a datos en `server/repositories`.
- Validaciones en `lib/validations`.
- Tipos compartidos en `types`.
- Integraciones externas en `lib/zoho`, `lib/email` y `lib/pdf`.

## TypeScript

- `strict`, `noImplicitAny` y `strictNullChecks` deben permanecer activos.
- Preferir tipos derivados de schemas Zod para inputs externos.
- Usar discriminated unions para estados complejos.
- Evitar `any`; si no hay alternativa, documentar la razon.

## Validacion

- Todo input externo se valida con Zod.
- Server actions y API routes validan payload antes de llamar servicios.
- Respuestas externas de Zoho deben validarse.
- Datos usados para PDF deben validarse antes de generar.

## Errores

- Usar errores tipados de `lib/errors`.
- No mostrar errores internos al usuario.
- Loggear errores con contexto mediante `lib/logger`.
- Mantener mensajes user-friendly.

## UI

- Usar shadcn/ui.
- Mantener componentes pequenos y con props tipadas.
- Separar container/presentational cuando el componente mezcla carga de datos y render.
- Cubrir estados loading, empty, error y success cuando aplique.
- Mantener accesibilidad basica: labels, foco, contraste y acciones con texto claro.

## Testing

- Unit tests para servicios puros y validaciones.
- Integration tests para flujos criticos.
- E2E para director, docente y envio de boletin cuando exista backend real.
- Mocks para Zoho y email en tests y desarrollo local.
