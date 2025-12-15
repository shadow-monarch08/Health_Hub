import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import EpicCallback from './pages/EpicCallback';
import './index.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('auth_token');

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/epic/callback" element={<EpicCallback />} />
    </Routes>
  );
}

export default App;
