import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getService, createService, updateService } from '../api/services';

const empty = { name: '', description: '', price: '', durationMinutes: '', isActive: true };

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    getService(id)
      .then((s) => setForm({ ...s, price: String(s.price), durationMinutes: String(s.durationMinutes) }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, price: parseFloat(form.price), durationMinutes: parseInt(form.durationMinutes) };
    try {
      if (isEdit) {
        await updateService(id, { ...payload, id: parseInt(id) });
      } else {
        await createService(payload);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={styles.msg}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? 'Edit Service' : 'New Service'}</h1>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        {[
          { label: 'Name', name: 'name', type: 'text', required: true },
          { label: 'Description', name: 'description', type: 'text' },
          { label: 'Price ($)', name: 'price', type: 'number', required: true },
          { label: 'Duration (minutes)', name: 'durationMinutes', type: 'number', required: true },
        ].map(({ label, name, type, required }) => (
          <div key={name} style={styles.field}>
            <label style={styles.label}>{label}</label>
            <input
              name={name}
              type={type}
              value={form[name]}
              onChange={handleChange}
              required={required}
              style={styles.input}
              step={name === 'price' ? '0.01' : undefined}
              min={0}
            />
          </div>
        ))}
        <div style={styles.field}>
          <label style={styles.label}>
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
            {' '}Active
          </label>
        </div>
        <div style={styles.actions}>
          <button type="submit" style={styles.submitBtn}>{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" onClick={() => navigate('/')} style={styles.cancelBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '500px', margin: '0 auto' },
  title: { marginBottom: '1.5rem', color: '#1a1a2e' },
  msg: { textAlign: 'center', marginTop: '2rem' },
  error: { color: 'red', marginBottom: '1rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontWeight: 'bold', fontSize: '0.9rem' },
  input: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  actions: { display: 'flex', gap: '1rem', marginTop: '0.5rem' },
  submitBtn: { padding: '0.6rem 1.5rem', background: '#e94560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  cancelBtn: { padding: '0.6rem 1.5rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
};
