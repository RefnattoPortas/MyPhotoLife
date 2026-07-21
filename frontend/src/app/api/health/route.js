import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function GET() {
  const result = await proxyToBackend(new Request('http://localhost'), { path: '/api/health' });

  if (result.body) {
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({ status: 'ok', source: 'next-api', timestamp: new Date().toISOString() });
}
