import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServices, deleteService } from '../api/services';

export default function ServicesList() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this service?')) return;
    await deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <p style={styles.msg}>Loading...</p>;
  if (error) return <p style={{ ...styles.msg, color: 'red' }}>{error}</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Salon Services</h1>
      {services.length === 0 ? (
        <p style={styles.msg}>No services yet. <Link to="/services/new">Add one</Link>.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name', 'Description', 'Price', 'Duration', 'Active', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} style={styles.tr}>
                <td style={styles.td}>{s.name}</td>
                <td style={styles.td}>{s.description}</td>
                <td style={styles.td}>${s.price.toFixed(2)}</td>
                <td style={styles.td}>{s.durationMinutes} min</td>
                <td style={styles.td}>{s.isActive ? '✅' : '❌'}</td>
                <td style={styles.td}>
                  <Link to={`/services/edit/${s.id}`} style={styles.editBtn}>Edit</Link>
                  <button onClick={() => handleDelete(s.id)} style={styles.deleteBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  title: { marginBottom: '1.5rem', color: '#1a1a2e' },
  msg: { textAlign: 'center', marginTop: '2rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#1a1a2e', color: '#fff', padding: '0.75rem', textAlign: 'left' },
  tr: { borderBottom: '1px solid #ddd' },
  td: { padding: '0.75rem' },
  editBtn: { marginRight: '0.5rem', padding: '0.3rem 0.7rem', background: '#e94560', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem' },
  deleteBtn: { padding: '0.3rem 0.7rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
};
