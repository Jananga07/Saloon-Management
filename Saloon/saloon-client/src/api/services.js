const BASE_URL = 'http://localhost:5097/api/salonservices';

export async function getServices() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export async function getService(id) {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch service');
  return res.json();
}

export async function createService(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create service');
  return res.json();
}

export async function updateService(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update service');
}

export async function deleteService(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete service');
}
