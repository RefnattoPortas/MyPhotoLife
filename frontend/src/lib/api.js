const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
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
      const token = localStorage.getItem('auth_token');
      return fetch(`${API_URL}/media/upload${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.message || `HTTP ${r.status}`);
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
    get: (slug) => request(`/portfolio?slug=${encodeURIComponent(slug)}`),
    getAlbum: (slug, id) => request(`/portfolio/album?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`),
  },
  tenant: {
    stats: () => request('/tenant/stats'),
    profile: () => request('/tenant/profile'),
    update: (data) => request('/tenant/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  schedule: {
    list: () => request('/schedule'),
    create: (data) => request('/schedule', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/schedule?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/schedule?id=${id}`, { method: 'DELETE' }),
  },
};
