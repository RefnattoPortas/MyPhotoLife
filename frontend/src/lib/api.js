const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

let csrfToken = null;

const ERROR_MESSAGES = {
  400: 'Verifique os dados informados e tente novamente.',
  401: 'Email ou senha inválidos.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
  409: 'Este recurso já está em uso.',
  429: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  500: 'Erro interno do servidor. Tente novamente mais tarde.',
  503: 'Serviço temporariamente indisponível.',
};

function getErrorMessage(status, fallback) {
  if (status >= 500) return ERROR_MESSAGES[500];
  return ERROR_MESSAGES[status] || fallback || 'Ocorreu um erro inesperado. Tente novamente.';
}

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const isMutation = options.method && !['GET', 'HEAD'].includes(options.method);
  if (isMutation && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
    }
    throw new Error('Erro de conexão. Tente novamente.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.message || getErrorMessage(res.status);
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    session: () => request('/auth/session'),
    me: () => request('/auth/me'),
    forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
    resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
    checkSlug: (slug) => request(`/auth/slug-check?slug=${encodeURIComponent(slug)}`),
  },
  albums: {
    list: () => request('/albums'),
    get: (id) => request(`/albums/${id}`),
    create: (data) => request('/albums', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/albums/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/albums/${id}`, { method: 'DELETE' }),
  },
  media: {
    upload: (file, albumId) => {
      const form = new FormData();
      form.append('file', file);
      const params = albumId ? `?album_id=${albumId}` : '';
      const headers = {};
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      return fetch(`${API_URL}/media/upload${params}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: form,
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.message || getErrorMessage(r.status));
        return body;
      });
    },
    update: (id, data) => request(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/media/${id}`, { method: 'DELETE' }),
  },
  orders: {
    create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => request(`/orders/${id}`),
    list: () => request('/orders'),
  },
  portfolio: {
    get: (slug) => request(`/portfolio/${encodeURIComponent(slug)}`),
    getAlbum: (slug, id) => request(`/portfolio/${encodeURIComponent(slug)}/albums/${encodeURIComponent(id)}`),
    contact: (slug, data) => request(`/portfolio/${encodeURIComponent(slug)}/contact`, { method: 'POST', body: JSON.stringify(data) }),
  },
  tenant: {
    stats: () => request('/tenant/stats'),
    profile: () => request('/tenant/profile'),
    update: (data) => request('/tenant/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  schedule: {
    list: () => request('/schedule'),
    create: (data) => request('/schedule', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/schedule/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/schedule/${id}`, { method: 'DELETE' }),
  },
};
