import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookings, updateBookingStatus } from '../api/bookings';
import { formatAppointment, formatRupees } from '../utils/bookingDates';
import './Booking.css';

export default function ManageBookings() {
  const [filters, setFilters] = useState({ date: '', status: '' });
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const key = `${filters.date}/${filters.status}/${revision}`;
  useEffect(() => {
    let active = true;
    getBookings(filters).then((bookings) => { if (active) setResult({ key, bookings }); })
      .catch((failure) => { if (active) setResult({ key, error: failure.message }); });
    return () => { active = false; };
  }, [filters, key]);
  const current = result?.key === key ? result : null;
  async function changeStatus(booking, status) {
    if (status === 'Cancelled' && !confirm(`Cancel ${booking.customerName}'s appointment?`)) return;
    setBusyId(booking.id); setError(''); setNotice('');
    try {
      await updateBookingStatus(booking.id, status);
      setNotice(`Appointment ${status.toLowerCase()}.`);
      setRevision((previous) => previous + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusyId(null); }
  }
  return <main className="admin-page">
    <Link to="/admin">← Dashboard</Link>
    <div className="admin-heading"><div><span className="section-label">Salon Administration</span><h1>Manage Appointments</h1><p>Review customer requests, confirm appointments, or cancel bookings.</p></div>
      <button className="btn-outline" onClick={() => setRevision((previous) => previous + 1)}>Refresh</button></div>
    <div className="admin-panel booking-filters">
      <div><label htmlFor="appointments-date">Date</label><input id="appointments-date" type="date" value={filters.date} onChange={(event) => setFilters((previous) => ({ ...previous, date: event.target.value }))} /></div>
      <div><label htmlFor="appointments-status">Status</label><select id="appointments-status" value={filters.status} onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}><option value="">All statuses</option>{['Pending', 'Confirmed', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select></div>
      <button className="btn-outline" onClick={() => setFilters({ date: '', status: '' })}>Show All Dates</button>
    </div>
    {(error || current?.error) && <p className="admin-error" role="alert">{error || current.error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!current ? <p>Loading appointments...</p> : current.bookings?.length === 0 ? <div className="admin-panel"><p>No appointments match these filters.</p></div> : <div className="booking-list">
      {current.bookings?.map((booking) => <article className="admin-panel booking-admin-card" key={booking.id}>
        <div className="admin-heading"><div><h2>{booking.customerName}</h2><p>{formatAppointment(booking.startsAt)} · {booking.durationMinutes} minutes</p></div><span className={`booking-status booking-status--${booking.status.toLowerCase()}`}>{booking.status}</span></div>
        <h3>{booking.serviceName} · {booking.category} · {formatRupees(booking.price)}</h3>
        <p><strong>Phone:</strong> {booking.phone}{booking.email && <><br /><strong>Email:</strong> {booking.email}</>}</p>
        {booking.notes && <p className="booking-notes"><strong>Notes:</strong> {booking.notes}</p>}
        <p className="booking-reference"><strong>Reference:</strong> {booking.reference}</p>
        <div className="admin-actions">
          {booking.status === 'Pending' && new Date(booking.startsAt) > new Date() && <button className="btn-primary" disabled={busyId !== null} onClick={() => changeStatus(booking, 'Confirmed')}>{busyId === booking.id ? 'Saving...' : 'Confirm Appointment'}</button>}
          {booking.status !== 'Cancelled' && <button className="btn-outline" disabled={busyId !== null} onClick={() => changeStatus(booking, 'Cancelled')}>Cancel Appointment</button>}
        </div>
      </article>)}
    </div>}
  </main>;
}
