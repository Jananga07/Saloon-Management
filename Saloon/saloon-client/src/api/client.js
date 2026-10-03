const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api';

export async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    const csrf = await fetch(`${API_URL}/auth/csrf`, { credentials: 'include' });
    if (!csrf.ok) throw new Error('Unable to start a secure request. Please try again.');
    headers['X-CSRF-Token'] = (await csrf.json()).token;
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('salon-session-expired'));
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || Object.values(data.errors || {}).flat().join(' ') ||
      (response.status === 401 ? 'Please sign in to continue.' : response.status === 429 ? 'Too many attempts. Please wait one minute and try again.' : 'The request failed. Please try again.'));
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? undefined : response.json();
}

export function imageUrl(path) {
  return path ? new URL(path, API_URL).href : null;
}
