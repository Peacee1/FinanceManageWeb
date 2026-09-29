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

  const validatePassword = (pwd) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    if (pwd.length < minLength) return 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!hasUpper) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
    if (!hasLower) return 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
    if (!hasNumber) return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
    if (!hasSpecial) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Kiểm tra tính an toàn của mật khẩu
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/register', {
        name,
        email,
        password
      });

      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Peacee1 - Đăng Ký</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleRegister}>
        <div className="input-group">
          <label>Họ và Tên</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" required />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email của bạn" required />
        </div>
        <div className="input-group">
          <label>Mật khẩu</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tạo mật khẩu bảo mật" required />
          <small style={{ color: 'var(--color-text-secondary)', marginTop: '5px', fontSize: '0.8rem' }}>
            Yêu cầu: Ít nhất 8 ký tự, 1 chữ hoa, 1 số, 1 ký tự đặc biệt.
          </small>
        </div>
        
        <button type="submit" className="btn-primary" style={{ marginTop: '15px' }} disabled={loading}>
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
