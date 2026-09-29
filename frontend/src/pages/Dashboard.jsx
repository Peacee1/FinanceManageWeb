import React from 'react';

const Dashboard = ({ user, handleLogout, getPlanBadge }) => {
  // Dữ liệu mô phỏng cho Lịch
  const days = [
    { date: 31, muted: true, income: null, expense: null },
    { date: 1, muted: false, income: '500k', expense: '50k' },
    { date: 2, muted: false, income: null, expense: null },
    { date: 3, muted: false, income: null, expense: '120k' },
    { date: 4, muted: false, income: null, expense: null },
    { date: 5, muted: false, income: null, expense: '80k' },
    { date: 6, muted: false, income: null, expense: null },
    { date: 7, muted: false, income: null, expense: '35k' },
    { date: 8, muted: false, income: null, expense: null },
    { date: 9, muted: false, income: '8.5M', expense: '120k' },
    { date: 10, muted: false, income: null, expense: '45k' },
    { date: 11, muted: false, income: null, expense: null },
    { date: 12, muted: false, income: null, expense: '320k' },
    { date: 13, muted: false, income: null, expense: null },
    { date: 14, muted: false, income: null, expense: null },
    { date: 15, muted: false, income: null, expense: '250k' },
    { date: 16, muted: false, income: null, expense: null },
    { date: 17, muted: false, income: '2M', expense: null },
    { date: 18, muted: false, income: null, expense: '150k' },
    { date: 19, muted: false, income: null, expense: null },
    { date: 20, muted: false, income: null, expense: null },
    { date: 21, muted: false, income: null, expense: null },
    { date: 22, muted: false, income: null, expense: null },
    { date: 23, muted: false, income: null, expense: null },
    { date: 24, muted: false, income: null, expense: null },
    { date: 25, muted: false, income: null, expense: null },
    { date: 26, muted: false, income: null, expense: null },
    { date: 27, muted: false, income: null, expense: null },
    { date: 28, muted: false, income: null, expense: null },
    { date: 29, muted: false, income: null, expense: null },
    { date: 30, muted: false, income: null, expense: null },
    { date: 1, muted: true, income: null, expense: null },
    { date: 2, muted: true, income: null, expense: null },
    { date: 3, muted: true, income: null, expense: null },
    { date: 4, muted: true, income: null, expense: null },
  ];

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
            <h2>September 2026</h2>
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
            <p className="amount">12,450,000₫</p>
          </div>
          <div className="summary-card">
            <h3>↑ Income</h3>
            <p className="amount income">15,200,000₫</p>
          </div>
          <div className="summary-card">
            <h3>↓ Expense</h3>
            <p className="amount expense">2,750,000₫</p>
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
            {days.map((day, index) => (
              <div key={index} className={`calendar-cell ${day.muted ? 'muted' : ''}`}>
                <div className="date">{day.date}</div>
                {day.income && <span className="transaction-badge income">+{day.income}</span>}
                {day.expense && <span className="transaction-badge expense">-{day.expense}</span>}
              </div>
            ))}
          </div>

          <button className="add-btn">
            ＋ Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
