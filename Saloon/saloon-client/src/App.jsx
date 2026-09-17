import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ServicesList from './pages/ServicesList';
import ServiceForm from './pages/ServiceForm';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<ServicesList />} />
        <Route path="/services/new" element={<ServiceForm />} />
        <Route path="/services/edit/:id" element={<ServiceForm />} />
      </Routes>
    </BrowserRouter>
  );
}
