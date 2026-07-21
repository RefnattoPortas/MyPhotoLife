import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function POST(request, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' }, 503);
  }

  try {
    const { slug } = params;
    const body = await request.json().catch(() => ({}));
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return jsonResponse({ error: true, code: 'VALIDATION', message: 'Nome, email e mensagem são obrigatórios.' }, 400);
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, contact_email')
      .eq('slug', slug.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!tenant) {
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Portfólio não encontrado' }, 404);
    }

    const { error: insertError } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        tenant_id: tenant.id,
        sender_name: name.trim(),
        sender_email: email.trim().toLowerCase(),
        subject: subject || 'Contato via Portfólio',
        message: message.trim(),
      });

    if (insertError) {
      return jsonResponse({ error: true, code: 'SAVE_ERROR', message: 'Erro ao enviar mensagem. Tente novamente.' }, 500);
    }

    return jsonResponse({ message: 'Mensagem enviada com sucesso!' });
  } catch {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Erro ao enviar mensagem. Tente novamente.' }, 500);
  }
}
