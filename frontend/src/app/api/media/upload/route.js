import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function POST(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const albumId = formData.get('album_id') || null;

    if (!file) {
      return jsonResponse({ message: 'Arquivo não enviado.' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const mimeType = file.type;

    if (!mimeType.startsWith('image/')) {
      return jsonResponse({ message: 'Apenas imagens são permitidas.' }, 400);
    }

    const fileExt = filename.split('.').pop();
    const storagePath = `${user.tenant_id}/${crypto.randomUUID()}.${fileExt}`;

    const { data: storageData, error: storageError } = await supabaseAdmin
      .storage
      .from('media')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      return jsonResponse({ message: 'Erro ao fazer upload.' }, 500);
    }

    const { data: publicUrl } = supabaseAdmin
      .storage
      .from('media')
      .getPublicUrl(storagePath);

    const originalPath = publicUrl?.publicUrl || storagePath;

    const { data: usage } = await supabaseAdmin
      .from('tenants')
      .select('storage_used, storage_quota')
      .eq('id', user.tenant_id)
      .maybeSingle();

    const newStorageUsed = (usage?.storage_used || 0) + buffer.length;

    if (newStorageUsed > (usage?.storage_quota || 1073741824)) {
      await supabaseAdmin.storage.from('media').remove([storagePath]);
      return jsonResponse({ message: 'Limite de armazenamento excedido.' }, 413);
    }

    const { data: media, error: mediaError } = await supabaseAdmin
      .from('media_files')
      .insert({
        tenant_id: user.tenant_id,
        album_id: albumId,
        filename,
        original_path: originalPath,
        mime_type: mimeType,
        size_bytes: buffer.length,
        width: 0,
        height: 0,
        display_order: 0,
      })
      .select()
      .single();

    if (mediaError) {
      await supabaseAdmin.storage.from('media').remove([storagePath]);
      return jsonResponse({ message: 'Erro ao registrar mídia.' }, 500);
    }

    await supabaseAdmin
      .from('tenants')
      .update({ storage_used: newStorageUsed, updated_at: new Date().toISOString() })
      .eq('id', user.tenant_id);

    return jsonResponse({ media, message: 'Upload realizado com sucesso!' }, 201);
  } catch {
    return jsonResponse({ message: 'Erro ao fazer upload.' }, 500);
  }
}
