import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ServicesList from './pages/ServicesList';
import ServiceForm from './pages/ServiceForm';
import './App.css';
import './pages/Admin.css';
import { AuthProvider } from './auth/AuthContext';
import RequireAdmin from './auth/RequireAdmin';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/services" element={<ServicesList />} />
          <Route path="/services/new" element={<ServiceForm />} />
          <Route path="/services/edit/:id" element={<ServiceForm />} />
        </Route>
      </Routes>
      <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
