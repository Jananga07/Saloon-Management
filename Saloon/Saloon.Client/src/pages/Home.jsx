function Home() {
  return (
    <div>
      <section className="hero">
        <div className="hero-content">
          <p className="hero-subtitle">WELCOME TO OUR SALON</p>

          <h1>
            Your Beauty,
            <br />
            Our Passion.
          </h1>

          <p className="hero-description">
            Experience professional beauty and hair services
            in a relaxing and comfortable environment.
          </p>

          <button className="book-btn">
            Book an Appointment
          </button>
        </div>
      </section>

      <section className="services-preview">
        <p className="section-subtitle">WHAT WE OFFER</p>

        <h2>Our Services</h2>

        <div className="service-cards">
          <div className="service-card">
            <h3>Hair Styling</h3>
            <p>
              Professional haircuts and styling by our experienced staff.
            </p>
          </div>

          <div className="service-card">
            <h3>Hair Coloring</h3>
            <p>
              Beautiful and professional hair coloring services.
            </p>
          </div>

          <div className="service-card">
            <h3>Beauty Care</h3>
            <p>
              Relaxing beauty treatments designed for you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;