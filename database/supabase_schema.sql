-- ============================================================
-- MyPhotoLife - Database Schema (PostgreSQL for Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  subdomain       VARCHAR(100) UNIQUE,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  pix_key         VARCHAR(255),
  pix_key_type    VARCHAR(20) DEFAULT 'random' CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  bio             TEXT,
  gateway_config  JSONB,
  theme_config    JSONB,
  storage_quota   BIGINT       NOT NULL DEFAULT 1073741824,
  storage_used    BIGINT       NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_subdomain ON tenants (subdomain);
CREATE INDEX idx_tenants_slug ON tenants (slug);

-- 2. USERS
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','editor')),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users (tenant_id);

-- 3. ALBUMS
CREATE TABLE albums (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  cover_media_id  UUID, -- FK added at the end
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_public       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_for_sale     BOOLEAN      NOT NULL DEFAULT FALSE,
  display_order   INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_albums_tenant ON albums (tenant_id);
CREATE INDEX idx_albums_public ON albums (tenant_id, is_public);
CREATE INDEX idx_albums_order ON albums (tenant_id, display_order);

-- 4. MEDIA_FILES
CREATE TABLE media_files (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  album_id          UUID         REFERENCES albums(id) ON DELETE SET NULL,
  filename          VARCHAR(255) NOT NULL,
  original_path     VARCHAR(512) NOT NULL,
  optimized_path    VARCHAR(512),
  thumbnail_path    VARCHAR(512),
  blurhash          VARCHAR(128),
  mime_type         VARCHAR(50)  NOT NULL,
  size_bytes        BIGINT       NOT NULL DEFAULT 0,
  width             INT          NOT NULL DEFAULT 0,
  height            INT          NOT NULL DEFAULT 0,
  is_for_sale       BOOLEAN      NOT NULL DEFAULT FALSE,
  price             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  display_order     INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_media_tenant ON media_files (tenant_id);
CREATE INDEX idx_media_album ON media_files (album_id);
CREATE INDEX idx_media_sale ON media_files (tenant_id, is_for_sale);
CREATE INDEX idx_media_order ON media_files (album_id, display_order);

ALTER TABLE albums ADD CONSTRAINT fk_albums_cover FOREIGN KEY (cover_media_id) REFERENCES media_files(id) ON DELETE SET NULL;

-- 5. ORDERS
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name     VARCHAR(255) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(20),
  total_amount      DECIMAL(10,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled','refunded')),
  pix_qrcode        TEXT,
  pix_copy_paste    TEXT,
  pix_expires_at    TIMESTAMP WITH TIME ZONE,
  gateway_payment_id VARCHAR(255),
  paid_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_tenant ON orders (tenant_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_gateway ON orders (gateway_payment_id);

-- 6. ORDER_ITEMS
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  media_file_id   UUID         REFERENCES media_files(id) ON DELETE SET NULL,
  album_id        UUID         REFERENCES albums(id) ON DELETE SET NULL,
  item_type       VARCHAR(20)  NOT NULL CHECK (item_type IN ('photo','album')),
  title           VARCHAR(255) NOT NULL,
  quantity        INT          NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_items_order ON order_items (order_id);
CREATE INDEX idx_items_media ON order_items (media_file_id);

-- 7. SCHEDULE (Agenda de Eventos)
CREATE TABLE schedule (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  event_date      DATE NOT NULL,
  location        VARCHAR(255) DEFAULT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'Agenda Aberta',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_schedule_tenant ON schedule (tenant_id);
CREATE INDEX idx_schedule_date ON schedule (tenant_id, event_date);

-- 8. CONTACT_MESSAGES
CREATE TABLE contact_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_name     VARCHAR(255) NOT NULL,
  sender_email    VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) DEFAULT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_contact_tenant ON contact_messages (tenant_id);
