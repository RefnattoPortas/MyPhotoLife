-- ============================================
-- Fix existing schedule table + add contact_messages
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old policies from 0001_initial.sql if they exist
DROP POLICY IF EXISTS "Schedule visible to everyone" ON public.schedule;
DROP POLICY IF EXISTS "Fotógrafos gerenciam sua agenda" ON public.schedule;
DROP POLICY IF EXISTS "Users manage their schedule" ON public.schedule;

-- Drop old schedule table (it has photographer_id, we need tenant_id)
DROP TABLE IF EXISTS public.schedule CASCADE;

-- Recreate schedule with tenant_id
CREATE TABLE public.schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  event_date      DATE NOT NULL,
  location        VARCHAR(255) DEFAULT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'Agenda Aberta',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_tenant ON public.schedule (tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON public.schedule (tenant_id, event_date);

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedule visible to everyone" ON public.schedule FOR SELECT USING (true);
CREATE POLICY "Users manage their schedule" ON public.schedule FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);

-- Drop old contact_messages policies if they exist
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users read their contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users update their contact messages" ON public.contact_messages;

-- Create contact_messages (does not exist from 0001)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_name     VARCHAR(255) NOT NULL,
  sender_email    VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) DEFAULT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_tenant ON public.contact_messages (tenant_id);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read their contact messages" ON public.contact_messages FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);
CREATE POLICY "Users update their contact messages" ON public.contact_messages FOR UPDATE USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
);
