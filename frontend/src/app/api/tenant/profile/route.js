import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

const ALLOWED_FIELDS = [
  'name', 'headline', 'bio', 'pix_key', 'pix_key_type', 'phone', 'whatsapp',
  'contact_email', 'instagram', 'twitter', 'facebook', 'linkedin',
  'youtube', 'tiktok', 'theme_config',
];

function safeLog({ operation, table, rows, tenantRef, code }) {
  console.log(JSON.stringify({
    severity: code >= 500 ? 'error' : 'warn',
    operation,
    table,
    rows,
    tenantRef,
    code,
  }));
}

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

    if (error) {
      safeLog({ operation: 'select', table: 'tenants', tenantRef: user.tenant_id?.slice(0, 8), code: error.code || 500 });
      return jsonResponse({ message: 'Erro ao carregar perfil' }, 500);
    }

    if (!tenant) {
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

  try {
    const body = await request.json().catch(() => ({}));
 
    const updates = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] === undefined) continue;

      if (field === 'theme_config') {
        const existing = body.theme_config;
        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
          const clean = {};
          for (const k of ['template', 'bg_color', 'hover_color', 'text_color', 'font', 'cover_url', 'profile_photo_url']) {
            if (existing[k] !== undefined) {
              clean[k] = typeof existing[k] === 'string' ? existing[k].trim() || null : existing[k];
            }
          }
          if (Object.keys(clean).length > 0) updates.theme_config = clean;
        }
        continue;
      }

      if (typeof body[field] === 'string') {
        updates[field] = body[field].trim() || null;
      } else {
        updates[field] = body[field];
      }
    }

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: 'Nenhum campo válido para atualizar.' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', user.tenant_id)
      .select()
      .single();

    if (error) {
      safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: error.code || 500 });
      return jsonResponse({ message: 'Não foi possível salvar suas configurações. Tente novamente.' }, 500);
    }

    if (!tenant) {
      safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: 'NO_ROWS' });
      return jsonResponse({ message: 'Perfil não encontrado.' }, 404);
    }

    safeLog({ operation: 'update', table: 'tenants', rows: 1, tenantRef: user.tenant_id?.slice(0, 8), code: 200 });
    return jsonResponse({ tenant, message: 'Configurações salvas com sucesso!' });
  } catch (err) {
    safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: 'UNEXPECTED' });
    return jsonResponse({ message: 'Não foi possível salvar suas configurações. Tente novamente.' }, 500);
  }
}
