-- ============================================================
-- MyPhotoLife - Database Schema (MySQL)
-- Multi-tenant SaaS para Fotógrafos Profissionais
-- Modelo: Tabela Compartilhada com Isolamento via tenant_id
-- ============================================================

CREATE DATABASE IF NOT EXISTS myphotolife
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE myphotolife;

-- -----------------------------------------------------------
-- 1. TENANTS (Fotógrafos / Contas)
-- -----------------------------------------------------------
CREATE TABLE tenants (
  id              CHAR(36) PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  subdomain       VARCHAR(100) UNIQUE,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  pix_key         VARCHAR(255),
  pix_key_type    ENUM('cpf','cnpj','email','phone','random') DEFAULT 'random',
  bio            TEXT,
  headline        VARCHAR(255) DEFAULT NULL,
  theme_config    JSON,
  instagram       VARCHAR(255) DEFAULT NULL,
  twitter         VARCHAR(255) DEFAULT NULL,
  phone           VARCHAR(30) DEFAULT NULL,
  whatsapp        VARCHAR(30) DEFAULT NULL,
  gateway_config  JSON,
  storage_quota   BIGINT       NOT NULL DEFAULT 1073741824,
  storage_used    BIGINT       NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tenants_subdomain (subdomain),
  INDEX idx_tenants_slug      (slug)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 2. USERS (Credenciais de Acesso)
-- -----------------------------------------------------------
CREATE TABLE users (
  id              CHAR(36) PRIMARY KEY,
  tenant_id       CHAR(36)     NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  role            ENUM('owner','admin','editor') NOT NULL DEFAULT 'owner',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_tenant_user_email (tenant_id, email),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_users_tenant (tenant_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 3. ALBUMS (Álbuns / Galerias)
-- -----------------------------------------------------------
CREATE TABLE albums (
  id              CHAR(36) PRIMARY KEY,
  tenant_id       CHAR(36)     NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  cover_media_id  CHAR(36),
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_public       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_for_sale     BOOLEAN      NOT NULL DEFAULT FALSE,
  display_order   INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_albums_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_albums_tenant     (tenant_id),
  INDEX idx_albums_public     (tenant_id, is_public),
  INDEX idx_albums_order      (tenant_id, display_order)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 4. MEDIA_FILES (Fotos / Arquivos de Mídia)
-- -----------------------------------------------------------
CREATE TABLE media_files (
  id                CHAR(36) PRIMARY KEY,
  tenant_id         CHAR(36)     NOT NULL,
  album_id          CHAR(36),
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
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_media_tenant FOREIGN KEY (tenant_id)  REFERENCES tenants(id)    ON DELETE CASCADE,
  CONSTRAINT fk_media_album  FOREIGN KEY (album_id)   REFERENCES albums(id)     ON DELETE SET NULL,
  INDEX idx_media_tenant     (tenant_id),
  INDEX idx_media_album      (album_id),
  INDEX idx_media_sale       (tenant_id, is_for_sale),
  INDEX idx_media_order      (album_id, display_order)
) ENGINE=InnoDB;

-- FK da capa do álbum (auto-referencial)
ALTER TABLE albums
  ADD CONSTRAINT fk_albums_cover FOREIGN KEY (cover_media_id)
  REFERENCES media_files(id) ON DELETE SET NULL;

-- -----------------------------------------------------------
-- 5. ORDERS (Pedidos / Transações)
-- -----------------------------------------------------------
CREATE TABLE orders (
  id                CHAR(36) PRIMARY KEY,
  tenant_id         CHAR(36)     NOT NULL,
  customer_name     VARCHAR(255) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(20),
  total_amount      DECIMAL(10,2) NOT NULL,
  status            ENUM('pending','paid','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
  pix_qrcode        TEXT,
  pix_copy_paste    TEXT,
  pix_expires_at    TIMESTAMP    NULL,
  gateway_payment_id VARCHAR(255),
  paid_at           TIMESTAMP    NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_orders_tenant   (tenant_id),
  INDEX idx_orders_status   (status),
  INDEX idx_orders_gateway  (gateway_payment_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 6. ORDER_ITEMS (Itens do Pedido)
-- -----------------------------------------------------------
CREATE TABLE order_items (
  id              CHAR(36) PRIMARY KEY,
  order_id        CHAR(36)     NOT NULL,
  media_file_id   CHAR(36),
  album_id        CHAR(36),
  item_type       ENUM('photo','album') NOT NULL,
  title           VARCHAR(255) NOT NULL,
  quantity        INT          NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_items_order     FOREIGN KEY (order_id)      REFERENCES orders(id)     ON DELETE CASCADE,
  CONSTRAINT fk_items_media     FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_album     FOREIGN KEY (album_id)      REFERENCES albums(id)      ON DELETE SET NULL,
  INDEX idx_items_order (order_id),
  INDEX idx_items_media (media_file_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 7. SCHEDULE (Agenda de Eventos)
-- -----------------------------------------------------------
CREATE TABLE schedule (
  id              CHAR(36) PRIMARY KEY,
  tenant_id       CHAR(36)     NOT NULL,
  title           VARCHAR(255) NOT NULL,
  event_date      DATE NOT NULL,
  location        VARCHAR(255) DEFAULT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'Agenda Aberta',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_schedule_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_schedule_tenant (tenant_id),
  INDEX idx_schedule_date (tenant_id, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
