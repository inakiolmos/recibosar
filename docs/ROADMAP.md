# Roadmap — Receiptile ARG

## Fase 0 — Setup ✅ (sesión actual)

- [x] Crear repo y estructura de carpetas
- [x] Documentación inicial (README, ARCHITECTURE, DECISIONS, OPEN-QUESTIONS)
- [x] Definir stack final: Node.js + TypeScript + Fastify / Next.js / Python

---

## Fase 1 — End-to-end mock

**Objetivo:** hacer tap en una tile real y ver un ticket en el celular.

- [ ] API: `POST /api/tickets` — recibe ticket y lo guarda en DB
- [ ] API: `GET /r/:merchantSlug` — devuelve el último ticket del merchant (últimos 5 min)
- [ ] Web: página pública del ticket (mobile-first, SSR)
- [ ] DB: migraciones iniciales con Supabase
- [ ] Docker Compose funcional (Postgres local + API + Web)
- [ ] Seed data: un merchant y algunos tickets de ejemplo
- [ ] `.env.example` documentados

**Demo de la fase:** sticker NFC programado con NFC Tools apuntando a localhost vía ngrok. Apoyar el celu en el sticker y ver el ticket en el browser.

---

## Fase 2 — Bridge real

**Objetivo:** capturar un ticket de una impresora térmica de verdad.

- [ ] Bridge Python: servidor que emula impresora ESC/POS por USB
- [ ] Parser ESC/POS: convierte stream crudo a JSON `{items, totales, fecha}`
- [ ] Tests unitarios del parser con fixtures de tickets reales
- [ ] Bridge hace POST a la API y reintenta si no hay conexión
- [ ] Cola local para resilience offline (SQLite o archivo JSON)
- [ ] Prueba con impresora térmica USB de prueba

---

## Fase 3 — Dashboard del comerciante

**Objetivo:** el comerciante puede ver qué pasa con sus tickets.

- [ ] Auth: registro y login de comerciantes (JWT)
- [ ] Dashboard: tickets emitidos hoy / esta semana / este mes
- [ ] Métricas: total tickets, total taps, % tap-to-save
- [ ] Configurar branding: subir logo, elegir color
- [ ] Configurar módulo de loyalty: texto del cupón, link a IG
- [ ] Gestionar tiles: cuántas, dónde, qué URL apuntan

---

## Fase 4 — Formatos de salida

**Objetivo:** el cliente puede llevarse el ticket en cualquier formato.

- [ ] Generación de PDF on-demand
- [ ] Apple Wallet pass (`.pkpass`)
- [ ] Envío por email (transaccional)
- [ ] Botón "guardar en Photos" (captura del DOM con html2canvas o equivalente)

---

## Fase 5 — Integración ARCA (factura electrónica)

**Objetivo:** el ticket digital y el comprobante fiscal son la misma cosa.

- [ ] Linkear CAE recibido desde el bridge al ticket en DB
- [ ] Mostrar QR del comprobante ARCA en la página pública
- [ ] Investigar viabilidad de emitir factura electrónica desde el sistema
- [ ] Definir modelo legal: somos emisor o intermediario

---

## Fase 6 — Hardware avanzado y multi-cajero

**Objetivo:** soporte para locales con múltiples cajas.

- [ ] Tile con LED de confirmación (parpadea cuando hay ticket nuevo)
- [ ] NTAG424 DNA: URL dinámica por transacción (la caja escribe el chip)
- [ ] Solución definitiva para multi-cajero (ver OPEN-QUESTIONS.md)
- [ ] Deployment a Raspberry Pi: imagen preconfigurada para comercios
