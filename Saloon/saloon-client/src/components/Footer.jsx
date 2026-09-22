import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__logo">LUMIÈRE <em>SALON</em></span>
          <p>A premium beauty experience crafted around you. Your confidence is our art.</p>
          <div className="footer__social">
            {['Instagram', 'Facebook', 'TikTok', 'Pinterest'].map((s) => (
              <a key={s} href="#" className="footer__social-link" aria-label={s}>{s[0]}</a>
            ))}
          </div>
        </div>

        <div className="footer__col">
          <h4>Quick Links</h4>
          <ul>
            {['Home', 'Services', 'About', 'Staff', 'Contact'].map((l) => (
              <li key={l}><a href="#">{l}</a></li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <h4>Services</h4>
          <ul>
            {['Hair Styling', 'Hair Coloring', 'Facial & Skin Care', 'Manicure & Pedicure', 'Bridal Packages'].map((s) => (
              <li key={s}><a href="#">{s}</a></li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <h4>Contact & Hours</h4>
          <ul className="footer__info">
            <li>📍 42 Elegance Avenue, Colombo</li>
            <li>📞 +94 11 234 5678</li>
            <li>✉️ hello@lumieresalon.lk</li>
          </ul>
          <div className="footer__hours">
            <p><strong>Mon – Sat</strong><br />9:00 AM – 8:00 PM</p>
            <p><strong>Sunday</strong><br />10:00 AM – 6:00 PM</p>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} Lumière Salon. All rights reserved.</p>
      </div>
    </footer>
  );
}
