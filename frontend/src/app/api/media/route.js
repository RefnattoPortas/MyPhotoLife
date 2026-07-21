import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.', media: [] }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const url = new URL(request.url);
    const albumId = url.searchParams.get('album_id');

    let query = supabaseAdmin
      .from('media_files')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (albumId) {
      query = query.eq('album_id', albumId);
    }

    const { data: media, error } = await query;

    if (error) {
      return jsonResponse({ message: 'Erro ao carregar mídias.', media: [] }, 500);
    }

    return jsonResponse({ media: media || [] });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar mídias.', media: [] }, 500);
  }
}
