import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

const ALLOWED_FIELDS = [
  'name', 'headline', 'bio', 'pix_key', 'pix_key_type', 'phone', 'whatsapp',
  'contact_email', 'instagram', 'twitter', 'facebook', 'linkedin',
  'youtube', 'tiktok', 'theme_config',
];

function safeLog({ operation, table, rows, tenantRef, code, detail }) {
  console.log(JSON.stringify({
    severity: code >= 500 ? 'error' : 'warn',
    operation,
    table,
    rows,
    tenantRef,
    code,
    ...(detail ? { detail } : {}),
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

    safeLog({ operation: 'profile_get', table: 'tenants', rows: 1, tenantRef: tenant.id?.slice(0, 8), code: 200, detail: JSON.stringify({ slug: tenant.slug, is_active: tenant.is_active, has_tc: !!tenant.theme_config }) });
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
        if (body.theme_config && typeof body.theme_config === 'object' && !Array.isArray(body.theme_config)) {
          updates.theme_config = body.theme_config;
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

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', user.tenant_id);

    if (updateError) {
      const msg = updateError.message || 'Erro no banco de dados';
      safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: updateError.code || 500, detail: msg });
      return jsonResponse({ message: `Erro ao salvar: ${msg}` }, 500);
    }

    const { data: tenant, error: selectError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .maybeSingle();

    if (selectError) {
      safeLog({ operation: 'select', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: selectError.code || 500, detail: selectError.message });
      return jsonResponse({ message: 'Erro ao carregar perfil atualizado' }, 500);
    }

    if (!tenant) {
      safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: 'NO_ROWS' });
      return jsonResponse({ message: 'Perfil não encontrado.' }, 404);
    }

    const responseTc = tenant?.theme_config;
    safeLog({
      operation: 'update', table: 'tenants', rows: 1, tenantRef: user.tenant_id?.slice(0, 8), code: 200,
      detail: JSON.stringify({
        keys: Object.keys(updates),
        requestTc: updates.theme_config,
        responseTc,
        tcMatch: JSON.stringify(updates.theme_config) === JSON.stringify(responseTc),
      })
    });
    return jsonResponse({ tenant, message: 'Configurações salvas com sucesso!' });
  } catch (err) {
    const msg = err?.message || 'Erro inesperado';
    safeLog({ operation: 'update', table: 'tenants', rows: 0, tenantRef: user.tenant_id?.slice(0, 8), code: 'UNEXPECTED', detail: msg });
    return jsonResponse({ message: `Erro ao salvar: ${msg}` }, 500);
  }
}
