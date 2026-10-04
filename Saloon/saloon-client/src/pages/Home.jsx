import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard';
import StaffCard from '../components/StaffCard';
import { fetchServices } from '../services/api';
import './Home.css';

const staffData = [
  {
    name: 'Amaya Perera',
    role: 'Senior Hair Stylist',
    description: '12 years of experience creating stunning cuts and styles for all hair types.',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
  },
  {
    name: 'Dilini Fernando',
    role: 'Color Specialist',
    description: 'Expert in balayage, highlights, and transformative color corrections.',
    image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&q=80',
  },
  {
    name: 'Sachini Silva',
    role: 'Beauty Therapist',
    description: 'Specializes in advanced skin care treatments and relaxing facial therapies.',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80',
  },
];

const features = [
  { icon: '🏆', title: 'Experienced Professionals', desc: 'Our team brings years of expertise and continuous training.' },
  { icon: '🌿', title: 'Premium Products', desc: 'We use only the finest, curated beauty products.' },
  { icon: '💎', title: 'Personalized Care', desc: 'Every service is tailored to your unique needs and goals.' },
  { icon: '🕊️', title: 'Comfortable Environment', desc: 'Relax in our serene, elegantly designed salon space.' },
];

export default function Home() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices().then(setServices);
  }, []);

  return (
    <main className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero__content fade-up">
          <span className="section-label">Premium Beauty Studio</span>
          <h1 className="hero__title">Elevate Your<br /><em>Beauty</em></h1>
          <p className="hero__subtitle">Professional beauty and hair care designed around you.</p>
          <p className="hero__desc">
            Experience personalized salon services delivered by skilled professionals
            in a relaxing and elegant environment.
          </p>
          <div className="hero__actions">
            <Link to="/book" className="btn-primary">Book an Appointment</Link>
            <a href="#services" className="btn-outline" onClick={(e) => { e.preventDefault(); document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Explore Services
            </a>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <strong>10+</strong><span>Years Experience</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <strong>5000+</strong><span>Happy Clients</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <strong>15+</strong><span>Expert Stylists</span>
            </div>
          </div>
        </div>
        <div className="hero__image fade-up">
          <div className="hero__image-wrap">
            <img
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=700&q=85"
              alt="Luxury salon"
            />
            <div className="hero__image-badge">
              <span>✦</span>
              <p>Award Winning<br />Salon 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section services-section" id="services">
        <div className="section__header">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">Our Signature Services</h2>
          <p className="section-desc">
            Discover professional treatments designed to make you look and feel your absolute best.
          </p>
        </div>
        {['Gents', 'Ladies', 'Unisex'].map((category) => {
          const categoryServices = services.filter((service) => service.isActive && (service.category || 'Unisex') === category);
          return (
            <div className="service-category" key={category}>
              <h3 className="service-category__title">{category} Services</h3>
              {categoryServices.length > 0 ? (
                <div className="services-grid">
                  {categoryServices.map((service) => <ServiceCard key={service.id} service={service} />)}
                </div>
              ) : (
                <p className="service-category__empty">Services for this category will be available soon.</p>
              )}
            </div>
          );
        })}
      </section>

      {/* ABOUT */}
      <section className="section about-section" id="about">
        <div className="about-section__image">
          <img
            src="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=700&q=85"
            alt="Inside our salon"
          />
          <div className="about-section__tag">Est. 2014</div>
        </div>
        <div className="about-section__content">
          <span className="section-label">About Our Salon</span>
          <h2 className="section-title">Where Beauty Meets<br />Confidence</h2>
          <p className="section-desc">
            At Lumière Salon, we believe every visit should feel like a retreat. Our dedicated team of
            stylists and therapists work closely with you to bring your vision to life with care and precision.
          </p>
          <ul className="about-section__list">
            {['Professional stylists', 'Premium products', 'Personalized services', 'Relaxing environment'].map((item) => (
              <li key={item}><span className="about-check">✓</span> {item}</li>
            ))}
          </ul>
          <Link to="/about" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            Discover More
          </Link>
        </div>
      </section>

      {/* STAFF */}
      <section className="section staff-section" id="staff">
        <div className="section__header">
          <span className="section-label">Our Team</span>
          <h2 className="section-title">Meet Our Experts</h2>
          <p className="section-desc">Passionate professionals committed to making you look and feel extraordinary.</p>
        </div>
        <div className="staff-grid">
          {staffData.map((s) => (
            <StaffCard key={s.name} {...s} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/staff" className="btn-outline">View All Staff</Link>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section features-section">
        <div className="section__header">
          <span className="section-label">Why Lumière</span>
          <h2 className="section-title">Why Choose Us</h2>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-item" key={f.title}>
              <div className="feature-item__icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-section__inner">
          <span className="section-label" style={{ color: 'var(--gold-light)' }}>Book Today</span>
          <h2>Ready for Your Next Look?</h2>
          <p>Book your appointment today and let our professionals take care of you.</p>
          <Link to="/book" className="btn-primary cta-btn">Book an Appointment</Link>
        </div>
      </section>
    </main>
  );
}
