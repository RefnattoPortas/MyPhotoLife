-- Criação da tabela de Fotógrafos / Tenants
CREATE TABLE IF NOT EXISTS public.photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  bio text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotógrafos são visíveis para todos" ON public.photographers FOR SELECT USING (true);
CREATE POLICY "Fotógrafos podem atualizar seu próprio perfil" ON public.photographers FOR UPDATE USING (auth.uid() = id);

-- Criação da tabela de Álbuns
CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  is_for_sale boolean DEFAULT false,
  cover_thumbnail text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Álbuns são visíveis para todos" ON public.albums FOR SELECT USING (true);
CREATE POLICY "Fotógrafos gerenciam seus álbuns" ON public.albums FOR ALL USING (auth.uid() = photographer_id);

-- Criação da tabela de Fotos (Mídias)
CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos são visíveis para todos" ON public.photos FOR SELECT USING (true);
-- Aqui usamos subquery para checar se o fotógrafo dono do álbum é o usuário logado
CREATE POLICY "Fotógrafos gerenciam fotos de seus álbuns" ON public.photos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.albums WHERE albums.id = photos.album_id AND albums.photographer_id = auth.uid())
);

-- Criação da tabela de Agenda
CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  location text,
  status text DEFAULT 'Agenda Aberta',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agenda é visível para todos" ON public.schedule FOR SELECT USING (true);
CREATE POLICY "Fotógrafos gerenciam sua agenda" ON public.schedule FOR ALL USING (auth.uid() = photographer_id);

-- Criação da tabela de Contatos / Mensagens
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
-- Qualquer um pode INSERIR um contato (anon)
CREATE POLICY "Visitantes podem enviar mensagens" ON public.contacts FOR INSERT WITH CHECK (true);
-- Apenas o fotógrafo dono pode LER e ATUALIZAR
CREATE POLICY "Fotógrafos leem suas próprias mensagens" ON public.contacts FOR SELECT USING (auth.uid() = photographer_id);
CREATE POLICY "Fotógrafos atualizam suas próprias mensagens" ON public.contacts FOR UPDATE USING (auth.uid() = photographer_id);


-- ==========================================
-- Configuração do Real-Time
-- ==========================================
-- Habilita o Real-Time para a tabela de contatos (para o fotógrafo receber notificações instantâneas)
alter publication supabase_realtime add table contacts;
