import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await proxyToBackend(request, { path: '/api/auth/forgot-password', body });

  if (result.body) {
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({
    message: 'Se existir uma conta com este email, enviaremos as instruções de recuperação.',
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
