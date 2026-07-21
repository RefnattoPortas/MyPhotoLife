const BACKEND_URL = process.env.API_URL || '';

export async function proxyToBackend(request, { method, path, body }) {
  if (!BACKEND_URL) {
    return {
      status: 503,
      body: {
        error: true,
        statusCode: 503,
        code: 'BACKEND_NOT_CONFIGURED',
        message: 'O serviço de acesso está temporariamente indisponível. Tente novamente.',
      },
    };
  }

  const url = `${BACKEND_URL}${path}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(request.headers.get('x-csrf-token')
        ? { 'x-csrf-token': request.headers.get('x-csrf-token') }
        : {}),
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization') }
        : {}),
      ...(request.headers.get('cookie')
        ? { cookie: request.headers.get('cookie') }
        : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: method || request.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await res.json().catch(() => null);

    return {
      status: res.status,
      body: responseBody,
      headers: res.headers,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        status: 504,
        body: {
          error: true,
          statusCode: 504,
          code: 'BACKEND_TIMEOUT',
          message: 'O serviço de acesso está temporariamente indisponível. Tente novamente.',
        },
      };
    }

    return {
      status: 502,
      body: {
        error: true,
        statusCode: 502,
        code: 'BACKEND_UNREACHABLE',
        message: 'O serviço de acesso está temporariamente indisponível. Tente novamente.',
      },
    };
  }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
