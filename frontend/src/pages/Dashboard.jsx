import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ user, handleLogout, getPlanBadge }) => {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Ăn uống');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Lấy dữ liệu
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Tính toán
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  
  const formatCompact = (amount) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
    return amount;
  };

  // Tạo lưới lịch đơn giản (35 ô = 5 tuần)
  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Ngày 1 của tháng là thứ mấy (0=CN, 1=T2, ... 6=T7)
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = firstDay === 0 ? 7 : firstDay; // Chỉnh lại T2 là 1, CN là 7

    const grid = [];
    
    // Ngày tháng trước (muted)
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i > 0; i--) {
      grid.push({ date: prevMonthDays - i + 1, muted: true, incomes: [], expenses: [] });
    }

    // Ngày tháng này
    for (let i = 1; i <= daysInMonth; i++) {
      // Tìm các giao dịch trong ngày i
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      
      const incomes = dayTransactions.filter(t => t.type === 'INCOME');
      const expenses = dayTransactions.filter(t => t.type === 'EXPENSE');

      grid.push({ date: i, muted: false, incomes, expenses });
    }

    // Ngày tháng sau (muted) lấp đầy 35 ô
    let nextDay = 1;
    while (grid.length < 35) {
      grid.push({ date: nextDay++, muted: true, incomes: [], expenses: [] });
    }
    
    // Đảm bảo lưới có đủ hàng (bội số của 7)
    while (grid.length % 7 !== 0) {
      grid.push({ date: nextDay++, muted: true, incomes: [], expenses: [] });
    }

    return grid;
  };

  const grid = generateCalendar();

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
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {getPlanBadge(user.plan)}
          </div>
          <button className="btn-outline" style={{ width: '100%', borderColor: 'var(--color-expense)', color: 'var(--color-expense)' }} onClick={handleLogout}>
            Đăng xuất
          </button>
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
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', placeItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user.name.charAt(0).toUpperCase()}
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
    </div>
  );
};

export default Dashboard;
