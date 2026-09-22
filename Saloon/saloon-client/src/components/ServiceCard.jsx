import './ServiceCard.css';

const icons = {
  'Hair Styling': '✂️',
  'Hair Coloring': '🎨',
  'Facial & Skin Care': '✨',
  'Manicure & Pedicure': '💅',
};

const images = {
  'Hair Styling': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  'Hair Coloring': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
  'Facial & Skin Care': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80',
  'Manicure & Pedicure': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
};

export default function ServiceCard({ service }) {
  const icon = icons[service.name] || '💆';
  const image = images[service.name];

  return (
    <div className="service-card">
      <div className="service-card__image">
        {image ? (
          <img src={image} alt={service.name} loading="lazy" />
        ) : (
          <div className="service-card__icon">{icon}</div>
        )}
        <div className="service-card__overlay" />
      </div>
      <div className="service-card__body">
        <span className="service-card__icon-sm">{icon}</span>
        <h3>{service.name}</h3>
        <p>{service.description}</p>
        <div className="service-card__footer">
          <span className="service-card__price">From ${service.price}</span>
          <a href="#contact" className="service-card__link">Learn More →</a>
        </div>
      </div>
    </div>
  );
}
