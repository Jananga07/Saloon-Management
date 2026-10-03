import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getService, createService, updateService, uploadServicePhoto, removeServicePhoto } from '../api/services';
import { imageUrl } from '../api/client';

const empty = { name: '', description: '', category: 'Unisex', price: '', durationMinutes: '', isActive: true };

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [photo, setPhoto] = useState(null);
  const preview = photo?.preview;
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.preview);
  }, [photo]);

  function selectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP photo no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    setRemovePhoto(false);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  useEffect(() => {
    if (!isEdit) return;
    getService(id)
      .then((s) => setForm({ ...s, category: s.category || 'Unisex', price: String(s.price), durationMinutes: String(s.durationMinutes) }))
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
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), durationMinutes: parseInt(form.durationMinutes) };
    try {
      let serviceId = id || createdId;
      if (serviceId) {
        await updateService(serviceId, { ...payload, id: Number(serviceId) });
      } else {
        const created = await createService(payload);
        serviceId = created.id;
        setCreatedId(serviceId);
      }
      try {
        if (photo) await uploadServicePhoto(serviceId, photo.file);
        else if (removePhoto) await removeServicePhoto(serviceId);
      } catch (failure) { throw new Error(`Service details saved, but the photo was not saved. ${failure.message} Please try again.`); }
      navigate('/services');
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  if (loading) return <p style={styles.msg}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? 'Edit Service' : 'New Service'}</h1>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="service-photo" style={styles.label}>Service Photo</label>
          <input id="service-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={saving} />
          <small>Optional. JPEG, PNG, or WebP, up to 5 MB.</small>
          {!removePhoto && (preview || form.imageUrl) && <img src={preview || imageUrl(form.imageUrl)} alt="Service photo preview" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />}
          {!removePhoto && (photo || form.imageUrl) && <button type="button" disabled={saving} onClick={() => {
            setPhoto(null); setRemovePhoto(true);
            document.getElementById('service-photo').value = '';
          }} style={styles.cancelBtn}>Remove Photo</button>}
        </div>
        <div style={styles.field}>
          <label htmlFor="service-category" style={styles.label}>Category</label>
          <select id="service-category" name="category" value={form.category} onChange={handleChange} required style={styles.input}>
            {['Gents', 'Ladies', 'Unisex'].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        {[
          { label: 'Name', name: 'name', type: 'text', required: true },
          { label: 'Description', name: 'description', type: 'text' },
          { label: 'Price (Rs.)', name: 'price', type: 'number', required: true },
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
          <button type="submit" disabled={saving} style={styles.submitBtn}>{saving ? 'Saving...' : isEdit || createdId ? 'Update' : 'Create'}</button>
          <button type="button" disabled={saving} onClick={() => navigate('/services')} style={styles.cancelBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '8rem 2rem 4rem', maxWidth: '500px', width: '100%', margin: '0 auto' },
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
