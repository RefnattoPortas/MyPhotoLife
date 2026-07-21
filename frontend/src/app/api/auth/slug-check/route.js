import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const result = await proxyToBackend(request, { path: `/api/auth/slug-check?slug=${encodeURIComponent(slug || '')}` });

  if (result.body) {
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({ available: false, error: 'Serviço temporariamente indisponível.' }, 503);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
