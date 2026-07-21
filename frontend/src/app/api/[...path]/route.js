import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';

export async function GET(request, { params }) {
  const path = buildPath(params);
  const result = await proxyToBackend(request, { path });
  return jsonResponse(result.body || { error: 'Serviço indisponível' }, result.status);
}

export async function POST(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const path = buildPath(params);
  const result = await proxyToBackend(request, { path, body });
  return jsonResponse(result.body || { error: 'Serviço indisponível' }, result.status);
}

export async function PUT(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const path = buildPath(params);
  const result = await proxyToBackend(request, { path, body });
  return jsonResponse(result.body || { error: 'Serviço indisponível' }, result.status);
}

export async function PATCH(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const path = buildPath(params);
  const result = await proxyToBackend(request, { path, body });
  return jsonResponse(result.body || { error: 'Serviço indisponível' }, result.status);
}

export async function DELETE(request, { params }) {
  const path = buildPath(params);
  const result = await proxyToBackend(request, { path });
  return jsonResponse(result.body || { error: 'Serviço indisponível' }, result.status);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

function buildPath(params) {
  const path = params?.path || [];
  return `/api/${path.join('/')}`;
}
