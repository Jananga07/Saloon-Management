import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getServices } from '../api/services';
import { createBooking, getAvailability } from '../api/bookings';
import { imageUrl } from '../api/client';
import { formatAppointment, formatRupees, formatSlot, salonDate } from '../utils/bookingDates';
import './Booking.css';

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get('serviceId') || '';
  const [services, setServices] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ category: 'Gents', serviceId: '', date: salonDate(), time: '', customerName: '', phone: '', email: '', notes: '' });
  const [availability, setAvailability] = useState(null);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const requestKey = useRef(null);
  const today = salonDate();
  const maximumDate = salonDate(new Date(new Date(`${today}T00:00:00+05:30`).getTime() + 90 * 86400000));

  useEffect(() => {
    let active = true;
    getServices().then((data) => {
      if (!active) return;
      const available = data.filter((service) => service.isActive);
      setServices(available);
      const selected = available.find((service) => String(service.id) === initialServiceId);
      if (selected) setForm((previous) => ({ ...previous, category: selected.category || 'Unisex', serviceId: String(selected.id), time: '' }));
    }).catch(() => { if (active) setLoadError('Cannot load salon services. Please try again.'); });
    return () => { active = false; };
  }, [initialServiceId, reload]);

  const availabilityKey = `${form.serviceId}/${form.date}/${availabilityRevision}`;
  const validDate = form.date >= today && form.date <= maximumDate;
  useEffect(() => {
    if (!form.serviceId || !validDate) return;
    let active = true;
    getAvailability(form.serviceId, form.date)
      .then((data) => { if (active) setAvailability({ key: availabilityKey, times: data.times }); })
      .catch((failure) => { if (active) setAvailability({ key: availabilityKey, times: [], error: failure.message }); });
    return () => { active = false; };
  }, [form.serviceId, form.date, availabilityKey, validDate]);

  const currentAvailability = availability?.key === availabilityKey ? availability : null;
  const selectedService = services?.find((service) => String(service.id) === form.serviceId);

  function change(name, value) {
    requestKey.current = null;
    setError('');
    setForm((previous) => ({ ...previous, [name]: value,
      ...(name === 'category' ? { serviceId: '', time: '' } : {}),
      ...(['serviceId', 'date'].includes(name) ? { time: '' } : {}),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!currentAvailability?.times.includes(form.time) || !selectedService) { setError('Choose an available appointment time.'); return; }
    setBusy(true); setError('');
    requestKey.current ||= crypto.randomUUID();
    try {
      const booking = await createBooking({ serviceId: Number(form.serviceId), date: form.date, time: form.time,
        customerName: form.customerName.trim(), phone: form.phone.trim(), email: form.email.trim() || null,
        notes: form.notes.trim() || null, requestKey: requestKey.current });
      setReceipt(booking);
      setForm((previous) => ({ ...previous, customerName: '', phone: '', email: '', notes: '', time: '' }));
      setAvailabilityRevision((previous) => previous + 1);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) {
        setForm((previous) => ({ ...previous, time: '' }));
        requestKey.current = null;
        setAvailabilityRevision((previous) => previous + 1);
      }
    } finally { setBusy(false); }
  }

  if (receipt) return <main className="admin-page booking-page">
    <div className="admin-panel booking-receipt" role="status">
      <span className="section-label">Appointment Request Received</span><h1>Thank you for booking</h1>
      <p>Your appointment is <strong>{receipt.status.toLowerCase()}</strong>. The salon will contact you to confirm it. Please keep your booking reference.</p>
      <dl className="booking-details"><dt>Reference</dt><dd className="booking-reference">{receipt.reference}</dd>
        <dt>Service</dt><dd>{receipt.serviceName}</dd><dt>Appointment</dt><dd>{formatAppointment(receipt.startsAt)} (Sri Lanka time)</dd>
        <dt>Duration</dt><dd>{receipt.durationMinutes} minutes</dd><dt>Service Price</dt><dd>{formatRupees(receipt.price)}</dd></dl>
      <div className="admin-actions"><Link className="btn-primary" to="/">Back to Home</Link>
        <button className="btn-outline" onClick={() => { requestKey.current = null; setReceipt(null); }}>Book Another Appointment</button></div>
    </div>
  </main>;

  return <main className="admin-page booking-page">
    <div className="booking-heading"><span className="section-label">Your Next Salon Visit</span><h1>Book an Appointment</h1><p>Choose your service and an available time. No customer account needed.</p></div>
    {loadError ? <div className="admin-panel"><p className="admin-error" role="alert">{loadError}</p><button className="btn-outline" onClick={() => { setLoadError(''); setReload((previous) => previous + 1); }}>Try Again</button></div>
      : services === null ? <p>Loading services...</p> : services.length === 0 ? <div className="admin-panel"><p>No services are available for booking yet. Please contact the salon.</p><Link to="/#contact" className="btn-outline">Contact Salon</Link></div> :
      <div className="booking-layout">
        <form className="admin-panel admin-form" onSubmit={submit}>
          <fieldset className="booking-fields" disabled={busy}>
            <legend>Appointment Details</legend>
            <label htmlFor="booking-category">Service Category</label>
            <select id="booking-category" value={form.category} onChange={(event) => change('category', event.target.value)}>
              {['Gents', 'Ladies', 'Unisex'].map((category) => <option key={category}>{category}</option>)}
            </select>
            <label htmlFor="booking-service">Service</label>
            <select id="booking-service" value={form.serviceId} onChange={(event) => change('serviceId', event.target.value)} required>
              <option value="">Choose a service</option>
              {services.filter((service) => (service.category || 'Unisex') === form.category).map((service) => <option key={service.id} value={service.id}>{service.name} — {formatRupees(service.price)} · {service.durationMinutes} min</option>)}
            </select>
            {!services.some((service) => (service.category || 'Unisex') === form.category) && <p>No services in this category yet. Try another category.</p>}
            <label htmlFor="booking-date">Date</label>
            <input id="booking-date" type="date" min={today} max={maximumDate} value={form.date} onChange={(event) => change('date', event.target.value)} required />
            <fieldset className="booking-times"><legend>Available Times</legend>
              {!form.serviceId ? <p>Choose a service to see available times.</p> : !validDate ? <p>Choose a date within the next 90 days.</p> : !currentAvailability ? <p>Checking availability...</p> : currentAvailability.error ? <><p className="admin-error" role="alert">{currentAvailability.error}</p><button type="button" className="btn-outline" onClick={() => setAvailabilityRevision((previous) => previous + 1)}>Refresh Times</button></>
                : currentAvailability.times.length === 0 ? <p>No times available. Please choose another date.</p> : <div className="booking-time-grid">
                  {currentAvailability.times.map((time) => <label className={`booking-time${form.time === time ? ' booking-time--selected' : ''}`} key={time}>
                    <input type="radio" name="appointment-time" value={time} checked={form.time === time} onChange={() => change('time', time)} required /><span>{formatSlot(time)}</span>
                  </label>)}
                </div>}
            </fieldset>
            <h2>Your Contact Details</h2>
            <label htmlFor="booking-name">Full Name</label><input id="booking-name" value={form.customerName} onChange={(event) => change('customerName', event.target.value)} required maxLength={100} autoComplete="name" />
            <label htmlFor="booking-phone">Phone Number</label><input id="booking-phone" type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} required maxLength={25} placeholder="077 123 4567" autoComplete="tel" />
            <label htmlFor="booking-email">Email (optional)</label><input id="booking-email" type="email" value={form.email} onChange={(event) => change('email', event.target.value)} maxLength={254} autoComplete="email" />
            <label htmlFor="booking-notes">Notes (optional)</label><textarea id="booking-notes" value={form.notes} onChange={(event) => change('notes', event.target.value)} maxLength={1000} rows={3} placeholder="Anything you would like your stylist to know" />
          </fieldset>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="btn-primary" disabled={busy || !selectedService || !currentAvailability?.times.includes(form.time) || !form.customerName.trim()}>{busy ? 'Submitting...' : 'Request Appointment'}</button>
          <small>Your appointment is pending until the salon confirms it. Payment is made at the salon.</small>
        </form>
        <aside className="admin-panel booking-summary">
          <h2>Your Appointment</h2>
          {selectedService ? <>{selectedService.imageUrl && <img className="booking-photo" src={imageUrl(selectedService.imageUrl)} alt={selectedService.name} />}
            <h3>{selectedService.name}</h3><p>{selectedService.description}</p><dl className="booking-details"><dt>Category</dt><dd>{selectedService.category || 'Unisex'}</dd><dt>Duration</dt><dd>{selectedService.durationMinutes} minutes</dd><dt>Price</dt><dd>{formatRupees(selectedService.price)}</dd>{form.time && <><dt>Time</dt><dd>{form.date} · {formatSlot(form.time)}</dd></>}</dl></> : <p>Select a service to see its details.</p>}
          <h3>Opening Hours</h3><p>Mon–Sat: 9 AM–8 PM<br />Sunday: 10 AM–6 PM<br />All times are in Sri Lanka time.</p><small>Appointments can be requested up to 90 days ahead, with at least 30 minutes’ notice.</small>
        </aside>
      </div>}
  </main>;
}
