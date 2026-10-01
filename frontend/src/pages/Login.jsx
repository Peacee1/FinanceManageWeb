import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, PawPrint, ArrowRight, User, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [loginType, setLoginType] = useState('owner'); // 'owner' | 'employee'
  const [identifier, setIdentifier] = useState(''); // email (owner) or username (employee)
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State cho flow đổi mật khẩu lần đầu
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email: identifier,
        password,
        loginType,
      });

      const { token, user } = response.data;

      // Nếu nhân viên cần đổi mật khẩu lần đầu
      if (user.mustChangePassword && loginType === 'employee') {
        setTempToken(token);
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Co loi xay ra khi dang nhap.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Mat khau xac nhan khong khop.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }
    setChangeLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/change-password', { newPassword }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      // Sau khi đổi mật khẩu, đăng nhập lại
      const response = await axios.post('/api/auth/login', {
        email: identifier,
        password: newPassword,
        loginType,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Co loi xay ra.');
    } finally {
      setChangeLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px',
    border: '2px solid var(--color-border)', outline: 'none', transition: 'all 0.3s',
    fontSize: '1rem', background: '#F8F7FA', boxSizing: 'border-box'
  };

  return (
    <div className="auth-wrapper" style={{ 
      backgroundImage: 'url(/login_bg.png)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat', position: 'relative',
      overflow: 'hidden', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="auth-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1, width: '100%', maxWidth: '1200px', paddingRight: '10%' }}>
        <div className="auth-container" style={{ 
          background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', 
          borderRadius: '24px', padding: '40px 50px', 
          boxShadow: '0 24px 50px rgba(124, 58, 237, 0.15)',
          maxWidth: '450px', width: '100%', flex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <PawPrint size={32} color="var(--color-primary)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 8px 0' }}>
              {mustChangePassword ? 'Đặt mật khẩu mới' : (loginType === 'employee' ? 'Đăng nhập nhân viên' : 'Peacee1 - Đăng Nhập')}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              {mustChangePassword 
                ? 'Vui lòng đặt mật khẩu mới trước khi tiếp tục'
                : 'Quản lý chi tiêu thông minh • Cùng bạn xây dựng cuộc sống tốt hơn'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(251, 113, 133, 0.1)', color: 'var(--color-expense)', padding: '10px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontWeight: '500' }}>
              {error}
            </div>
          )}

          {mustChangePassword ? (
            /* Form đổi mật khẩu lần đầu */
            <form onSubmit={handleChangePassword}>
              <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '0.85rem', color: '#92400E' }}>
                ⚠️ Đây là lần đăng nhập đầu tiên. Vui lòng đặt mật khẩu mới để bảo mật tài khoản.
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <Key size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Ít nhất 8 ký tự, hoa/thường, số, ký tự đặc biệt" required style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Xác nhận mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <Key size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" required style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={changeLoading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(90deg, #9333EA, #7C3AED)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)' }}>
                {changeLoading ? 'Đang lưu...' : 'Xác nhận & Đăng nhập'} <ArrowRight size={20} />
              </button>
            </form>
          ) : (
            /* Form đăng nhập thường */
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'block', color: 'var(--color-text)' }}>
                  {loginType === 'owner' ? 'Email' : 'Tên đăng nhập (Username)'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {loginType === 'owner' ? <Mail size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px' }} /> : <User size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px' }} />}
                  <input 
                    type={loginType === 'owner' ? 'email' : 'text'}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={loginType === 'owner' ? 'Nhập email của bạn' : 'Ví dụ: CAFE-A3X9Z1'}
                    required
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.background = '#F8F7FA'; }}
                  />
                </div>
                {loginType === 'employee' && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '5px' }}>
                    Username do chủ quán cung cấp (Mã quán + Mã nhân viên)
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'block', color: 'var(--color-text)' }}>Mật khẩu</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px' }} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu" required
                    style={{ ...inputStyle, paddingRight: '45px' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.background = '#F8F7FA'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: 0 }}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: 'linear-gradient(90deg, #9333EA, #7C3AED)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)', transition: 'all 0.3s' }}>
                <PawPrint size={20} />
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                <ArrowRight size={20} />
              </button>
            </form>
          )}

          {!mustChangePassword && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
                <span style={{ padding: '0 15px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Hoặc</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Chưa có tài khoản? </span>
                <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  Đăng ký ngay <ArrowRight size={16} />
                </Link>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" disabled={loading} onClick={() => { setLoginType(loginType === 'employee' ? 'owner' : 'employee'); setIdentifier(''); setPassword(''); setShowPassword(false); setError(''); }} style={{ background: 'none', border: 'none', padding: '8px', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {loginType === 'employee' ? 'Quay lại đăng nhập bình thường' : 'Đăng nhập với tư cách nhân viên'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
