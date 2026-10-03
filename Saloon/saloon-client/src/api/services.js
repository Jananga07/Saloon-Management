import { request } from './client';

export function uploadServicePhoto(id, photo) {
  const body = new FormData();
  body.append('photo', photo);
  return request(`/salonservices/${id}/photo`, { method: 'POST', body });
}

export const removeServicePhoto = (id) => request(`/salonservices/${id}/photo`, { method: 'DELETE' });

export async function getServices() {
  return request('/salonservices');
}

export async function getService(id) {
  return request(`/salonservices/${id}`);
}

export async function createService(data) {
  return request('/salonservices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateService(id, data) {
  return request(`/salonservices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteService(id) {
  return request(`/salonservices/${id}`, { method: 'DELETE' });
}
