import './StaffCard.css';

export default function StaffCard({ name, role, description, image }) {
  return (
    <div className="staff-card">
      <div className="staff-card__image">
        <img src={image} alt={name} loading="lazy" />
      </div>
      <div className="staff-card__body">
        <h3>{name}</h3>
        <span className="staff-card__role">{role}</span>
        <p>{description}</p>
      </div>
    </div>
  );
}
