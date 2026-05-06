# Arquitectura técnica — Receiptile ARG

## Visión general

```
┌─────────────┐     ESC/POS     ┌──────────────┐    POST /api/tickets    ┌─────────────┐
│  Sistema    │ ──────────────► │    Bridge    │ ──────────────────────► │     API     │
│  de cobro   │                 │   (Python)   │                         │  (Fastify)  │
│  (caja)     │                 └──────────────┘                         └──────┬──────┘
└─────────────┘                                                                 │
                                                                                │ PostgreSQL
                                                                         ┌──────▼──────┐
┌─────────────┐      NFC tap     ┌──────────────┐    GET /r/:slug        │     DB      │
│   Cliente   │ ──────────────► │  Tile NFC    │ ──────────────────────►│  (Supabase) │
│  (celular)  │                 │  (pasiva)    │        Next.js SSR      └─────────────┘
└─────────────┘                 └──────────────┘
```

## Componentes

### 1. Tile NFC (hardware)

- Chip pasivo NTAG213 (MVP) / NTAG424 DNA (producción)
- URL fija grabada: `https://app.dominio.com.ar/r/{merchant_slug}`
- Sin batería, sin CPU, sin Wi-Fi. Es un objeto pasivo.
- En MVP se simula con cualquier sticker NFC programado con NFC Tools desde Android.

### 2. Bridge (servicio Python)

Ubicación: `/bridge/`

Captura el ticket desde el sistema de cobro y lo sube a la API.

**Estrategia A — Impresora virtual ESC/POS (MVP)**
- Corre en Raspberry Pi Zero 2W (o cualquier máquina local) dentro del comercio
- Se registra como impresora ante el sistema de cobro (Bluetooth, USB o TCP)
- Parsea el stream ESC/POS a JSON estructurado
- Hace POST a la API con el ticket
- Loguea localmente para resilience offline

**Estrategia B — Webhook desde POS modernos (Fase 2)**
- Para sistemas como Fudo, Bistrosoft, Maxirest, Square
- Consume eventos de "ticket emitido" por webhook

```
bridge/
├── src/
│   ├── main.py              # Entry point
│   ├── parsers/
│   │   └── escpos.py        # Parser ESC/POS → JSON estructurado
│   ├── transport/
│   │   ├── bluetooth.py     # Recepción por Bluetooth
│   │   ├── usb.py           # Recepción por USB
│   │   └── tcp.py           # Recepción por TCP (socket)
│   ├── uploader.py          # POST a la API, retry logic
│   └── queue.py             # Cola local para offline resilience
└── tests/
```

### 3. API Backend

Ubicación: `/api/`

Stack: **Node.js + TypeScript + Fastify**

