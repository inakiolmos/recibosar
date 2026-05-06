# Receiptile ARG

Sistema de tickets digitales entregados vía NFC, sin app, sin email, sin registro — con integración a factura electrónica ARCA (ex-AFIP) y módulo de marketing/loyalty.

## Qué es

El cliente apoya el celular en una "tile" NFC en el mostrador del comercio y se le abre el ticket digital en el navegador. Sin descargar nada, sin dar un email, sin registrarse.

Desde la página puede:
- Guardar el ticket como imagen en Photos
- Descargar PDF
- Agregarlo a Apple Wallet
- Enviarlo a su email (opcional)
- Ver el comprobante fiscal (CAE de ARCA) si aplica

El comercio accede a un dashboard para ver métricas, configurar su branding y gestionar sus tiles.

## Problema que resuelve

- El ticket de papel se pierde, se ensucia, no sirve para garantías
- El comprobante fiscal de ARCA no llega al cliente de forma amigable
- Los comercios no tienen forma de hacer marketing post-venta sin pedir datos

## Stack

| Componente | Tecnología |
|---|---|
| Backend / API | Node.js + TypeScript + Fastify |
| Base de datos | PostgreSQL (Supabase) |
| Storage (PDFs, assets) | Cloudflare R2 |
| Frontend (público + dashboard) | Next.js 14 (App Router) + Tailwind CSS |
| Bridge (captura de tickets) | Python 3.11+ |
| Infra local | Docker Compose |
| Deploy | Railway / Render |

## Estructura del repo

```
receiptile-arg/
├── api/          # Backend Fastify (Node.js + TypeScript)
├── web/          # Frontend Next.js (página pública + dashboard)
├── bridge/       # Servicio Python: emula impresora ESC/POS
├── packages/
│   └── types/    # Tipos TypeScript compartidos entre api/ y web/
├── infra/        # Docker Compose, configs de deploy
└── docs/         # Documentación técnica
```

## Setup local

> Requiere: Node.js 20+, Python 3.11+, Docker Desktop

```bash
# 1. Clonar el repo
git clone <repo-url>
cd receiptile-arg

# 2. Levantar infraestructura local (Postgres, etc.)
docker compose up -d

# 3. Instalar dependencias del backend
cd api && npm install

# 4. Instalar dependencias del frontend
cd ../web && npm install

# 5. Instalar dependencias del bridge
cd ../bridge && pip install -r requirements.txt

# 6. Variables de entorno
cp api/.env.example api/.env
cp web/.env.example web/.env
# Editar los .env con tus valores locales

# 7. Correr migraciones
cd api && npm run db:migrate

# 8. Levantar todo
# En terminales separadas:
cd api && npm run dev
cd web && npm run dev
cd bridge && python src/main.py
```

## Documentación

- [Arquitectura técnica](docs/ARCHITECTURE.md)
- [Roadmap por fases](docs/ROADMAP.md)
- [Decisiones técnicas (ADR)](docs/DECISIONS.md)
- [Preguntas abiertas](docs/OPEN-QUESTIONS.md)
