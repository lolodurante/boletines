# ADR-001 Agent-first repository

## Estado

Aceptada.

## Contexto

El repositorio nace desde v0 con base visual util, pero con datos mock y logica mezclada en UI. Antes de sumar features se necesita una estructura verificable para multiples agentes.

## Decision

Separar dominio, validaciones, servicios, integraciones, mocks y documentacion. Mantener UI existente y migrarla gradualmente hacia `features` y servicios tipados.

## Consecuencias

- Las features nuevas deben entrar por contratos y tests.
- Email y PDF operan en modo stub hasta tener informacion real.
- CI valida lint, typecheck, tests y build.
