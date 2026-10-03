import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = location.state?.from || '';
  const destination = ['/admin', '/services', '/services/new'].includes(from) || /^\/services\/edit\/\d+$/.test(from) ? from : '/admin';
  if (auth.loading) return <main className="admin-page"><p>Loading...</p></main>;
  if (auth.user) return <Navigate to={destination} replace />;
  if (auth.error) return <main className="admin-page"><p role="alert">{auth.error}</p><button className="btn-outline" onClick={auth.refresh}>Try Again</button></main>;
  const setup = auth.setupRequired && auth.setupAllowed;
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (setup && password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await auth.signIn(username.trim(), password, setup);
      setPassword(''); setConfirmation('');
      navigate(destination, { replace: true });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return (
    <main className="admin-page"><div className="admin-panel login-panel">
      <span className="section-label">Salon Administration</span>
      <h1>{setup ? 'Create Owner Account' : 'Admin Login'}</h1>
      <p>{setup ? 'Choose your username and a password of at least 12 characters to manage your salon.' : 'Sign in to manage your salon services.'}</p>
      {auth.setupRequired && !auth.setupAllowed ? <p role="alert">Create the owner account from this computer in development mode first.</p> : (
        <form className="admin-form" onSubmit={submit}>
          <label htmlFor="admin-username">Username</label>
          <input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={100} autoComplete="username" />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={setup ? 12 : 1} maxLength={128} autoComplete={setup ? 'new-password' : 'current-password'} />
          {setup && <><label htmlFor="admin-confirmation">Confirm Password</label><input id="admin-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" /></>}
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="btn-primary" disabled={busy || !username.trim()}>{busy ? 'Please wait...' : setup ? 'Create Owner Account' : 'Sign In'}</button>
        </form>
      )}
    </div></main>
  );
}
