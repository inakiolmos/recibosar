# Decisiones técnicas — Receiptile ARG

Log de decisiones de arquitectura (ADR liviano). Una vez registradas, estas decisiones no se revierten sin una nueva entrada que las reemplace.

---

## DEC-001: Tile pasiva en MVP

**Estado:** Aceptada
**Fecha:** 2026-05-06

La tile NFC es completamente pasiva en el MVP: sin batería, sin LED, sin CPU, sin Wi-Fi. Toda la inteligencia vive en el servidor.

**Motivación:** reducir complejidad de hardware al mínimo para validar el producto. Un sticker NFC de $1 es suficiente para probar el flujo completo.

**Consecuencias:** no podemos mostrar feedback visual en la tile (ej: "ticket listo"). Eso se resuelve en Fase 6.

---

## DEC-002: URL de la tile es fija por merchant

**Estado:** Aceptada
**Fecha:** 2026-05-06

La URL grabada en el chip NFC es fija y apunta al merchant, no a la transacción. Formato: `/r/{merchant_slug}`.

**Motivación:** con NTAG213 (MVP) no podemos reescribir el chip en cada transacción. La URL fija es lo único viable con hardware pasivo barato.

**Consecuencias:** la asociación tap↔ticket se hace en el servidor con una ventana temporal. Ver DEC-006 y el problema de multi-cajero en OPEN-QUESTIONS.md.

---

## DEC-003: Bridge prioriza ESC/POS sobre integración por API

**Estado:** Aceptada
**Fecha:** 2026-05-06

El bridge implementa primero la estrategia de impresora virtual ESC/POS (Estrategia A), no la integración por webhook con POS modernos (Estrategia B).

**Motivación:** ESC/POS es universal. Funciona con cualquier caja registradora, software de punto de venta o sistema legacy sin necesidad de integración. La Estrategia B requiere integraciones custom por POS (Fudo, Bistrosoft, etc.) que son lentas de cerrar.

**Consecuencias:** el bridge requiere hardware físico (Raspberry Pi) en el local. La Estrategia B es un upgrade para Fase 2+.

---

## DEC-004: El ticket digital no reemplaza al comprobante fiscal

**Estado:** Aceptada
**Fecha:** 2026-05-06

La tile y el ticket digital son un complemento del comprobante fiscal de ARCA (ex-AFIP), no un reemplazo. La página del ticket puede linkear al comprobante oficial (con CAE) si está disponible, pero no lo sustituye legalmente.

**Motivación:** emitir comprobantes fiscales válidos requiere habilitación de ARCA y complejidad legal. No queremos bloquear el MVP con eso.

**Consecuencias:** los campos `fiscal_reference` y `fiscal_url` en la tabla `tickets` son opcionales para MVP. La integración ARCA es Fase 5.

---

## DEC-005: Cero login y cero email obligatorio para el cliente

**Estado:** Aceptada
**Fecha:** 2026-05-06

El cliente final (el que apoya el celu en la tile) no necesita registrarse ni dar su email. El email es una opción que el cliente puede elegir para recibir una copia, pero nunca es requerido.

**Motivación:** la fricción cero es la propuesta de valor central. Si el cliente tiene que registrarse, el producto falla.

**Consecuencias:** no tenemos un perfil de cliente. El módulo de loyalty no puede identificar al cliente entre visitas (a menos que el cliente elija dejar su email). Esto es una restricción de privacidad aceptada.

---

## DEC-006: Ventana temporal de 5 minutos para asociar tap↔ticket

**Estado:** Aceptada
**Fecha:** 2026-05-06

Cuando un cliente hace tap en una tile, el servidor busca el ticket más reciente de ese merchant emitido en los últimos 5 minutos. Ese tiempo es configurable por merchant.

**Motivación:** solución simple para el MVP con una tile por caja. Cubre el caso de uso normal (el cliente paga y toca la tile enseguida).

**Consecuencias:** falla si hay múltiples cajas con la misma tile o si hay mucho tiempo entre el cobro y el tap. Ver OPEN-QUESTIONS.md para las soluciones alternativas.

---

## DEC-007: Stack backend — Node.js + TypeScript + Fastify

**Estado:** Aceptada
**Fecha:** 2026-05-06

El backend usa Node.js con TypeScript y el framework Fastify. El frontend usa Next.js 14 (App Router) con TypeScript y Tailwind CSS.

**Motivación:**
- TypeScript en todo el stack JS (preferencia explícita del proyecto)
- Tipos compartidos entre API y web via `/packages/types/`
- El bridge ya es Python y es independiente; no gana nada usar Python en el backend
- Fastify es más rápido que Express y tiene mejor soporte TypeScript nativo
- Next.js SSR es ideal para la página pública del ticket (carga rápida en mobile)

**Consecuencias:** el repo es un monorepo con tres lenguajes (TypeScript, Python). El bridge Python y el backend TypeScript son servicios separados que se comunican por HTTP.

---

## DEC-008: Monorepo con estructura de carpetas por componente

**Estado:** Aceptada
**Fecha:** 2026-05-06

El repo es un monorepo con `api/`, `web/`, `bridge/`, `packages/` e `infra/` en la raíz. No se usa Turborepo ni Nx en el MVP; se gestiona manualmente.

**Motivación:** mantener todo junto facilita el desarrollo inicial y los PR. Si el repo crece, se puede migrar a Turborepo.
