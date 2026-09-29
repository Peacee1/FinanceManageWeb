import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ user, handleLogout, getPlanBadge }) => {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Transaction Form State
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Ăn uống');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Profile Form State
  const [newPhone, setNewPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (error) {
      console.error('Lỗi lấy giao dịch:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData(res.data);
    } catch (error) {
      console.error('Lỗi lấy profile:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProfile();
  }, []);

  const openProfile = () => {
    setIsDropdownOpen(false);
    fetchProfile();
    setIsProfileOpen(true);
  };

  const handleVerifyEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/verify-email', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('Đã gửi mã xác thực tới email của bạn (Mô phỏng thành công)');
      fetchProfile();
    } catch (error) {
      alert('Lỗi xác thực email');
    }
  };

  const handleAddPhone = async () => {
    if (!newPhone) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/update-phone', { phone: newPhone }, { headers: { Authorization: `Bearer ${token}` } });
      setShowPhoneInput(false);
      fetchProfile();
    } catch (error) {
      alert('Lỗi cập nhật số điện thoại');
    }
  };

  const handleVerifyPhone = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/verify-phone', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('Xác thực SĐT thành công (Mô phỏng)');
      fetchProfile();
    } catch (error) {
      alert('Lỗi xác thực SĐT');
    }
  };

  const handleUpgrade = async (targetPlan) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/upgrade-plan', { targetPlan }, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      
      // Update local storage so the whole app updates
      const updatedUser = { ...user, plan: targetPlan };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      fetchProfile();
      window.location.reload(); // Reload to refresh sidebar badge
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi nâng cấp');
    }
  };

  const handleCheckIn = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/checkin', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      fetchProfile();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi điểm danh');
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/transactions', {
        type, amount: parseInt(amount), category, date, description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      fetchTransactions();
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm giao dịch!');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatCompact = (amount) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
    return amount;
  };

  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = firstDay === 0 ? 7 : firstDay;

    const grid = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i > 0; i--) grid.push({ date: prevMonthDays - i + 1, muted: true, incomes: [], expenses: [] });

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      grid.push({ date: i, muted: false, incomes: dayTransactions.filter(t => t.type === 'INCOME'), expenses: dayTransactions.filter(t => t.type === 'EXPENSE') });
    }

    let nextDay = 1;
    while (grid.length < 35 || grid.length % 7 !== 0) grid.push({ date: nextDay++, muted: true, incomes: [], expenses: [] });
    return grid;
  };

  const grid = generateCalendar();

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">💜 Peacee1</div>
          <div className="user-profile">
            👤 {user.name.split(' ')[0]}
          </div>
        </div>
        <ul className="nav-menu">
          <li className="nav-item active">🏠 Dashboard</li>
          <li className="nav-item">📅 Calendar</li>
          <li className="nav-item">📊 Reports</li>
          <li className="nav-item">🎯 Budget</li>
        </ul>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          {getPlanBadge(user.plan)}
          
          {profileData && (
            <div style={{ margin: '15px 0', padding: '10px', background: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--color-warning)', fontSize: '1.2rem' }}>
                🪙 {profileData.coin}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                🔥 Streak: {profileData.checkin_streak} ngày
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, var(--color-warning), #F59E0B)' }}
                onClick={handleCheckIn}
              >
                Điểm danh (+20🪙)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="page-header">
          <div className="month-selector">
            <h2>{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-outline">← Today →</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '1.25rem', cursor: 'pointer' }}>🔔</span>
            <div className="avatar-container">
              <div 
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', placeItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              
              {isDropdownOpen && (
                <div className="avatar-dropdown">
                  <div className="dropdown-item" onClick={openProfile}>👤 Hồ sơ cá nhân</div>
                  <div className="dropdown-item danger" onClick={handleLogout}>🚪 Đăng xuất</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <h3>💰 Balance</h3>
            <p className="amount">{formatCurrency(balance)}</p>
          </div>
          <div className="summary-card">
            <h3>↑ Income</h3>
            <p className="amount income">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="summary-card">
            <h3>↓ Expense</h3>
            <p className="amount expense">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Calendar View */}
        <div className="calendar-container">
          <div className="calendar-header">
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
            <div>SUN</div>
          </div>
          <div className="calendar-grid">
            {grid.map((day, index) => (
              <div key={index} className={`calendar-cell ${day.muted ? 'muted' : ''}`}>
                <div className="date">{day.date}</div>
                {day.incomes.slice(0,2).map((t, i) => (
                   <span key={i} className="transaction-badge income">+{formatCompact(t.amount)}</span>
                ))}
                {day.expenses.slice(0,2).map((t, i) => (
                   <span key={i} className="transaction-badge expense">-{formatCompact(t.amount)}</span>
                ))}
                {(day.incomes.length + day.expenses.length) > 4 && (
                  <span style={{fontSize: '0.7rem', color: 'var(--color-text-secondary)', textAlign: 'right', display: 'block'}}>...</span>
                )}
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            ＋ Add Transaction
          </button>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Thêm Giao Dịch</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddTransaction}>
              <div className="input-group">
                <label>Loại</label>
                <select className="plan-select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>
              <div className="input-group">
                <label>Danh mục</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} required placeholder="Ví dụ: Lương, Ăn uống..." />
              </div>
              <div className="input-group">
                <label>Số tiền (VNĐ)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="50000" min="1000" />
              </div>
              <div className="input-group">
                <label>Ngày</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Ghi chú (Tùy chọn)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Chi tiết khoản tiền..." />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu giao dịch'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileOpen && profileData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Hồ Sơ Cá Nhân</h3>
              <button className="close-btn" onClick={() => setIsProfileOpen(false)}>×</button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'inline-flex', placeItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                {profileData.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '10px 0 5px', fontSize: '1.5rem' }}>{profileData.name}</h2>
              <div>{getPlanBadge(profileData.plan)}</div>
              <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                🪙 {profileData.coin} Coins
              </div>
            </div>

            <div className="profile-info-row">
              <span className="profile-info-label">Email:</span>
              <div className="profile-info-value">
                {profileData.email}
                {!profileData.email_verified && <button className="verify-btn" onClick={handleVerifyEmail}>Xác thực ngay</button>}
                {profileData.email_verified && <span style={{color: 'var(--color-income)', marginLeft: '10px'}}>✓ Đã xác thực</span>}
              </div>
            </div>

            <div className="profile-info-row">
              <span className="profile-info-label">Số điện thoại:</span>
              <div className="profile-info-value">
                {profileData.phone ? (
                  <>
                    {profileData.phone}
                    {!profileData.phone_verified && <button className="verify-btn" onClick={handleVerifyPhone}>Xác thực</button>}
                    {profileData.phone_verified && <span style={{color: 'var(--color-income)', marginLeft: '10px'}}>✓ Đã xác thực</span>}
                  </>
                ) : (
                  <>
                    {!showPhoneInput ? (
                      <button className="verify-btn" style={{background: 'var(--color-secondary)'}} onClick={() => setShowPhoneInput(true)}>Thêm SĐT</button>
                    ) : (
                      <div style={{display: 'flex', gap: '5px'}}>
                        <input type="text" placeholder="Nhập SĐT..." style={{padding: '4px', width: '120px'}} value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <button className="verify-btn" onClick={handleAddPhone}>Lưu</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Upgrade Section */}
            <h4 style={{marginTop: '20px', marginBottom: '10px'}}>🚀 Nâng Cấp Tài Khoản</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(profileData.plan === 'normal') && (
                <div className="upgrade-card">
                  <h4>Gói Plus</h4>
                  <p style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '5px 0'}}>1000 Coins</p>
                  <button className="upgrade-btn" onClick={() => handleUpgrade('plus')}>Nâng cấp</button>
                </div>
              )}
              
              {(profileData.plan === 'normal' || profileData.plan === 'plus') && (
                <div className="upgrade-card" style={{borderColor: 'var(--color-primary)'}}>
                  <h4>Gói Ultra 💎</h4>
                  <p style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '5px 0'}}>
                    {profileData.plan === 'normal' ? '3500' : '3000'} Coins
                  </p>
                  <button className="upgrade-btn" onClick={() => handleUpgrade('ultra')}>Nâng cấp</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
