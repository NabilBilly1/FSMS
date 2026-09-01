import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import MasterAdmin from './pages/MasterAdmin'
import './index.css'

// A simple wrapper to check authentication on every route change
const ProtectedDashboard = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <Dashboard /> : <Navigate to="/classhouse/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to a default or show a global landing page */}
        <Route path="/" element={<Navigate to="/classhouse/login" />} />
        
        {/* Company-specific login */}
        <Route path="/:companySlug/login" element={<LoginPage />} />
        
        {/* Company-specific dashboard */}
        <Route 
          path="/:companySlug/dashboard" 
          element={<ProtectedDashboard />} 
        />


        {/* Master Admin Panel */}
        <Route path="/master-admin" element={<MasterAdmin />} />

        {/* Legacy /dashboard redirect (optional) */}
        <Route path="/dashboard" element={<Navigate to="/classhouse/dashboard" />} />

        {/* Redirect any other routes to login */}
        <Route path="*" element={<Navigate to="/classhouse/login" />} />
      </Routes>
    </Router>
  )
}

export default App
