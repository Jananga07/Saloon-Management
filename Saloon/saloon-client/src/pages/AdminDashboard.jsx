import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getServices } from '../api/services';

export default function AdminDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { getServices().then(setServices).catch((failure) => setError(failure.message)); }, []);
  async function logout() {
    setBusy(true);
    try { await auth.signOut(); navigate('/login', { replace: true }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div><span className="section-label">Salon Administration</span><h1>Welcome, {auth.user.username}</h1><p>Manage your Gents, Ladies, and Unisex services.</p></div>
        <button className="btn-outline" onClick={logout} disabled={busy}>{busy ? 'Signing Out...' : 'Sign Out'}</button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-stats">
        {['All', 'Gents', 'Ladies', 'Unisex'].map((category) => <div className="admin-panel" key={category}>
          <span>{category} Services</span><strong>{services ? services.filter((service) => category === 'All' || (service.category || 'Unisex') === category).length : '—'}</strong>
        </div>)}
      </div>
      <div className="admin-panel"><h2>Service Management</h2><p>Add new services or update prices, durations, and categories.</p>
        <div className="admin-actions"><Link className="btn-primary" to="/services/new">Add Service</Link><Link className="btn-outline" to="/services">Manage Services</Link><Link className="btn-outline" to="/">View Website</Link></div>
      </div>
    </main>
  );
}
