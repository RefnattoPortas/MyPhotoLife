import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await proxyToBackend(request, { path: '/api/auth/register', body });

  if (result.body) {
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({
    error: true, statusCode: 503, code: 'BACKEND_UNAVAILABLE', message: 'Serviço temporariamente indisponível.',
  }, 503);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
