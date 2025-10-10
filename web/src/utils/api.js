const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, method='GET', body, token) {
  const isFormData = (typeof FormData !== 'undefined') && body instanceof FormData;
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? (isFormData ? body : JSON.stringify(body)) : undefined });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data; // include full server payload for debugging (e.g., MoMo subErrors)
    throw err;
  }
  return { status: res.status, data };
}

export const api = {
  get: (p, t) => request(p, 'GET', undefined, t),
  post: (p, b, t) => request(p, 'POST', b, t),
  del: (p, t) => request(p, 'DELETE', undefined, t),
  patch: (p, b, t) => request(p, 'PATCH', b, t),
  rawPatch: (p, formData, t) => request(p, 'PATCH', formData, t)
};
