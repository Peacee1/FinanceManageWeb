import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  // Kiểm tra xem user đã đăng nhập chưa
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
            <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>
              <h1>Dashboard Quản Lý Tài Chính</h1>
              <button className="btn-primary" style={{ width: 'auto', marginTop: '20px' }} onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }}>Đăng xuất</button>
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
