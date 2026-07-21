import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .maybeSingle();

    if (error || !tenant) {
      return jsonResponse({ message: 'Perfil não encontrado' }, 404);
    }

    return jsonResponse({ tenant });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar perfil' }, 500);
  }
}

export async function PATCH(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  const allowedFields = [
    'name', 'bio', 'pix_key', 'pix_key_type', 'phone', 'whatsapp',
    'contact_email', 'instagram', 'twitter', 'facebook', 'linkedin',
    'youtube', 'tiktok', 'storage_quota', 'theme_config',
  ];

  try {
    const body = await request.json().catch(() => ({}));
    const updates = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] === 'string') {
          updates[field] = body[field].trim() || null;
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: 'Nenhum campo para atualizar.' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', user.tenant_id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao atualizar perfil.' }, 500);
    }

    return jsonResponse({ tenant, message: 'Perfil atualizado com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao atualizar perfil.' }, 500);
  }
}
