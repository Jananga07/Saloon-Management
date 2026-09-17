import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>Saloon</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Services</Link>
        <Link to="/services/new" style={styles.link}>+ Add Service</Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#1a1a2e', color: '#fff' },
  brand: { color: '#e94560', fontWeight: 'bold', fontSize: '1.4rem', textDecoration: 'none' },
  links: { display: 'flex', gap: '1.5rem' },
  link: { color: '#fff', textDecoration: 'none', fontSize: '0.95rem' },
};
