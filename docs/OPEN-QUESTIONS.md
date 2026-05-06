# Preguntas abiertas — Receiptile ARG

Decisiones que todavía no están tomadas. Cada una necesita ser resuelta antes de la fase indicada.

---

## OQ-001: Problema del multi-cajero

**Necesaria para:** Fase 6
**Contexto:** Si un local tiene 4 cajas y los 4 cajeros emiten tickets simultáneamente, ¿cómo sabe el server cuál ticket darle al cliente que apoyó el celu en la tile?

**Opciones evaluadas:**

### Opción A — Una tile por caja ⭐ MVP actual
El comercio tiene una tile por cada caja. La URL de la tile incluye el ID de la tile, y el servidor asocia el tap al último ticket de esa tile específica.

- **Pro:** simple, determinista, no hay ambigüedad
- **Con:** requiere más hardware (una tile por caja). El cajero tiene que apoyar el celu en *su* tile, no en cualquiera
- **Status:** implementado en MVP combinado con OQ-001 opción B

### Opción B — Ventana temporal + ticket más reciente ⭐ MVP actual
Una sola tile por comercio. El servidor devuelve el ticket más reciente en los últimos N minutos.

- **Pro:** cero hardware extra, cero configuración
- **Con:** falla con cobros simultáneos. El cliente puede recibir el ticket del cajero de al lado
- **Status:** implementado en MVP (DEC-006), ventana de 5 min

### Opción C — Tile dinámica con NTAG424 DNA
La caja escribe la URL del chip antes de cada tap. La URL incluye el ID de la transacción.

- **Pro:** asociación perfecta, cero ambigüedad
- **Con:** requiere hardware de escritura NFC en la caja, NTAG424 es más caro, complejidad de integración
- **Status:** candidata para Fase 6

### Opción D — Confirmación del cajero
El cajero ve en su pantalla "ticket listo" y aprieta un botón que "arma" la tile por 30 segundos.

- **Pro:** sin hardware extra, UX clara
- **Con:** agrega un paso al cajero (fricción), requiere app o interfaz para el cajero
- **Status:** a evaluar en Fase 3

### Opción E — Pantalla en la tile (e-ink o LED)
La tile muestra los últimos 4 dígitos del total para que el cliente confirme cuál es el suyo.

- **Pro:** UX interesante, el cliente puede verificar
- **Con:** requiere tile con pantalla (batería, CPU), mucho más cara y compleja
- **Status:** descartada para MVP, posible feature premium

---

## OQ-002: Stack definitivo del backend

**Necesaria para:** Fase 1
**Status:** ✅ Resuelta → DEC-007 (Node.js + TypeScript + Fastify)

---

## OQ-003: Modelo de distribución de Raspberry Pi a comercios

**Necesaria para:** Fase 2
**Contexto:** ¿Cómo llega la Raspberry Pi al local del comerciante?

**Opciones:**
- **Vendida preconfigurada:** margen de hardware, pero el comerciante la posee. Soporte más simple.
- **Prestada/alquilada:** menor barrera de entrada, pero requiere recuperarla si dan de baja.
- **El comerciante la compra y nosotros configuramos remotamente:** menor costo inicial pero depende de que tenga habilidad técnica mínima.

**Preguntas relacionadas:**
- ¿Cuánto vale una RPi Zero 2W + tile NFC en Argentina hoy?
- ¿Cuánto del costo se puede amortizar en el plan de suscripción?

---

## OQ-004: Privacidad de los ítems del ticket

**Necesaria para:** Fase 1 (definir antes de guardar datos en producción)
**Contexto:** Guardamos en la tabla `tickets` los ítems comprados por cada cliente. ¿Es esto PII bajo la Ley 25.326 (Ley de Protección de Datos Personales Argentina)?

**Preguntas a resolver:**
- El item no está asociado a ninguna persona identificada (sin login del cliente). ¿Es igual PII?
- ¿Por cuánto tiempo guardamos los tickets? ¿Necesitamos política de retención?
- ¿El comercio es el responsable del tratamiento de datos o lo somos nosotros?
- ¿Necesitamos un aviso de privacidad en la página pública del ticket?

---

## OQ-005: Rate limiting y abuso de la URL pública

**Necesaria para:** Fase 1
**Contexto:** La URL `/r/:merchantSlug` es pública y sin auth. Si alguien la scrapea o hace tap mil veces:

- Generamos mil filas en `ticket_views`
- Podemos inflar las métricas del comerciante
- Podemos generar carga innecesaria en la DB

**Estrategias a evaluar:**
- Rate limiting por IP (X requests / minuto)
- Fingerprint del user-agent para deduplicar vistas
- Flag de "view sospechosa" en lugar de bloquear

---

## OQ-006: Clonación de la tile con NTAG213

**Necesaria para:** Fase 2 (antes de producción con comercios reales)
**Contexto:** Con NTAG213, cualquiera con un Android puede clonar la tile y crear una tile falsa que apunte al mismo merchant. Un atacante podría hacer tap en su tile falsa y ver los tickets de un comercio (información de precios, volumen de ventas).

**Opciones:**
- **Migrar a NTAG424 DNA:** tiene autenticación criptográfica, no se puede clonar. Más caro.
- **Oscurecer el merchant_slug:** usar un UUID largo en lugar de un slug legible. Reduce la utilidad de clonar.
- **Aceptar el riesgo en MVP:** los datos expuestos (ticket de un cliente) son de bajo riesgo.

---

## OQ-007: Resilience offline del bridge

**Necesaria para:** Fase 2
**Contexto:** Si el comercio se queda sin internet mientras está cobrando, ¿el bridge guarda los tickets en cola y los sube cuando vuelve la conexión?

**Decisión pendiente:**
- ¿Cola en memoria (se pierde si reinicia el proceso) o persistida en SQLite?
- ¿Cuánto tiempo se retienen tickets no subidos?
- ¿Qué pasa con la tile mientras tanto? (muestra el último ticket que sí llegó al server)

---

## OQ-008: Multi-merchant en una tile genérica

**Necesaria para:** Fase 3
**Contexto:** ¿Tiene sentido permitir que un cajero "active" una tile genérica para su comercio por sesión? Por ejemplo, en una feria donde múltiples comerciantes comparten tiles.

**Opinión preliminar:** descartado para MVP por complejidad. El modelo 1 tile = 1 merchant es suficiente.

---

## OQ-009: Plataforma de deploy definitiva

**Necesaria para:** Fase 1
**Contexto:** Railway vs Render para la API. Vercel para el frontend (Next.js nativo).

**Consideraciones:**
- Railway tiene mejor DX y pricing más predecible
- Render tiene free tier más generoso
- Ambos soportan deploy desde GitHub
- Decidir antes de la primera demo pública
