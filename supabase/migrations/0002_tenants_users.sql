-- ============================================================
-- MyPhotoLife - Add tenants and users tables (multi-tenant)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop policies if they exist (safe on PG <15)
DROP POLICY IF EXISTS "Tenants são visíveis para todos" ON public.tenants;
DROP POLICY IF EXISTS "Tenants podem atualizar seu próprio perfil" ON public.tenants;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.users;
DROP POLICY IF EXISTS "Owner pode gerenciar usuários do tenant" ON public.users;

-- 1. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
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

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants (subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);

-- 2. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','editor')),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users (tenant_id);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants são visíveis para todos" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Tenants podem atualizar seu próprio perfil" ON public.tenants FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner pode gerenciar usuários do tenant" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = users.tenant_id AND auth.uid() IN (SELECT id FROM public.users WHERE users.tenant_id = tenants.id AND role = 'owner'))
);
