import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { 
  LayoutDashboard, CalendarRange, CircleDollarSign, WalletCards, 
  PieChart as PieChartIcon, Target, Tags, User, Settings, 
  Search, Bell, Crown, ChevronLeft, ChevronRight, Plus, Minus, 
  FileDown, ArrowUpRight, ArrowDownRight, MoreVertical, 
  ShoppingBag, Utensils, Car, Gamepad2, MoreHorizontal 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

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

  // Avatar Crop State
  const [avatarImage, setAvatarImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Day Details State
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/transactions', { headers: { Authorization: `Bearer ${token}` } });
      setTransactions(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      setProfileData(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProfile();
  }, []);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setAvatarImage(reader.result);
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => (image.onload = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 256, 256);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  };

  const handleCropComplete = async () => {
    if (!croppedAreaPixels || !avatarImage) return;
    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(avatarImage, croppedAreaPixels);
      const formData = new FormData();
      formData.append('avatar', croppedBlob, 'avatar.jpg');
      const token = localStorage.getItem('token');
      await axios.post('/api/users/update-avatar', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setIsCropModalOpen(false);
      setAvatarImage(null);
      fetchProfile(); 
    } catch (error) {
      alert('Lỗi cập nhật ảnh đại diện');
    } finally { setLoading(false); }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/transactions', {
        type, amount: parseInt(amount), category, date, description
      }, { headers: { Authorization: `Bearer ${token}` } });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      fetchTransactions();
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm giao dịch!');
    } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatCompact = (amount) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
    return amount;
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonthTx = transactions.filter(t => new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);

  const handlePrevDate = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
  };

  const handleNextDate = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const totalIncome = currentMonthTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const totalExpense = currentMonthTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const generateCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = firstDay === 0 ? 7 : firstDay;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const grid = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i > 0; i--) grid.push({ date: prevMonthDays - i + 1, muted: true, incomes: [], expenses: [] });

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTx = currentMonthTx.filter(t => t.date.startsWith(dateStr));
      const cellDate = new Date(currentYear, currentMonth, i);
      const isFuture = cellDate > todayDate;
      const isToday = cellDate.getTime() === todayDate.getTime();
      
      grid.push({ 
        date: i, fullDate: dateStr, muted: isFuture, isToday,
        incomes: dayTx.filter(t => t.type === 'INCOME'), 
        expenses: dayTx.filter(t => t.type === 'EXPENSE') 
      });
    }
    let nextDay = 1;
    while (grid.length < 35 || grid.length % 7 !== 0) grid.push({ date: nextDay++, muted: true, incomes: [], expenses: [] });
    return grid;
  };

  const grid = generateCalendar();

  const getCategoryIcon = (cat, color) => {
    const icons = {
      'Shopping': <ShoppingBag size={20} color={color}/>,
      'Ăn uống': <Utensils size={20} color={color}/>,
      'Di chuyển': <Car size={20} color={color}/>,
      'Giải trí': <Gamepad2 size={20} color={color}/>,
      'Khác': <MoreHorizontal size={20} color={color}/>
    };
    return icons[cat] || <Tags size={20} color={color}/>;
  };

  const getCategoryColor = (cat) => {
    const colors = { 'Shopping': '#FB7185', 'Ăn uống': '#FBBF24', 'Di chuyển': '#60A5FA', 'Giải trí': '#A78BFA', 'Khác': '#9CA3AF' };
    return colors[cat] || '#7C3AED';
  };

  const expensesByCategory = currentMonthTx.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + parseInt(t.amount);
    return acc;
  }, {});

  const pieData = Object.keys(expensesByCategory).length > 0 ? Object.keys(expensesByCategory).map(key => ({
    name: key, value: expensesByCategory[key]
  })) : [{ name: 'Chưa có', value: 1 }];

  // Computed Chart Data from currentMonthTx
  const daysInMonthChart = new Date(currentYear, currentMonth + 1, 0).getDate();
  const intervals = [
    { start: 1, end: 5 },
    { start: 6, end: 10 },
    { start: 11, end: 15 },
    { start: 16, end: 20 },
    { start: 21, end: 25 },
    { start: 26, end: daysInMonthChart },
  ];

  const lineData = intervals.map(interval => {
    const txInInterval = currentMonthTx.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return day >= interval.start && day <= interval.end;
    });
    const income = txInInterval.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
    const expense = txInInterval.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
    return {
      name: `${interval.end}/${String(currentMonth + 1).padStart(2, '0')}`,
      income,
      expense
    };
  });

  const avatarSrc = profileData?.avatar_url 
    ? (profileData.avatar_url.startsWith('http') ? profileData.avatar_url : `/api${profileData.avatar_url}`) 
    : null;

  const renderSidebarBadge = (plan) => {
    if (plan === 'ultra') return <div className="pro-badge" style={{background: '#EDE9FE', color: '#7C3AED', borderColor: '#DDD6FE'}}>💎 Ultra</div>;
    if (plan === 'plus') return <div className="pro-badge">⭐ Plus</div>;
    return <div className="pro-badge" style={{background: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB'}}>Normal</div>;
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo-text" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <img src="/wallet_logo.png" alt="Logo" style={{height: '32px'}} />
            Peacee1
          </div>
          {renderSidebarBadge(user.plan)}
        </div>
        
        <ul className="nav-menu">
          <li className="nav-item active"><LayoutDashboard size={20}/> Tổng quan</li>
          <li className="nav-item"><CalendarRange size={20}/> Lịch giao dịch</li>
          <li className="nav-item"><CircleDollarSign size={20}/> Thu chi</li>
          <li className="nav-item"><WalletCards size={20}/> Ngân sách</li>
          <li className="nav-item"><PieChartIcon size={20}/> Báo cáo</li>
          <li className="nav-item"><Target size={20}/> Mục tiêu</li>
          <li className="nav-item"><Tags size={20}/> Danh mục</li>
          <li className="nav-item" onClick={() => setIsProfileOpen(true)}><User size={20}/> Tài khoản</li>
          <li className="nav-item"><Settings size={20}/> Cài đặt</li>
        </ul>

        <div className="promo-card">
          <img src="/cat_mascot.png" alt="Cat" className="promo-img" style={{width: 80}}/>
          <h4 style={{fontSize: '1rem'}}>Cùng kiểm soát chi tiêu tốt hơn!</h4>
          <p>Nâng cấp để mở khóa thêm nhiều tính năng</p>
          <button className="btn-promo" onClick={() => setIsProfileOpen(true)}>Nâng cấp Pro</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>Xin chào, {user.name.split(' ')[0]}! 👋</h1>
            <p>Cùng quản lý tài chính để đạt được mục tiêu của bạn</p>
          </div>
          
          <div className="header-right">
            <div className="search-bar">
              <Search size={18} color="var(--color-text-secondary)"/>
              <input type="text" placeholder="Tìm kiếm giao dịch, danh mục..." />
              <span className="search-shortcut">Ctrl + K</span>
            </div>
            
            <div className="date-selector">
              <button className="btn-icon" onClick={handlePrevMonth}><ChevronLeft size={20}/></button>
              <span>📅 Tháng {currentMonth + 1}, {currentYear}</span>
              <button className="btn-icon" onClick={handleNextMonth}><ChevronRight size={20}/></button>
            </div>
            
            <button className="btn-today" onClick={handleToday}>Hôm nay</button>
            
            <div className="notification">
              <Bell size={20} color="var(--color-text-secondary)"/>
              <div className="notification-dot"></div>
            </div>

            <div className="user-profile-header" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{position: 'relative'}}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover'}}/>
              ) : (
                <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{user.name.charAt(0)}</div>
              )}
              <span>{user.name.split(' ')[user.name.split(' ').length - 1]}</span>
              <ChevronRight size={16} style={{transform: 'rotate(90deg)'}}/>
              
              {isDropdownOpen && (
                <div className="avatar-dropdown" style={{top: 50}}>
                  <div className="dropdown-item" onClick={() => setIsProfileOpen(true)}>👤 Hồ sơ</div>
                  <div className="dropdown-item danger" onClick={handleLogout}>🚪 Đăng xuất</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-scroll">
          {/* Top Stat Cards */}
          <div className="cards-row">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(124, 58, 237, 0.1)'}}>
                  <WalletCards color="var(--color-primary)" size={24}/>
                </div>
                <div className="stat-badge" style={{background: 'rgba(251, 113, 133, 0.1)', color: 'var(--color-expense)'}}>
                  ↘ 100%
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-title">Số dư hiện tại</div>
                <h3 className="stat-amount">{formatCurrency(balance)}</h3>
                <div className="stat-subtitle">Giảm {formatCompact(Math.abs(balance))} so với tháng trước</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(52, 211, 153, 0.1)'}}>
                  <ArrowUpRight color="var(--color-income)" size={24}/>
                </div>
                <div className="stat-badge" style={{background: 'rgba(52, 211, 153, 0.1)', color: 'var(--color-income)'}}>
                  ↗ 100%
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-title">Tổng thu</div>
                <h3 className="stat-amount" style={{color: 'var(--color-income)'}}>{formatCurrency(totalIncome)}</h3>
                <div className="stat-subtitle">{currentMonthTx.filter(t => t.type==='INCOME').length} giao dịch</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(251, 113, 133, 0.1)'}}>
                  <ArrowDownRight color="var(--color-expense)" size={24}/>
                </div>
                <div className="stat-badge" style={{background: 'rgba(251, 113, 133, 0.1)', color: 'var(--color-expense)'}}>
                  ↗ 100%
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-title">Tổng chi</div>
                <h3 className="stat-amount" style={{color: 'var(--color-expense)'}}>{formatCurrency(totalExpense)}</h3>
                <div className="stat-subtitle">{currentMonthTx.filter(t => t.type==='EXPENSE').length} giao dịch</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)'}}>
                  <Target color="#F59E0B" size={24}/>
                </div>
              </div>
              <div className="stat-content">
                <div className="stat-title">Còn lại trong ngân sách</div>
                <h3 className="stat-amount">{(10000000 - totalExpense) > 0 ? formatCurrency(10000000 - totalExpense) : '0 đ'}</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px'}}>
                  <div className="progress-container" style={{flex: 1, marginTop: 0}}>
                    <div className="progress-bar" style={{background: 'var(--color-primary)', width: `${Math.min((totalExpense / 10000000) * 100, 100)}%`}}></div>
                  </div>
                  <span style={{fontSize: '0.8rem', fontWeight: 'bold'}}>{Math.min(Math.round((totalExpense / 10000000) * 100), 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="main-grid">
            <div className="grid-col">
              
              {/* Calendar Widget */}
              <div className="widget">
                <div className="widget-header">
                  <div>
                    <h3 className="widget-title">Lịch giao dịch</h3>
                    <div style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px'}}>Tháng {currentMonth + 1}, {currentYear}</div>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div className="date-selector" style={{padding: '0.4rem 0.8rem', background: '#F8F9FA'}}>
                      <button className="btn-icon" onClick={handlePrevDate}><ChevronLeft size={16}/></button>
                      <span style={{fontSize: '0.8rem', cursor: 'pointer'}} onClick={handleToday}>
                        {currentDate.toDateString() === new Date().toDateString() ? 'Hôm nay' : currentDate.toLocaleDateString('vi-VN')}
                      </span>
                      <button className="btn-icon" onClick={handleNextDate}><ChevronRight size={16}/></button>
                    </div>
                    <div style={{display: 'flex', background: '#F8F9FA', padding: '4px', borderRadius: '8px', gap: '4px'}}>
                      <div style={{padding: '4px 12px', background: 'white', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>Tháng</div>
                      <div style={{padding: '4px 12px', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-secondary)'}}>Tuần</div>
                      <div style={{padding: '4px 12px', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-secondary)'}}>Ngày</div>
                    </div>
                  </div>
                </div>

                <div className="cal-header-row">
                  <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
                </div>
                <div className="cal-grid">
                  {grid.map((day, i) => {
                    const isSelectedDate = !day.muted && day.date === currentDate.getDate();
                    return (
                    <div key={i} className={`cal-cell ${day.muted ? 'muted' : ''} ${day.isToday ? 'today' : ''} ${isSelectedDate ? 'active' : ''}`} 
                         onClick={() => !day.muted && setSelectedDayInfo(day)}
                         style={{ cursor: day.muted ? 'not-allowed' : 'pointer', border: isSelectedDate ? '2px solid var(--color-primary)' : '' }}>
                      <div className="cal-date" style={{background: isSelectedDate ? 'var(--color-primary)' : '', color: isSelectedDate ? 'white' : ''}}>{day.date}</div>
                      {day.incomes.slice(0,1).map((t, j) => (
                        <div key={j} className="tx-badge income"><div className="tx-dot income"></div> +{formatCompact(t.amount)}</div>
                      ))}
                      {day.expenses.slice(0,1).map((t, j) => (
                        <div key={j} className="tx-badge expense"><div className="tx-dot expense"></div> -{formatCompact(t.amount)}</div>
                      ))}
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Recent Transactions Widget */}
              <div className="widget">
                <div className="widget-header">
                  <h3 className="widget-title">Giao dịch gần đây</h3>
                  <span className="widget-link">Xem tất cả</span>
                </div>
                <div className="tx-list">
                  {currentMonthTx.slice(0, 5).map((t, i) => (
                    <div key={i} className="tx-item">
                      <div className="tx-left">
                        <div className="tx-icon" style={{background: `${getCategoryColor(t.category)}15`}}>
                          {getCategoryIcon(t.category, getCategoryColor(t.category))}
                        </div>
                        <div className="tx-info">
                          <h5>{t.category}</h5>
                          <p>{t.description || (t.type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu')}</p>
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '40px'}}>
                        <div className="tx-date">{new Date(t.date).toLocaleDateString('vi-VN')}</div>
                        <div className="tx-amount" style={{color: t.type === 'INCOME' ? 'var(--color-income)' : 'var(--color-expense)'}}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                        </div>
                        <MoreVertical size={16} color="var(--color-text-secondary)" style={{cursor: 'pointer'}}/>
                      </div>
                    </div>
                  ))}
                  {currentMonthTx.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--color-text-secondary)', padding: '1rem'}}>Chưa có giao dịch nào</div>
                  )}
                </div>
              </div>

            </div>

            <div className="grid-col">
              
              {/* Chart Widget */}
              <div className="widget">
                <div className="widget-header" style={{marginBottom: '0.5rem'}}>
                  <h3 className="widget-title">Biểu đồ thu chi</h3>
                  <div style={{fontSize: '0.8rem', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '6px'}}>Tháng này ⌄</div>
                </div>
                <div style={{display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px', fontSize: '0.8rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#34D399'}}></div> Thu nhập</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#FB7185'}}></div> Chi tiêu</div>
                </div>
                <div style={{height: 200, width: '100%'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E5F3"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#716B7A'}} dy={10}/>
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#716B7A'}} tickFormatter={(v) => (v/1000000)+'M'}/>
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="income" stroke="#34D399" strokeWidth={3} dot={{r: 4, fill: '#34D399', strokeWidth: 2, stroke: '#fff'}} />
                      <Line type="monotone" dataKey="expense" stroke="#FB7185" strokeWidth={3} dot={{r: 4, fill: '#FB7185', strokeWidth: 2, stroke: '#fff'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart Widget */}
              <div className="widget">
                <div className="widget-header">
                  <h3 className="widget-title">Tỷ lệ chi tiêu</h3>
                  <div style={{fontSize: '0.8rem', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '6px'}}>Tháng này ⌄</div>
                </div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{width: 120, height: 120, position: 'relative'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem'}}>
                      {totalExpense > 0 ? '100%' : '0%'}
                    </div>
                  </div>
                  <div style={{flex: 1, marginLeft: '1rem'}}>
                    {pieData.map((item, i) => (
                      <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', width: '80px'}}>
                          <div style={{width: 8, height: 8, borderRadius: '4px', background: getCategoryColor(item.name)}}></div>
                          <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.name}</span>
                        </div>
                        <div style={{fontWeight: '500'}}>{totalExpense > 0 ? ((item.value/totalExpense)*100).toFixed(1) : 0}%</div>
                        <div style={{fontWeight: '700', color: 'var(--color-expense)'}}>{formatCompact(item.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Widget */}
              <div className="widget">
                <div className="widget-header">
                  <h3 className="widget-title">Ngân sách tháng</h3>
                  <span className="widget-link">Xem tất cả</span>
                </div>
                <div style={{display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px'}}>
                  <div className="stat-icon" style={{background: '#FFFBEB'}}>
                    <WalletCards color="#D97706" size={20}/>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: 'var(--color-text-secondary)'}}>Tổng ngân sách</div>
                    <div style={{fontSize: '1.2rem', fontWeight: '800'}}>10.000.000 đ</div>
                  </div>
                </div>
                <div className="progress-container" style={{height: 10}}>
                  <div className="progress-bar" style={{background: 'var(--color-expense)', width: `${Math.min((totalExpense / 10000000) * 100, 100)}%`}}></div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '5px', color: 'var(--color-text-secondary)'}}>
                  <span>Đã chi {formatCompact(totalExpense)}</span>
                  <span>Còn lại {formatCompact(Math.max(10000000 - totalExpense, 0))}</span>
                </div>
                
                <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
                  {['Shopping', 'Ăn uống', 'Di chuyển', 'Giải trí', 'Khác'].map(cat => {
                    const spent = currentMonthTx.filter(t => t.type==='EXPENSE' && t.category===cat).reduce((s, t)=>s+t.amount, 0);
                    const budget = 2000000;
                    return (
                      <div key={cat} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div className="tx-icon" style={{background: `${getCategoryColor(cat)}15`, width: 36, height: 36}}>
                          {getCategoryIcon(cat, getCategoryColor(cat))}
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px'}}>
                            <span>{cat}</span>
                            <span style={{fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 'normal'}}>{Math.min(Math.round((spent/budget)*100), 100)}% &nbsp; {formatCompact(spent)} / {formatCompact(budget)}</span>
                          </div>
                          <div className="progress-container" style={{height: 6, marginTop: 0}}>
                            <div className="progress-bar" style={{background: getCategoryColor(cat), width: `${Math.min((spent/budget)*100, 100)}%`}}></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="widget" style={{position: 'fixed', bottom: '24px', right: '24px', width: '340px', zIndex: 1000, boxShadow: '0 12px 36px rgba(0,0,0,0.12)', border: '1px solid rgba(124,58,237,0.1)', background: 'white'}}>
                <h3 className="widget-title" style={{marginBottom: '1rem'}}>Thao tác nhanh</h3>
                <div className="quick-actions" style={{gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                  <button className="btn-quick" style={{background: '#ECFDF5', color: '#059669', padding: '12px 8px'}} onClick={() => {setType('INCOME'); setIsModalOpen(true);}}>
                    <Plus size={16}/> Thêm khoản thu
                  </button>
                  <button className="btn-quick" style={{background: '#FFF1F2', color: '#E11D48', padding: '12px 8px'}} onClick={() => {setType('EXPENSE'); setIsModalOpen(true);}}>
                    <Minus size={16}/> Thêm khoản chi
                  </button>
                  <button className="btn-quick" style={{background: '#F5F3FF', color: '#7C3AED', padding: '12px 8px'}}>
                    <WalletCards size={16}/> Lập ngân sách
                  </button>
                  <button className="btn-quick" style={{background: '#EFF6FF', color: '#2563EB', padding: '12px 8px'}}>
                    <FileDown size={16}/> Xuất báo cáo
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modals from old code... */}
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
                <select style={{padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)'}} value={type} onChange={e => setType(e.target.value)}>
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>
              <div className="input-group">
                <label>Danh mục</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} required placeholder="Ví dụ: Lương, Shopping..." />
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
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Chi tiết..." />
              </div>
              <button type="submit" className="btn-promo" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu giao dịch'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedDayInfo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Giao dịch ngày {selectedDayInfo.date}</h3>
              <button className="close-btn" onClick={() => setSelectedDayInfo(null)}>×</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {selectedDayInfo.incomes.length === 0 && selectedDayInfo.expenses.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', margin: '2rem 0' }}>Không có giao dịch nào.</p>
              ) : (
                <>
                  {selectedDayInfo.incomes.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{t.category}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t.description || 'Thu nhập'}</div>
                      </div>
                      <div style={{ color: 'var(--color-income)', fontWeight: 'bold' }}>+{formatCurrency(t.amount)}</div>
                    </div>
                  ))}
                  {selectedDayInfo.expenses.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{t.category}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t.description || 'Chi tiêu'}</div>
                      </div>
                      <div style={{ color: 'var(--color-expense)', fontWeight: 'bold' }}>-{formatCurrency(t.amount)}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile and Crop Modals remain basically the same */}
      {isProfileOpen && profileData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Hồ Sơ Cá Nhân</h3>
              <button className="close-btn" onClick={() => setIsProfileOpen(false)}>×</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}/>
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    {profileData.name.charAt(0)}
                  </div>
                )}
                <label style={{ position: 'absolute', bottom: -5, right: -5, background: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  📷 <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={loading} />
                </label>
              </div>
              <h2 style={{ margin: '15px 0 5px', fontSize: '1.4rem' }}>{profileData.name}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {getPlanBadge(profileData.plan)}
              </div>
              <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '20px', color: '#D97706', fontWeight: '700', fontSize: '1rem', marginTop: '5px' }}>
                🪙 {profileData.coin} Coins
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px', marginBottom: '20px' }}>
              <div className="profile-info-row">
                <span className="profile-info-label">Email:</span>
                <span className="profile-info-value" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  {profileData.email} 
                  {profileData.email_verified ? 
                    <span style={{color: 'var(--color-income)', fontSize: '0.85rem', fontWeight: '600'}}>✓ Đã xác thực</span> : 
                    <button className="verify-btn">Xác thực</button>}
                </span>
              </div>
              
              <div className="profile-info-row">
                <span className="profile-info-label">Số điện thoại:</span>
                <span className="profile-info-value" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  {profileData.phone || 'Chưa cập nhật'} 
                  {profileData.phone ? 
                    (profileData.phone_verified ? 
                      <span style={{color: 'var(--color-income)', fontSize: '0.85rem', fontWeight: '600'}}>✓ Đã xác thực</span> : 
                      <button className="verify-btn">Xác thực</button>) : 
                    <button className="verify-btn">Thêm SDT</button>}
                </span>
              </div>
            </div>

            <button className="btn-promo" onClick={() => setIsProfileOpen(false)}>Hoàn tất</button>
          </div>
        </div>
      )}

      {isCropModalOpen && avatarImage && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
            <div className="modal-header">
              <h3>Cắt Ảnh</h3>
              <button className="close-btn" onClick={() => setIsCropModalOpen(false)}>×</button>
            </div>
            <div style={{ position: 'relative', flex: 1, background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
              <Cropper image={avatarImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(c, cp) => setCroppedAreaPixels(cp)} />
            </div>
            <button className="btn-promo" style={{marginTop: '15px'}} onClick={handleCropComplete} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Lưu Avatar'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
