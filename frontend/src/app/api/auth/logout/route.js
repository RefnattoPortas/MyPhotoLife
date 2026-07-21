import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function POST(request) {
  const result = await proxyToBackend(request, { path: '/api/auth/logout' });

  const headers = {};
  if (result.headers) {
    const setCookie = result.headers.get('set-cookie');
    if (setCookie) headers['Set-Cookie'] = setCookie;
  }

  return new Response(JSON.stringify(result.body || { message: 'Sessão encerrada' }), {
    status: result.status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
