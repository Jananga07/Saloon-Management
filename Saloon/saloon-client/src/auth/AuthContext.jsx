import { useEffect, useState } from 'react';
import { request } from '../api/client';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    setError('');
    try { setStatus(await request('/auth/status')); }
    catch { setError('Cannot connect to the salon server. Check that the backend is running.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    request('/auth/status')
      .then((data) => { if (!cancelled) setStatus(data); })
      .catch(() => { if (!cancelled) setError('Cannot connect to the salon server. Check that the backend is running.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const expired = () => setStatus((previous) => ({ ...previous, user: null }));
    window.addEventListener('salon-session-expired', expired);
    return () => { cancelled = true; window.removeEventListener('salon-session-expired', expired); };
  }, []);
  async function signIn(username, password, setup = false) {
    const user = await request(`/auth/${setup ? 'setup' : 'login'}`, { method: 'POST', body: JSON.stringify({ username, password }) });
    setStatus({ setupRequired: false, setupAllowed: false, user });
  }
  async function signOut() {
    try { await request('/auth/logout', { method: 'POST' }); }
    catch (failure) { if (failure.status !== 401) throw failure; }
    setStatus((previous) => ({ ...previous, user: null }));
  }
  return <AuthContext.Provider value={{ ...status, loading, error, refresh, signIn, signOut }}>{children}</AuthContext.Provider>;
}
