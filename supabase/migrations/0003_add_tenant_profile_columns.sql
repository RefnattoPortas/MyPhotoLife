-- ============================================================
-- MyPhotoLife - Add profile columns to tenants table
-- ============================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS headline        VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone           VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp        VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email   VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS instagram       VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twitter         VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS facebook        VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS linkedin        VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS youtube         VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tiktok          VARCHAR(255);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
