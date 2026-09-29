import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'ultra':
        return <span className="badge badge-ultra">Ultra 💎</span>;
      case 'pro':
        return <span className="badge badge-pro">Pro ⭐</span>;
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
            <div className="dashboard-container">
              <h1>Peacee1 - Dashboard Quản Lý Tài Chính</h1>
              <div style={{ margin: '15px 0', fontSize: '1.2rem' }}>
                Gói tài khoản hiện tại: {getPlanBadge(user.plan)}
              </div>
              <button className="btn-primary" style={{ width: 'auto', marginTop: '20px' }} onClick={handleLogout}>
                Đăng xuất
              </button>
            </div> 
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
