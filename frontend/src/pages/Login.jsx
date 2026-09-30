import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, PawPrint, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Gọi API Node.js qua relative path để Nginx tự động proxy
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      // Lưu token vào localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Chuyển hướng tới trang chủ
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ 
      background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Decorative circles/clouds for the background */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.4)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.5)', borderRadius: '50%', filter: 'blur(50px)' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '15%', width: '200px', height: '200px', background: 'rgba(124, 58, 237, 0.15)', borderRadius: '50%', filter: 'blur(40px)' }}></div>

      <div className="auth-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '50px', zIndex: 1, width: '100%', maxWidth: '1000px' }}>
        
        {/* Left Side: Mascot (Hidden on small screens) */}
        <div className="auth-mascot" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <img src="/cat_budget_mascot.png" alt="Mascot" style={{ width: '100%', maxWidth: '400px', filter: 'drop-shadow(0 20px 30px rgba(124,58,237,0.2))' }} />
        </div>

        {/* Right Side: Form */}
        <div className="auth-container" style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)', 
          borderRadius: '24px', 
          padding: '40px 50px', 
          boxShadow: '0 24px 50px rgba(124, 58, 237, 0.15)',
          maxWidth: '450px',
          width: '100%',
          flex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
              <div style={{ color: 'var(--color-primary)', display: 'flex' }}>
                <PawPrint size={32} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 10px 0' }}>Peacee1 - Đăng Nhập</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              Quản lý chi tiêu thông minh • Cùng bạn xây dựng cuộc sống tốt hơn mỗi ngày
            </p>
          </div>

          {error && <div className="error-message" style={{ background: 'rgba(251, 113, 133, 0.1)', color: 'var(--color-expense)', padding: '10px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'block', color: 'var(--color-text)' }}>Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Nhập email của bạn" 
                  required 
                  style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px', border: '2px solid var(--color-border)', outline: 'none', transition: 'all 0.3s', fontSize: '1rem', background: '#F8F7FA', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'white'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.background = '#F8F7FA'; }}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'block', color: 'var(--color-text)' }}>Mật khẩu</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={20} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '15px' }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Nhập mật khẩu" 
                  required 
                  style={{ width: '100%', padding: '14px 45px', borderRadius: '12px', border: '2px solid var(--color-border)', outline: 'none', transition: 'all 0.3s', fontSize: '1rem', background: '#F8F7FA', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'white'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.background = '#F8F7FA'; }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ 
              width: '100%', 
              padding: '16px', 
              background: 'linear-gradient(90deg, #9333EA, #7C3AED)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: '700', 
              fontSize: '1.05rem', 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '10px',
              boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.3s'
            }}>
              <PawPrint size={20} />
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              <ArrowRight size={20} />
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0' }}>
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
        </div>
      </div>
    </div>
  );
};

export default Login;