```
api/
├── src/
│   ├── routes/
│   │   ├── tickets.ts       # POST /api/tickets, GET /api/tickets/:id/*
│   │   ├── merchants.ts     # GET /api/merchants/:id/dashboard
│   │   └── auth.ts          # POST /api/auth/*
│   ├── services/
│   │   ├── ticket.service.ts
│   │   ├── pdf.service.ts
│   │   ├── wallet.service.ts
│   │   └── email.service.ts
│   ├── models/              # Tipos y queries de DB
│   └── lib/
│       ├── db.ts            # Cliente PostgreSQL
│       └── storage.ts       # Cliente R2/S3
└── tests/
```

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/tickets` | Bridge sube un ticket nuevo |
| `GET` | `/r/:merchantSlug` | Página pública del último ticket (URL de la tile) |
| `GET` | `/api/tickets/:id/pdf` | Genera PDF on-demand |
| `GET` | `/api/tickets/:id/wallet` | Genera `.pkpass` para Apple Wallet |
| `POST` | `/api/tickets/:id/email` | Envía ticket por mail |
| `GET` | `/api/merchants/:id/dashboard` | Datos del dashboard |
| `POST` | `/api/auth/login` | Auth del comerciante |
| `POST` | `/api/auth/register` | Registro de comerciante |

**Lógica clave de `GET /r/:merchantSlug`:**
1. Buscar en DB el último ticket del merchant en los últimos N minutos (default: 5)
2. Si existe → renderizar página del ticket con branding del comercio
3. Si no existe → mostrar "No hay ticket disponible, pedile al cajero que lo emita de nuevo"
4. Loguear el tap (analytics) en `TicketView`

### 4. Frontend

Ubicación: `/web/`

Stack: **Next.js 14 (App Router) + Tailwind CSS**

```
web/src/app/
├── r/[merchantSlug]/
│   └── page.tsx             # Página pública del ticket (SSR, mobile-first)
├── dashboard/
│   ├── layout.tsx           # Layout con auth
│   ├── page.tsx             # Overview métricas
│   ├── tickets/page.tsx     # Lista de tickets
│   ├── branding/page.tsx    # Configurar logo, colores
│   └── tiles/page.tsx       # Gestionar tiles
└── layout.tsx
```

**Página pública del ticket** (`/r/:merchantSlug`):
- SSR para carga rápida en mobile
- Header con logo y nombre del comercio
- Items, precios, total, fecha/hora
- Botones: Guardar en Photos, PDF, Apple Wallet, Email
- Módulo de loyalty/marketing (configurable)
- Link al comprobante fiscal ARCA (si existe CAE)
- Cero JavaScript de terceros, cero tracking

### 5. Tipos compartidos

Ubicación: `/packages/types/`

Package TypeScript compartido entre `api/` y `web/` para evitar duplicación de tipos.

```
packages/types/src/
├── ticket.ts
├── merchant.ts
└── index.ts
```

---

## Modelo de datos

### Merchant
```sql
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,  -- usado en /r/{slug}
  logo_url        TEXT,
  brand_color     TEXT DEFAULT '#000000',
  subscription_status TEXT DEFAULT 'trial',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### User (admin del merchant)
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  email           TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tile
```sql
CREATE TABLE tiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  location_label  TEXT,                  -- ej: "Caja 1", "Mostrador"
  nfc_uid         TEXT,                  -- UID del chip si lo conocemos
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Ticket
```sql
CREATE TABLE tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID NOT NULL REFERENCES merchants(id),
  tile_id           UUID REFERENCES tiles(id),   -- opcional
  raw_payload       JSONB,                        -- stream ESC/POS original parseado
  items             JSONB NOT NULL,               -- [{desc, qty, unit_price, total}]
  subtotal          NUMERIC(12,2),
  tax               NUMERIC(12,2),
  total             NUMERIC(12,2) NOT NULL,
  currency          TEXT DEFAULT 'ARS',
  emitted_at        TIMESTAMPTZ NOT NULL,
  fiscal_reference  TEXT,                         -- CAE de ARCA si existe
  fiscal_url        TEXT,                         -- link al comprobante ARCA
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_merchant_emitted ON tickets(merchant_id, emitted_at DESC);
```

### TicketView (analytics)
```sql
CREATE TABLE ticket_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES tickets(id),
  viewed_at    TIMESTAMPTZ DEFAULT NOW(),
  user_agent   TEXT,
  action_taken TEXT CHECK (action_taken IN ('pdf', 'wallet', 'email', 'photo', 'none'))
);
```

---

## Decisiones de infraestructura

- **Base de datos**: PostgreSQL vía Supabase (free tier para MVP)
- **Storage**: Cloudflare R2 para PDFs generados y assets de branding
- **Deploy API**: Railway o Render (definir en Fase 1)
- **Deploy Web**: Vercel (Next.js nativo)
- **Bridge**: Raspberry Pi Zero 2W en el local del comercio (Fase 2); en MVP corre en cualquier máquina

## Flujo de datos completo

```
1. Cajero cobra → sistema POS "imprime" ticket
2. Bridge captura stream ESC/POS
3. Bridge parsea → JSON {items, total, fecha, ...}
4. Bridge POST /api/tickets → API guarda en DB
5. Cliente apoya celular en tile NFC
6. Tile redirige a /r/{merchant_slug}
7. Next.js SSR: API busca último ticket del merchant (últimos 5 min)
8. Si existe → renderiza página con ticket + branding
9. Cliente elige acción (PDF, Wallet, Email, foto)
10. API loguea acción en ticket_views (analytics)
```
