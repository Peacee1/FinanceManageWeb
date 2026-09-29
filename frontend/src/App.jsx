import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        return JSON.parse(userData);
      } catch(e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'ultra':
        return <span className="badge badge-ultra">Ultra 💎</span>;
      case 'plus':
        return <span className="badge badge-pro">Plus ⭐</span>;
      default:
        return <span className="badge badge-normal">Normal</span>;
    }
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            user ? 
            <Dashboard user={user} handleLogout={handleLogout} getPlanBadge={getPlanBadge} />
            : <Navigate to="/login" />
          } 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
