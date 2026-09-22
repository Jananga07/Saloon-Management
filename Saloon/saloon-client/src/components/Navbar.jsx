import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '#services' },
  { label: 'Staff', to: '#staff' },
  { label: 'About', to: '#about' },
  { label: 'Contact', to: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleAnchor(e, to) {
    if (to.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(to);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  }

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          LUMIÈRE <span>SALON</span>
        </Link>

        <nav className={`navbar__links${menuOpen ? ' navbar__links--open' : ''}`}>
          {navLinks.map(({ label, to }) => (
            <a
              key={label}
              href={to}
              className="navbar__link"
              onClick={(e) => handleAnchor(e, to)}
            >
              {label}
            </a>
          ))}
          <div className="navbar__actions navbar__actions--mobile">
            <Link to="/login" className="btn-outline btn-sm">Login</Link>
            <Link to="/book" className="btn-primary btn-sm">Book Appointment</Link>
          </div>
        </nav>

        <div className="navbar__actions navbar__actions--desktop">
          <Link to="/login" className="btn-outline btn-sm">Login</Link>
          <Link to="/book" className="btn-primary btn-sm">Book Appointment</Link>
        </div>

        <button
          className={`navbar__burger${menuOpen ? ' navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
