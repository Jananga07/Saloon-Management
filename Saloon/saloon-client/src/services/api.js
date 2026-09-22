import axios from 'axios';

const BASE_URL = 'http://localhost:5097/api';

const api = axios.create({ baseURL: BASE_URL });

export async function fetchServices() {
  try {
    const res = await api.get('/SalonServices');
    return res.data;
  } catch {
    // Fallback sample data when API is unavailable
    return [
      {
        id: 1,
        name: 'Hair Styling',
        description: 'Expert cuts, blowouts, and styling for every occasion.',
        price: 65,
        durationMinutes: 60,
        isActive: true,
      },
      {
        id: 2,
        name: 'Hair Coloring',
        description: 'Vibrant color, balayage, highlights, and toning services.',
        price: 120,
        durationMinutes: 120,
        isActive: true,
      },
      {
        id: 3,
        name: 'Facial & Skin Care',
        description: 'Revitalizing facials and skin treatments for a radiant glow.',
        price: 85,
        durationMinutes: 75,
        isActive: true,
      },
      {
        id: 4,
        name: 'Manicure & Pedicure',
        description: 'Luxury nail care with premium products for flawless results.',
        price: 55,
        durationMinutes: 60,
        isActive: true,
      },
    ];
  }
}
