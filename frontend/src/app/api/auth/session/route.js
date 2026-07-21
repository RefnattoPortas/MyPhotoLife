import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function GET(request) {
  const result = await proxyToBackend(request, { path: '/api/auth/session' });

  if (result.body) {
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Não autenticado' }, 401);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
