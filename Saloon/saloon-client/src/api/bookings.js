import { request } from './client';

export const getAvailability = (serviceId, date) => request(`/bookings/availability?${new URLSearchParams({ serviceId, date })}`);
export const createBooking = (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) });
export const getBookings = (filters = {}) => request(`/bookings?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value))}`);
export const updateBookingStatus = (id, status) => request(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
