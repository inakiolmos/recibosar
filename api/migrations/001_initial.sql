CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  brand_color     TEXT NOT NULL DEFAULT '#000000',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  location_label  TEXT,
  nfc_uid         TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  tile_id           UUID REFERENCES tiles(id),
  raw_payload       JSONB,
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          NUMERIC(12,2),
  tax               NUMERIC(12,2),
  total             NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ARS',
  emitted_at        TIMESTAMPTZ NOT NULL,
  fiscal_reference  TEXT,
  fiscal_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_merchant_emitted ON tickets(merchant_id, emitted_at DESC);

CREATE TABLE ticket_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT,
  action_taken  TEXT CHECK (action_taken IN ('pdf', 'wallet', 'email', 'photo', 'none'))
);
