import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Gọi API Node.js
      await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password
      });

      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      
      // Đợi 1.5s rồi chuyển về trang đăng nhập
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Tạo Tài Khoản</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleRegister}>
        <div className="input-group">
          <label>Họ và Tên</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Nhập tên của bạn" 
            required 
          />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Nhập email của bạn" 
            required 
          />
        </div>
        <div className="input-group">
          <label>Mật khẩu</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Tạo mật khẩu bảo mật" 
            required 
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>
      <div className="auth-link">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </div>
    </div>
  );
};

export default Register;
