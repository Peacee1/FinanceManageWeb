import { personalPalettes, themedAsset } from '../features/personalization/personalTheme';
import '../features/personalization/personalTheme.css';
import PersonalWalletSummary from '../features/transactions/PersonalWalletSummary';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { 
  LayoutDashboard, CalendarRange, CircleDollarSign, WalletCards, 
  PieChart as PieChartIcon, Target, Tags, User, Settings, 
  Search, Bell, Crown, ChevronLeft, ChevronRight, Plus, Minus, 
  FileDown, ArrowUpRight, ArrowDownRight, MoreVertical, 
  ShoppingBag, Utensils, Car, Gamepad2, MoreHorizontal, Gift,
  Edit2, Trash2, Menu, X, Sun, Moon, Palette, Briefcase, Building2, Zap, Smartphone, Sliders, ArrowLeft
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend
} from 'recharts';

const safeJsonParse = (str, fallback) => {
  if (!str || str === 'undefined' || str === 'null') return fallback;
  try {
    const parsed = JSON.parse(str);
    return parsed !== null ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
};

const Dashboard = ({ user, handleLogout, getPlanBadge }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.setAttribute('data-theme', theme === 'system' ? (preference.matches ? 'dark' : 'light') : theme);
    apply(); localStorage.setItem('theme', theme);
    if (theme === 'system') preference.addEventListener('change', apply);
    return () => preference.removeEventListener('change', apply);
  }, [theme]);

  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [personalPaymentMethod, setPersonalPaymentMethod] = useState('');
  const [walletSettingBusy, setWalletSettingBusy] = useState(false);
  const [walletSettingError, setWalletSettingError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [accentBusy, setAccentBusy] = useState(false);
  const [accentError, setAccentError] = useState('');
  const personalAccent = profileData?.personal_accent || 'purple';
  const mascotAsset = name => themedAsset(name, personalAccent);
  useEffect(() => {
    document.documentElement.setAttribute('data-personal-accent', personalAccent);
    return () => document.documentElement.removeAttribute('data-personal-accent');
  }, [personalAccent]);
  const changeAccent = async accent => {
    if (accentBusy || !profileData) return;
    setAccentBusy(true); setAccentError('');
    try {
      await axios.post('/api/users/settings', { personalAccent: accent }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setProfileData(current => ({ ...current, personal_accent: accent }));
    } catch (error) { setAccentError(error.response?.data?.message || 'Không thể lưu màu giao diện.'); }
    finally { setAccentBusy(false); }
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [businessModel, setBusinessModel] = useState('Quán cafe');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Business Tab State
  const [isBizCreating, setIsBizCreating] = useState(false);
  const [bizData, setBizData] = useState(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizSummary, setBizSummary] = useState(null);
  const [bizSubTab, setBizSubTab] = useState('overview');
  const [bizForm, setBizForm] = useState({ model: 'Quán cafe', name: '', maxEmployees: 20 });
  const [bizAvatarFile, setBizAvatarFile] = useState(null);
  const [bizAvatarPreview, setBizAvatarPreview] = useState(null);
  const [bizEmployees, setBizEmployees] = useState([]);
  const [bizProducts, setBizProducts] = useState([]);
  const [bizActionLoading, setBizActionLoading] = useState(false);
  const [bizMsg, setBizMsg] = useState('');
  const [empForm, setEmpForm] = useState({ name: '', age: '', salary: '' });
  const [empAvatarFile, setEmpAvatarFile] = useState(null);
  const [empAvatarPreview, setEmpAvatarPreview] = useState(null);
  const [newEmpCred, setNewEmpCred] = useState(null);
  const [prodForm, setProdForm] = useState({ name: '', price: '' });
  const [prodAvatarFile, setProdAvatarFile] = useState(null);
  const [prodAvatarPreview, setProdAvatarPreview] = useState(null);

  // Goals State
  const [isGoalInitialized, setIsGoalInitialized] = useState(false);
  const [goalForm, setGoalForm] = useState({ salary: '15000000', age: '25', gender: 'Nam' });
  
  const [bankSaving, setBankSaving] = useState({ amount: 5000000, rate: 6, months: 6 });
  const [investmentIncome, setInvestmentIncome] = useState(2000000);
  const [customNormalSaving, setCustomNormalSaving] = useState(null);
  const [customBankSavingTotal, setCustomBankSavingTotal] = useState(null);
  const [userGoal, setUserGoal] = useState({ name: 'Mua xe máy', targetAmount: 50000000, deadline: '2026-12-31', currentSaved: 15000000 });
  
  const updateSettingsAPI = async (payload, reportFailure = false) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/settings', payload, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.error('Lỗi lưu cài đặt', e);
      if (reportFailure) throw e;
      alert('Không thể lưu cài đặt. Vui lòng thử lại.');
    }
  };

  const handleSaveGoals = async () => {
    try {
      await updateSettingsAPI({ bankSaving, investmentIncome, customNormalSaving, customBankSavingTotal, userGoal }, true);
      alert('Lưu cài đặt mục tiêu thành công!');
    } catch { alert('Không thể lưu mục tiêu. Vui lòng thử lại.'); }
  };
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
  const [cropTarget, setCropTarget] = useState('profile');

  // Day Details State
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [hoveredTx, setHoveredTx] = useState(null);
  const [editTxId, setEditTxId] = useState(null);
  const [openTxMenu, setOpenTxMenu] = useState(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Checkin Modal State
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);

  // Category State
  const [newCategory, setNewCategory] = useState({ name: '', type: 'EXPENSE', color: 'var(--color-primary-ink)' });
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // AI Advisor State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');

  const handleAiAnalyze = async () => {
    setIsAiModalOpen(true);
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/ai/analyze', {}, { headers: { Authorization: `Bearer ${token}` } });
      setAiAnalysis(res.data.analysis);
    } catch (err) {
      setAiAnalysis('❌ Không thể kết nối với AI lúc này. Vui lòng thử lại sau.');
    } finally {
      setAiLoading(false);
    }
  };

  // Monthly Budget State
  const [monthlyBudgets, setMonthlyBudgets] = useState({});
  const [budgetSettings, setBudgetSettings] = useState({ reminder: true, autoCopy: false });

  const getBudgetForMonth = (m, y) => {
    const key = `${y}-${m}`;
    if (monthlyBudgets[key] !== undefined) return monthlyBudgets[key];
    let searchY = y;
    let searchM = m - 1;
    for(let i=0; i<24; i++) {
        if(searchM === 0) { searchM = 12; searchY--; }
        const sKey = `${searchY}-${searchM}`;
        if (monthlyBudgets[sKey] !== undefined) return monthlyBudgets[sKey];
        searchM--;
    }
    return null;
  };

  const monthlyBudget = getBudgetForMonth(currentMonth + 1, currentYear);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');

  // Draggable Quick Actions State
  const quickActionsRef = useRef(null);
  const [qaPos, setQaPos] = useState({ left: window.innerWidth - 364, top: window.innerHeight - 350 });
  const [isDraggingQA, setIsDraggingQA] = useState(false);
  const qaOffset = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isQAMobileOpen, setIsQAMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return; // Ignore buttons
    setIsDraggingQA(true);
    const rect = quickActionsRef.current.getBoundingClientRect();
    qaOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingQA) return;
    let newX = e.clientX - qaOffset.current.x;
    let newY = e.clientY - qaOffset.current.y;
    setQaPos({ left: newX, top: newY });
  };

  const handlePointerUp = (e) => {
    if (!isDraggingQA) return;
    setIsDraggingQA(false);
    e.target.releasePointerCapture(e.pointerId);

    const rect = quickActionsRef.current.getBoundingClientRect();
    const ww = window.innerWidth;
    const wh = window.innerHeight;

    const distLeft = rect.left;
    const distRight = ww - rect.right;
    const distTop = rect.top;
    const distBottom = wh - rect.bottom;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let finalLeft = rect.left;
    let finalTop = rect.top;

    if (minDist === distLeft) {
      finalLeft = 24;
      finalTop = Math.max(24, Math.min(rect.top, wh - rect.height - 24));
    } else if (minDist === distRight) {
      finalLeft = ww - rect.width - 24;
      finalTop = Math.max(24, Math.min(rect.top, wh - rect.height - 24));
    } else if (minDist === distTop) {
      finalTop = 24;
      finalLeft = Math.max(24, Math.min(rect.left, ww - rect.width - 24));
    } else {
      finalTop = wh - rect.height - 24;
      finalLeft = Math.max(24, Math.min(rect.left, ww - rect.width - 24));
    }

    const finalPos = { left: finalLeft, top: finalTop };
    setQaPos(finalPos);
    updateSettingsAPI({ qaPos: finalPos });
  };

  useEffect(() => {
    const handleResize = () => {
      setQaPos(prev => {
        if (!quickActionsRef.current) return prev;
        const rect = quickActionsRef.current.getBoundingClientRect();
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        let newLeft = Math.max(24, Math.min(prev.left, ww - rect.width - 24));
        let newTop = Math.max(24, Math.min(prev.top, wh - rect.height - 24));
        if (newLeft !== prev.left || newTop !== prev.top) {
          const newPos = { left: newLeft, top: newTop };
          updateSettingsAPI({ qaPos: newPos });
          return newPos;
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const p = res.data;
      if (p.bank_saving) setBankSaving(p.bank_saving);
      if (p.monthly_budgets) setMonthlyBudgets(p.monthly_budgets);
      if (p.budget_settings) setBudgetSettings(p.budget_settings);
      if (p.user_goal) setUserGoal(p.user_goal);
      if (p.qa_pos) setQaPos(p.qa_pos);
      if (p.investment_income != null) setInvestmentIncome(Number(p.investment_income));
      if (p.custom_normal_saving != null) setCustomNormalSaving(Number(p.custom_normal_saving));
      if (p.custom_bank_saving_total != null) setCustomBankSavingTotal(Number(p.custom_bank_saving_total));
      if (res.data.is_goal_initialized) {
        setIsGoalInitialized(true);
        setGoalForm({
          salary: res.data.salary || '15000000',
          age: res.data.age || '25',
          gender: res.data.gender || 'Nam'
        });
      }
    } catch (error) { console.error(error); }
  };

  const handleUpgrade = async (targetPlan) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/upgrade-plan', { targetPlan }, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      
      const updatedUser = { ...user, plan: targetPlan };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      fetchProfile();
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi nâng cấp');
    }
  };

  const saveGoalInit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/init-goal', goalForm, { headers: { Authorization: `Bearer ${token}` } });
      setIsGoalInitialized(true);
    } catch (error) {
      alert('Lỗi lưu thông tin mục tiêu');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    
    if ((profileData?.coin || 0) < 100) {
      alert("Bạn không đủ 100 coin để thêm danh mục mới. Hãy điểm danh hằng ngày để nhận thêm coin!");
      return;
    }

    const updatedCategories = [...(profileData.custom_categories || []), newCategory];
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/update-categories', { categories: updatedCategories, isAdding: true }, { headers: { Authorization: `Bearer ${token}` } });
      setProfileData({ ...profileData, custom_categories: updatedCategories, coin: profileData.coin - 100 });
      setNewCategory({ name: '', type: 'EXPENSE', color: 'var(--color-primary-ink)' });
      setIsAddingCategory(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi thêm danh mục');
    }
  };

  const handleDeleteCategory = async (catToDelete) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá danh mục "${catToDelete.name}"?`)) return;
    
    const updatedCategories = (profileData.custom_categories || []).filter(c => !(c.name === catToDelete.name && c.type === catToDelete.type));
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/update-categories', { categories: updatedCategories }, { headers: { Authorization: `Bearer ${token}` } });
      setProfileData({ ...profileData, custom_categories: updatedCategories });
    } catch (error) {
      alert('Lỗi xoá danh mục');
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProfile();
  }, []);

  // Fetch business data khi chuyển sang tab doanh nghiệp
  useEffect(() => {
    if (activeTab === 'business' && bizData === null) {
      setBizLoading(true);
      fetch('/api/business/mine?t=' + Date.now(), { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
        .then(r => r.json())
        .then(d => { setBizData(d.business || false); })
        .catch(() => setBizData(false))
        .finally(() => setBizLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'business' || !bizData?.id) return;
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      axios.get(`/api/transactions/summary?scope=business&businessId=${bizData.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => { if (!cancelled) setBizSummary(res.data); })
        .catch(() => { if (!cancelled) setBizSummary(null); });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    const interval = setInterval(refresh, 5000);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', refresh); clearInterval(interval); };
  }, [activeTab, bizData?.id]);

  const handleAvatarUpload = (e, target = 'profile') => {
    setCropTarget(target);
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

  const compressBlob = (blob, maxSizeMB = 1) => {
    return new Promise((resolve) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        const compress = () => {
          canvas.toBlob((newBlob) => {
            if (newBlob.size <= maxSizeBytes || quality <= 0.3) resolve(newBlob);
            else { quality -= 0.15; compress(); }
          }, 'image/jpeg', quality);
        };
        compress();
      };
    });
  };

  const handleCropComplete = async () => {
    if (!croppedAreaPixels || !avatarImage) return;
    try {
      setLoading(true);
      let blob = await getCroppedImg(avatarImage, croppedAreaPixels);

      if (blob.size > 1024 * 1024) {
          blob = await compressBlob(blob, 1);
      }

      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      if (cropTarget === 'profile') {
        const formData = new FormData();
        formData.append('avatar', file);
        const token = localStorage.getItem('token');
        await axios.post('/api/users/update-avatar', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        fetchProfile(); 
      } else if (cropTarget === 'biz') {
        setBizAvatarFile(file);
        setBizAvatarPreview(URL.createObjectURL(file));
      } else if (cropTarget === 'emp') {
        setEmpAvatarFile(file);
        setEmpAvatarPreview(URL.createObjectURL(file));
      } else if (cropTarget === 'prod') {
        setProdAvatarFile(file);
        setProdAvatarPreview(URL.createObjectURL(file));
      }
      setIsCropModalOpen(false);
      setAvatarImage(null);
    } catch (error) {
      alert('Lỗi lưu ảnh');
    } finally { setLoading(false); }
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá giao dịch này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedDayInfo(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          incomes: prev.incomes.filter(t => t.id !== id),
          expenses: prev.expenses.filter(t => t.id !== id)
        };
      });
      fetchTransactions();
    } catch (error) {
      alert('Có lỗi xảy ra khi xoá giao dịch!');
    }
  };

  const handleEditTx = (t) => {
    setEditTxId(t.id);
    setType(t.type);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setDate(new Date(t.date).toISOString().substring(0, 10));
    setDescription(t.description || '');
    setPersonalPaymentMethod(t.payment_method || '');
    setIsModalOpen(true);
    setSelectedDayInfo(null);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editTxId) {
        await axios.put(`/api/transactions/${editTxId}`, {
          type, amount: parseInt(amount), category, date, description, ...((profileData?.separate_personal_wallets || (editTxId && personalPaymentMethod)) ? { paymentMethod: personalPaymentMethod } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/transactions', {
          type, amount: parseInt(amount), category, date, description, ...((profileData?.separate_personal_wallets || (editTxId && personalPaymentMethod)) ? { paymentMethod: personalPaymentMethod } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setPersonalPaymentMethod('');
      setEditTxId(null);
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu giao dịch!');
    } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatCompact = (amount) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
    return amount;
  };
  const currentMonthTx = transactions.filter(t => new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handlePrevDate = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
  };

  const handleNextDate = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
  };

  const handleCheckin = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/checkin', {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchProfile(); // update coins and streak
      alert(res.data.message);
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi điểm danh');
    } finally {
      setLoading(false);
    }
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
      const dayTx = currentMonthTx.filter(t => t?.date && new Date(t.date).getDate() === i);
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
    return colors[cat] || 'var(--color-primary)';
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
      const day = t?.date ? new Date(t.date).getDate() : 0;
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
    ? (profileData.avatar_url.startsWith('http') ? profileData.avatar_url : `/api${profileData.avatar_url}?t=${Date.now()}`) 
    : null;

  // Calculate Data for Reports and Budget Tabs
  
  const uniqueCategories = [...new Set(currentMonthTx.filter(t => t.type === 'EXPENSE').map(t => t.category))];
  const dynamicBudgets = {};
  if (uniqueCategories.length > 0) {
    const avgBudget = Math.floor(monthlyBudget / uniqueCategories.length);
    uniqueCategories.forEach(c => dynamicBudgets[c] = avgBudget);
  } else {
    ['Ăn uống', 'Shopping', 'Di chuyển', 'Giải trí', 'Khác'].forEach(c => dynamicBudgets[c] = monthlyBudget / 5);
  }

  const budgetHistory = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const txInMonth = transactions.filter(t => new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y);
    const spent = txInMonth.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
    const b = getBudgetForMonth(m + 1, y);
    
    let stat = 'Không có DL';
    let c = '#9CA3AF';
    let bg = '#F3F4F6';
    if (b !== null) {
      stat = i === 0 ? 'Đang diễn ra' : (spent > b ? 'Vượt ngân sách' : 'Hoàn thành');
      c = i === 0 ? 'var(--color-primary)' : (spent > b ? '#E11D48' : '#16A34A');
      bg = i === 0 ? '#F5F3FF' : (spent > b ? '#FFE4E6' : '#DCFCE7');
    }
    
    budgetHistory.push({ m: m + 1, y, b, s: spent, stat, c, bg, isCurrent: i === 0 });
  }

  const yearBudgetData = Array.from({length: 12}, (_, i) => {
    const txInMonth = transactions.filter(t => new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === currentYear);
    const spent = txInMonth.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
    const mb = getBudgetForMonth(i + 1, currentYear);
    return { name: `Th${i + 1}`, budget: (mb || 0) / 1000000, spent: spent / 1000000 };
  });

  const dailyExpenseData = [];
  for (let i = 1; i <= new Date(currentYear, currentMonth + 1, 0).getDate(); i+= 5) {
    const tx = currentMonthTx.filter(t => t.type === 'EXPENSE' && new Date(t.date).getDate() >= i && new Date(t.date).getDate() < i+5);
    const amount = tx.reduce((sum, t) => sum + parseInt(t.amount), 0);
    dailyExpenseData.push({ date: `${i}/${currentMonth + 1}`, amount: amount / 1000 });
  }

  const incomeVsExpenseData = [...budgetHistory].reverse().map(bh => {
    const txInMonth = transactions.filter(t => new Date(t.date).getMonth() === (bh.m - 1) && new Date(t.date).getFullYear() === bh.y);
    const income = txInMonth.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
    return { month: `Th${bh.m}`, income: income / 1000000, expense: bh.s / 1000000 };
  });

  const cumulativeData = dailyExpenseData.map((d, i) => {
    const dayEnd = (i * 5) + 5;
    const tx = currentMonthTx.filter(t => new Date(t.date).getDate() <= dayEnd);
    const inc = tx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseInt(t.amount), 0);
    const exp = tx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
    return { date: d.date, balance: (inc - exp) / 1000000 };
  });

  const weekdayData = [
    { day: 'CN', val: 0 }, { day: 'T2', val: 0 }, { day: 'T3', val: 0 }, 
    { day: 'T4', val: 0 }, { day: 'T5', val: 0 }, { day: 'T6', val: 0 }, { day: 'T7', val: 0 }
  ];
  currentMonthTx.filter(t => t.type === 'EXPENSE').forEach(t => {
    const w = new Date(t.date).getDay();
    weekdayData[w].val += parseInt(t.amount) / 1000;
  });
  const shiftedWeekdayData = [...weekdayData.slice(1), weekdayData[0]];

  const fixedCategories = ['Nhà ở', 'Hóa đơn', 'Tiền điện', 'Tiền nước', 'Học phí'];
  let fixedAmt = 0;
  let flexAmt = 0;
  currentMonthTx.filter(t => t.type === 'EXPENSE').forEach(t => {
    if (fixedCategories.some(c => t.category.toLowerCase().includes(c.toLowerCase()))) {
      fixedAmt += parseInt(t.amount);
    } else {
      flexAmt += parseInt(t.amount);
    }
  });
  if (fixedAmt === 0 && flexAmt === 0) flexAmt = 1;

  const lastMonthTx = transactions.filter(t => new Date(t.date).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(t.date).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear));
  const lastMonthExpense = lastMonthTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseInt(t.amount), 0);
  const pctChange = lastMonthExpense ? ((totalExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(1) : 0;
  const isGoodTrend = totalExpense <= lastMonthExpense;

  const avg3Months = budgetHistory.slice(1, 4).reduce((sum, h) => sum + h.s, 0) / 3 || 0;
  const projectedEndMonth = (totalExpense / new Date().getDate()) * new Date(currentYear, currentMonth + 1, 0).getDate() || 0;
  
  const topCategories = Object.keys(expensesByCategory)
    .map(name => ({ name, val: expensesByCategory[name] }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);
  if (topCategories.length === 0) topCategories.push({ name: 'Chưa có', val: 0 });

  const heatmapData = Array.from({length: 40}).map((_, i) => {
    const d = new Date(currentYear, currentMonth, i - 5);
    if (d > new Date() || d.getMonth() !== currentMonth) return 0;
    const tx = currentMonthTx.filter(t => new Date(t.date).getDate() === d.getDate() && t.type === 'EXPENSE');
    const amt = tx.reduce((sum, t) => sum + parseInt(t.amount), 0);
    if (amt === 0) return 0;
    if (amt < 100000) return 1;
    if (amt < 300000) return 2;
    if (amt < 1000000) return 3;
    return 4;
  });

  const renderSidebarBadge = (plan) => {
    if (plan === 'ultra') return <div className="pro-badge" style={{background: '#EDE9FE', color: 'var(--color-primary-ink)', borderColor: '#DDD6FE'}}>💎 Ultra</div>;
    if (plan === 'plus') return <div className="pro-badge">⭐ Plus</div>;
    return <div className="pro-badge" style={{background: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB'}}>Normal</div>;
  };
  const chartData = [];
  for (let i = 1; i <= new Date(currentYear, currentMonth + 1, 0).getDate(); i+= 5) {
    const incTx = currentMonthTx.filter(t => t.type === 'INCOME' && new Date(t.date).getDate() >= i && new Date(t.date).getDate() < i+5);
    const expTx = currentMonthTx.filter(t => t.type === 'EXPENSE' && new Date(t.date).getDate() >= i && new Date(t.date).getDate() < i+5);
    chartData.push({ 
      date: `${i}/${currentMonth + 1}`, 
      income: incTx.reduce((sum, t) => sum + parseInt(t.amount), 0),
      expense: expTx.reduce((sum, t) => sum + parseInt(t.amount), 0)
    });
  }


  return (
    <div className="layout">
      {/* Sidebar Overlay for mobile */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-text" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <img src={mascotAsset('wallet_logo')} alt="Logo" style={{height: '32px'}} />
            Peacee1
          </div>
          {renderSidebarBadge(user.plan)}
        </div>
        
        <ul className="nav-menu">
          <li className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}><LayoutDashboard size={20}/> Tổng quan</li>
          <li className="nav-item" onClick={() => { setIsCheckinOpen(true); setIsSidebarOpen(false); }} style={{ background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.1), rgba(244,114,182,0.1))', color: 'var(--color-primary-ink)', fontWeight: 'bold', borderLeft: '4px solid var(--color-primary)' }}>
            <Gift size={20} color="#F472B6" /> Điểm danh nhận quà
          </li>
          <li className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}><CircleDollarSign size={20}/> Thu chi</li>
          <li className={`nav-item ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); setIsSidebarOpen(false); }}><WalletCards size={20}/> Ngân sách</li>
          <li className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}><PieChartIcon size={20}/> Báo cáo</li>
          <li className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => { setActiveTab('goals'); setIsSidebarOpen(false); }}><Target size={20}/> Mục tiêu</li>
          <li className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}><Tags size={20}/> Danh mục</li>
          <li className="nav-item" onClick={() => { setIsProfileOpen(true); setIsSidebarOpen(false); }}><User size={20}/> Tài khoản</li>
          <li className={`nav-item ${activeTab === 'personalization' ? 'active' : ''}`} onClick={() => { setActiveTab('personalization'); setIsSidebarOpen(false); }}><Palette size={20}/> Cá nhân hóa</li>
          <li className={`nav-item ${activeTab === 'business' ? 'active' : ''}`} onClick={() => { setActiveTab('business'); setIsSidebarOpen(false); }}><Building2 size={20}/> Doanh nghiệp</li>
          <li className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}><Settings size={20}/> Cài đặt</li>
        </ul>

        <div className="promo-card">
          <img src={mascotAsset('cat_mascot')} alt="Cat" className="promo-img" style={{width: 80}}/>
          <h4 style={{fontSize: '1rem'}}>Cùng kiểm soát chi tiêu tốt hơn!</h4>
          <p>Nâng cấp để mở khóa thêm nhiều tính năng</p>
          <button className="btn-promo" onClick={() => setIsProfileOpen(true)}>Nâng cấp Pro</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} color="var(--color-text)" />
            </button>
            <div>
              <h1>Xin chào, {user.name.split(' ')[0]}! 👋</h1>
              <p>Cùng quản lý tài chính để đạt được mục tiêu của bạn</p>
            </div>
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
                <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{user.name.charAt(0)}</div>
              )}
              <span>{user.name.split(' ')[user.name.split(' ').length - 1]}</span>
              <ChevronRight size={16} style={{transform: 'rotate(90deg)'}}/>
              
              {isDropdownOpen && (
                <div className="avatar-dropdown" style={{top: 50}}>
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setIsProfileOpen(true); setIsDropdownOpen(false); }}>👤 Hồ sơ</div>
                  <div className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); handleLogout(); }}>🚪 Đăng xuất</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="dashboard-scroll">
            {profileData?.separate_personal_wallets && <PersonalWalletSummary transactions={currentMonthTx} formatCurrency={formatCurrency} />}
          {/* AI Advisor Banner */}
          {(() => {
            const isPro = user.plan === 'plus' || user.plan === 'ultra';
            return (
              <div
                onClick={isPro ? handleAiAnalyze : () => setIsProfileOpen(true)}
                style={{
                  margin: '0 20px 16px',
                  padding: '0',
                  borderRadius: '20px',
                  background: isPro
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, #F472B6 100%)'
                    : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: isPro ? '0 4px 20px rgba(var(--color-primary-rgb), 0.35)' : '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  overflow: 'hidden',
                  minHeight: '90px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                {/* Cat mascot */}
                <img
                  src={mascotAsset('cat_ai_mascot')}
                  alt="AI Cat"
                  style={{ width: 90, height: 90, objectFit: 'contain', flexShrink: 0, marginLeft: '8px' }}
                />
                <div style={{ flex: 1, padding: '16px 12px' }}>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'white', marginBottom: '4px' }}>
                    {isPro ? '✨ Trợ lý AI Tài chính' : '🔒 Trợ lý AI Tài chính'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                    {isPro ? 'Nhận gợi ý cá nhân hóa từ Peacee1 AI' : 'Tính năng dành riêng cho tài khoản Pro. Bấm để nâng cấp!'}
                  </div>
                  {!isPro && (
                    <div style={{ marginTop: '8px', display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', color: 'white', fontWeight: '700' }}>
                      ⭐ Nâng cấp Pro
                    </div>
                  )}
                </div>
                <div style={{ color: 'white', fontSize: '1.5rem', opacity: 0.9, paddingRight: '20px' }}>→</div>
              </div>
            );
          })()}

          {/* Top Stat Cards */}
          <div className="cards-row">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(var(--color-primary-rgb), 0.1)'}}>
                  <WalletCards color="var(--color-primary-ink)" size={24}/>
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

            <div className="stat-card" style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => setActiveTab('budget')} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)'}} onMouseLeave={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'}}>
              <div className="stat-header">
                <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)'}}>
                  <Target color="#F59E0B" size={24}/>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setBudgetInputValue(((monthlyBudget || 10000000) / 1000000).toString()); setIsEditBudgetOpen(true); }} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', color: 'var(--color-primary-ink)', fontWeight: '600', cursor: 'pointer', zIndex: 2 }}>
                  ✏️ Sửa
                </button>
              </div>
              <div className="stat-content">
                <div className="stat-title">Còn lại trong ngân sách</div>
                <h3 className="stat-amount" style={{color: totalExpense > monthlyBudget ? 'var(--color-expense)' : 'inherit'}}>
                  {totalExpense > monthlyBudget ? `-${formatCurrency(totalExpense - monthlyBudget)}` : formatCurrency(monthlyBudget - totalExpense)}
                </h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px'}}>
                  <div className="progress-container" style={{flex: 1, marginTop: 0}}>
                    <div className="progress-bar" style={{background: totalExpense > monthlyBudget ? 'var(--color-expense)' : 'var(--color-primary)', width: `${Math.min((totalExpense / monthlyBudget) * 100, 100)}%`}}></div>
                  </div>
                  <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: (monthlyBudget && totalExpense > monthlyBudget) ? 'var(--color-expense)' : 'inherit'}}>{monthlyBudget ? Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100) : 0}%</span>
                </div>
                <div style={{fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '4px'}}>
                  Giới hạn: {monthlyBudget ? monthlyBudget.toLocaleString('vi-VN') + ' đ / tháng' : 'Chưa thiết lập'}
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
                  <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                    <div className="date-selector" style={{padding: '0.4rem 0.8rem', background: 'var(--color-bg)'}}>
                      <button className="btn-icon" onClick={handlePrevDate}><ChevronLeft size={16}/></button>
                      <span style={{fontSize: '0.8rem', cursor: 'pointer'}} onClick={handleToday}>
                        {currentDate.toDateString() === new Date().toDateString() ? 'Hôm nay' : currentDate.toLocaleDateString('vi-VN')}
                      </span>
                      <button className="btn-icon" onClick={handleNextDate}><ChevronRight size={16}/></button>
                    </div>
                    <div style={{display: 'flex', background: 'var(--color-bg)', padding: '4px', borderRadius: '8px', gap: '4px'}}>
                      <div style={{padding: '4px 12px', background: 'var(--color-card)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: 'var(--color-text)'}}>Tháng</div>
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
                         style={{ position: 'relative', cursor: day.muted ? 'not-allowed' : 'pointer', border: isSelectedDate ? '2px solid var(--color-primary)' : '' }}>
                      <div className="cal-date" style={{background: isSelectedDate ? 'var(--color-primary)' : '', color: isSelectedDate ? 'var(--color-on-primary)' : ''}}>{day.date}</div>
                      {(() => {
                        const allTxs = [...day.incomes, ...day.expenses];
                        return (
                          <>
                            {allTxs.slice(0, 4).map((t, j) => (
                              <div key={j} className={`tx-badge ${t.type.toLowerCase()}`}>
                                <div className={`tx-dot ${t.type.toLowerCase()}`}></div> {t.type === 'INCOME' ? '+' : '-'}{formatCompact(t.amount)}
                              </div>
                            ))}
                            {allTxs.length > 4 && (
                              <div style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-primary-ink)', background: '#F3E8FF', padding: '2px 5px', borderRadius: '8px' }}>
                                +{allTxs.length - 4}
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                          <p>{t.description || (t.type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu')}</p>{profileData?.separate_personal_wallets && <small>{t.payment_method === 'CASH' ? 'Tiền mặt' : t.payment_method === 'TRANSFER' ? 'Tiền tài khoản' : 'Chưa phân loại'}</small>}
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '40px'}}>
                        <div className="tx-date">{new Date(t.date).toLocaleDateString('vi-VN')}</div>
                        <div className="tx-amount" style={{color: t.type === 'INCOME' ? 'var(--color-income)' : 'var(--color-expense)'}}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                        </div>
                        <div style={{position: 'relative'}}>
                          <MoreVertical size={16} color="var(--color-text-secondary)" style={{cursor: 'pointer'}} onClick={() => setOpenTxMenu(openTxMenu === t.id ? null : t.id)}/>
                          {openTxMenu === t.id && (
                            <div style={{position: 'absolute', right: 0, top: '100%', background: 'var(--color-card)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '5px', zIndex: 100, display: 'flex', flexDirection: 'column', minWidth: '120px'}}>
                              <button onClick={() => { handleEditTx(t); setOpenTxMenu(null); }} className="hover-bg-gray" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', width: '100%', textAlign: 'left', borderRadius: '4px', color: 'var(--color-text)'}}>
                                <Edit2 size={14} /> Sửa
                              </button>
                              <button onClick={() => { handleDeleteTx(t.id); setOpenTxMenu(null); }} className="hover-bg-red" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: '#EF4444', width: '100%', textAlign: 'left', borderRadius: '4px'}}>
                                <Trash2 size={14} /> Xóa
                              </button>
                            </div>
                          )}
                        </div>
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
                  <h3 className="widget-title">Giới hạn chi tiêu tháng</h3>
                  <button onClick={() => { setBudgetInputValue(((monthlyBudget || 10000000) / 1000000).toString()); setIsEditBudgetOpen(true); }} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.78rem', color: 'var(--color-primary-ink)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✏️ Sửa
                  </button>
                </div>
                <div style={{display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px'}}>
                  <div className="stat-icon" style={{background: '#FFFBEB'}}>
                    <WalletCards color="#D97706" size={20}/>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: 'var(--color-text-secondary)'}}>Đã chi / Giới hạn</div>
                    <div style={{fontSize: '1.2rem', fontWeight: '800'}}>{totalExpense.toLocaleString('vi-VN')} đ <span style={{color: 'var(--color-text-secondary)', fontWeight: '400', fontSize: '0.9rem'}}>/ {monthlyBudget ? monthlyBudget.toLocaleString('vi-VN') + ' đ' : 'Chưa thiết lập'}</span></div>
                  </div>
                </div>
                <div className="progress-container" style={{height: 10}}>
                  <div className="progress-bar" style={{background: (monthlyBudget && totalExpense > monthlyBudget) ? 'var(--color-expense)' : 'var(--color-primary)', width: `${monthlyBudget ? Math.min((totalExpense / monthlyBudget) * 100, 100) : 0}%`}}></div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '5px', color: 'var(--color-text-secondary)'}}>
                  <span>Đã chi {formatCompact(totalExpense)}</span>
                  <span style={{color: monthlyBudget === null ? 'var(--color-text-secondary)' : (totalExpense > monthlyBudget ? 'var(--color-expense)' : 'inherit')}}>
                    {monthlyBudget === null ? 'Chưa thiết lập' : (totalExpense > monthlyBudget ? `Vượt ${formatCompact(totalExpense - monthlyBudget)}` : `Còn lại ${formatCompact(monthlyBudget - totalExpense)}`)}
                  </span>
                </div>
              </div>

              {/* Quick Actions Mobile FAB */}
              {isMobile && !isQAMobileOpen && (
                <button 
                  onClick={() => setIsQAMobileOpen(true)}
                  style={{ position: 'fixed', bottom: 20, right: 20, width: 56, height: 56, borderRadius: '28px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={24} />
                </button>
              )}
              
              {isMobile && isQAMobileOpen && (
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} 
                  onClick={() => setIsQAMobileOpen(false)}
                ></div>
              )}

              {/* Quick Actions Panel */}
              <div 
                ref={quickActionsRef}
                className="widget quick-actions-widget" 
                style={isMobile ? {
                  position: 'fixed',
                  bottom: isQAMobileOpen ? 0 : -400,
                  left: 0,
                  width: '100%',
                  zIndex: 1001,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                  background: 'var(--color-card)',
                  borderRadius: '24px 24px 0 0',
                  transition: 'bottom 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'block'
                } : {
                  position: 'fixed', 
                  ...qaPos, 
                  width: '340px', 
                  zIndex: 1000, 
                  boxShadow: isDraggingQA ? '0 20px 40px rgba(0,0,0,0.2)' : '0 12px 36px rgba(0,0,0,0.12)', 
                  border: '1px solid rgba(var(--color-primary-rgb), 0.1)',
                  background: 'var(--color-card)',
                  cursor: isDraggingQA ? 'grabbing' : 'grab',
                  transition: isDraggingQA ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  touchAction: 'none' // Prevent scrolling while dragging on mobile
                }}
                onPointerDown={isMobile ? undefined : handlePointerDown}
                onPointerMove={isMobile ? undefined : handlePointerMove}
                onPointerUp={isMobile ? undefined : handlePointerUp}
                onPointerCancel={isMobile ? undefined : handlePointerUp}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="widget-title" style={{ margin: 0, pointerEvents: 'none' }}>Thao tác nhanh</h3>
                  <div 
                    style={{ color: 'var(--color-text-secondary)', opacity: 0.5, cursor: isMobile ? 'pointer' : 'default', pointerEvents: isMobile ? 'auto' : 'none' }}
                    onClick={isMobile ? () => setIsQAMobileOpen(false) : undefined}
                  >
                    {isMobile ? <Minus size={20} /> : <MoreHorizontal size={20} />}
                  </div>
                </div>
                <div className="quick-actions grid-responsive-1-1" style={{gap: '10px'}}>
                  <button className="btn-quick" style={{background: 'rgba(5,150,105,0.12)', color: 'var(--color-income)', padding: '12px 8px'}} onClick={() => {setType('INCOME'); setPersonalPaymentMethod(''); setIsModalOpen(true);}}>
                    <Plus size={16}/> Thêm khoản thu
                  </button>
                  <button className="btn-quick" style={{background: 'rgba(225,29,72,0.1)', color: 'var(--color-expense)', padding: '12px 8px'}} onClick={() => {setType('EXPENSE'); setPersonalPaymentMethod(''); setIsModalOpen(true);}}>
                    <Minus size={16}/> Thêm khoản chi
                  </button>
                  <button className="btn-quick" style={{background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary-ink)', padding: '12px 8px'}}>
                    <WalletCards size={16}/> Lập ngân sách
                  </button>
                  <button className="btn-quick" style={{background: 'rgba(37,99,235,0.1)', color: '#60A5FA', padding: '12px 8px'}}>
                    <FileDown size={16}/> Xuất báo cáo
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
        )}

        {activeTab === 'transactions' && (
          <div className="dashboard-scroll" style={{ padding: '20px' }}>
            <div className="widget" style={{ padding: '30px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Lịch sử thu chi</h2>
                <button className="btn-primary" onClick={() => { setPersonalPaymentMethod(''); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', width: 'auto' }}>
                  <Plus size={18} /> Thêm giao dịch
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: 'var(--color-text-secondary)' }}>
                    Chưa có giao dịch nào
                  </div>
                ) : (
                  [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, idx) => (
                    <div key={t.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderRadius: '16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: `${getCategoryColor(t.category)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getCategoryIcon(t.category, getCategoryColor(t.category))}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text)', marginBottom: '4px' }}>{t.category}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{new Date(t.date).toLocaleDateString('vi-VN')}</span>
                            {profileData?.separate_personal_wallets && <small>{t.payment_method === 'CASH' ? 'Tiền mặt' : t.payment_method === 'TRANSFER' ? 'Tiền tài khoản' : 'Chưa phân loại'}</small>}
                            {t.description && (
                              <>
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-text-secondary)' }}></span>
                                <span>{t.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: t.type === 'INCOME' ? 'var(--color-income)' : 'var(--color-expense)' }}>
                          {t.type === 'INCOME' ? '+' : '-'}{parseInt(t.amount).toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{position: 'relative'}}>
                          <MoreVertical size={16} color="var(--color-text-secondary)" style={{cursor: 'pointer'}} onClick={() => setOpenTxMenu(openTxMenu === t.id ? null : t.id)}/>
                          {openTxMenu === t.id && (
                            <div style={{position: 'absolute', right: 0, top: '100%', background: 'var(--color-card)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '5px', zIndex: 100, display: 'flex', flexDirection: 'column', minWidth: '120px'}}>
                              <button onClick={() => { handleEditTx(t); setOpenTxMenu(null); }} className="hover-bg-gray" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', width: '100%', textAlign: 'left', borderRadius: '4px', color: 'var(--color-text)'}}>
                                <Edit2 size={14} /> Sửa
                              </button>
                              <button onClick={() => { handleDeleteTx(t.id); setOpenTxMenu(null); }} className="hover-bg-red" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: '#EF4444', width: '100%', textAlign: 'left', borderRadius: '4px'}}>
                                <Trash2 size={14} /> Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '5px' }}>Ngân sách</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Lập kế hoạch chi tiêu và kiểm soát ngân sách theo tháng, theo năm</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none' }}>
              <button style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}><ChevronLeft size={16}/></button>
              <button style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', fontWeight: 'bold' }}>{currentYear}</button>
              <button style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}><ChevronRight size={16}/></button>
              
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <button key={m} style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: 'none',
                  background: m === currentMonth + 1 ? 'var(--color-primary)' : 'var(--color-card)',
                  color: m === currentMonth + 1 ? 'white' : 'var(--color-text)',
                  fontWeight: m === currentMonth + 1 ? 'bold' : 'normal',
                  minWidth: '60px'
                }}>
                  Th{m}
                </button>
              ))}
            </div>

            {/* Top row cards */}
            <div className="grid-responsive-3" style={{ gap: '20px', marginBottom: '20px' }}>
              
              {/* Card 1: Budget remaining */}
              <div className="widget" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)'}}>
                    <Target color="#F59E0B" size={24}/>
                  </div>
                  <button onClick={() => { setBudgetInputValue(((monthlyBudget || 10000000) / 1000000).toString()); setIsEditBudgetOpen(true); }} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', color: 'var(--color-primary-ink)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✏️ Sửa
                  </button>
                </div>
                <div className="stat-title">Còn lại trong ngân sách</div>
                <h3 className="stat-amount" style={{color: (monthlyBudget && totalExpense > monthlyBudget) ? 'var(--color-expense)' : 'inherit', fontSize: '1.8rem', marginTop: '5px'}}>
                  {monthlyBudget === null ? 'Chưa có DL' : (totalExpense > monthlyBudget ? `-${formatCurrency(totalExpense - monthlyBudget)}` : formatCurrency(monthlyBudget - totalExpense))}
                </h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px'}}>
                  <div className="progress-container" style={{flex: 1, marginTop: 0, height: 8}}>
                    <div className="progress-bar" style={{background: (monthlyBudget && totalExpense > monthlyBudget) ? 'var(--color-expense)' : 'var(--color-primary)', width: `${monthlyBudget ? Math.min((totalExpense / monthlyBudget) * 100, 100) : 0}%`}}></div>
                  </div>
                  <span style={{fontSize: '0.9rem', fontWeight: 'bold', color: (monthlyBudget && totalExpense > monthlyBudget) ? 'var(--color-expense)' : 'inherit'}}>{monthlyBudget ? Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100) : 0}%</span>
                </div>
                <div style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '10px'}}>
                  Giới hạn: {monthlyBudget ? monthlyBudget.toLocaleString('vi-VN') + ' đ / tháng' : 'Chưa có dữ liệu'}
                </div>
              </div>

              {/* Card 2: Donut chart */}
              <div className="widget" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Tổng chi tiêu theo danh mục</h3>
                  <div style={{fontSize: '0.8rem', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '6px', color: 'var(--color-text-secondary)'}}>Tháng này ⌄</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: 140, height: 140, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                      <span style={{fontSize: '0.7rem', color: 'var(--color-text-secondary)'}}>Đã chi</span>
                      <span style={{fontWeight: 'bold', fontSize: '0.9rem'}}>{formatCompact(totalExpense)}</span>
                      <span style={{fontSize: '0.65rem', color: 'var(--color-text-secondary)'}}>/ {monthlyBudget ? formatCompact(monthlyBudget) : '---'}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, marginLeft: '20px' }}>
                    {pieData.map((item, i) => (
                      <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '10px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <div style={{width: 10, height: 10, borderRadius: '50%', background: getCategoryColor(item.name)}}></div>
                          <span>{item.name}</span>
                        </div>
                        <div style={{fontWeight: '600'}}>{formatCurrency(item.value)}</div>
                        <div style={{color: 'var(--color-text-secondary)', width: '30px', textAlign: 'right'}}>{totalExpense > 0 ? Math.round((item.value/totalExpense)*100) : 0}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Promo */}
              <div className="widget" style={{ background: 'linear-gradient(135deg, var(--promo-bg-1) 0%, var(--promo-bg-2) 100%)', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px' }}>
                <img src={mascotAsset('cat_budget_mascot')} alt="Mascot" style={{ width: 100, marginBottom: '15px' }} />
                <h3 style={{ fontSize: '1rem', color: '#4C1D95', marginBottom: '8px' }}>Bạn còn <span style={{fontSize: '1.2rem', fontWeight: '800'}}>{monthlyBudget ? formatCurrency(Math.max(monthlyBudget - totalExpense, 0)) : '---'}</span></h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-hover)' }}>trong ngân sách tháng này. Cố lên nhé! 💪</p>
              </div>

            </div>

            {/* Middle row */}
            <div className="grid-responsive-2-1" style={{gap: '20px', marginBottom: '20px'}}>
              
              {/* Budget by category */}
              <div className="widget">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Ngân sách theo danh mục</h3>
                  <button className="btn-primary" onClick={() => setIsAddingCategory(true)} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto' }}><Plus size={14}/> Thêm danh mục</button>
                </div>
                <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                  <div style={{ minWidth: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 20px', gap: '10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)', marginBottom: '15px' }}>
                  <div>Danh mục</div>
                  <div style={{textAlign: 'right'}}>Ngân sách</div>
                  <div style={{textAlign: 'right'}}>Đã chi</div>
                  <div style={{textAlign: 'right'}}>Còn lại</div>
                  <div>Tiến độ</div>
                  <div></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {(uniqueCategories.length > 0 ? uniqueCategories : ['Ăn uống', 'Shopping', 'Di chuyển', 'Giải trí', 'Khác']).map((cat, idx) => {
                    const spent = currentMonthTx.filter(t => t.type==='EXPENSE' && t.category===cat).reduce((s, t)=>s+parseInt(t.amount), 0);
                    const b = dynamicBudgets[cat] || ((monthlyBudget || 10000000) / 5);
                    const remain = b - spent;
                    const pct = Math.min((spent/b)*100, 100);
                    
                    return (
                      <div key={cat} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 20px', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{width: 32, height: 32, borderRadius: '8px', background: `${getCategoryColor(cat)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {getCategoryIcon(cat, getCategoryColor(cat))}
                          </div>
                          <span style={{fontWeight: '600'}}>{cat}</span>
                        </div>
                        <div style={{textAlign: 'right'}}>{formatCurrency(b)}</div>
                        <div style={{textAlign: 'right'}}>{formatCurrency(spent)}</div>
                        <div style={{textAlign: 'right', color: remain >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}}>{formatCurrency(Math.abs(remain))}</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <div style={{flex: 1, height: 6, background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden'}}>
                            <div style={{width: `${pct}%`, height: '100%', background: getCategoryColor(cat), borderRadius: '3px'}}></div>
                          </div>
                          <span style={{fontSize: '0.75rem', color: 'var(--color-text-secondary)', width: '30px'}}>{Math.round(pct)}%</span>
                        </div>
                        <div style={{cursor: 'pointer', color: 'var(--color-text-secondary)'}}><MoreVertical size={16}/></div>
                      </div>
                    )
                  })}
                  </div>
                </div>
              </div>
            </div>
              {/* Quick budgets */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Ngân sách nhanh</h3>
                
                {profileData?.plan === 'normal' || !profileData?.plan ? (
                  <div style={{ position: 'relative' }}>
                    <div className="grid-responsive-1-1" style={{gap: '15px', filter: 'blur(4px)', opacity: 0.5, pointerEvents: 'none'}}>
                      <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, background: '#DCFCE7', color: '#16A34A', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌱</div>
                        <div>
                          <div style={{ fontWeight: '700' }}>Tiết kiệm</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Ưu tiên tiết kiệm 50% thu nhập</div>
                        </div>
                      </div>
                      <div style={{ padding: '20px 15px', background: 'rgba(var(--color-primary-rgb), 0.1)', borderRadius: '16px', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--color-card)', color: 'var(--color-primary-ink)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚖️</div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--color-primary-hover)' }}>Cân bằng</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-ink)' }}>Chi tiêu hợp lý và tiết kiệm</div>
                        </div>
                      </div>
                      <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, background: '#FEF3C7', color: '#D97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</div>
                        <div>
                          <div style={{ fontWeight: '700' }}>Thoải mái</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Chi tiêu linh hoạt vẫn kiểm soát</div>
                        </div>
                      </div>
                      <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, background: '#DBEAFE', color: '#2563EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</div>
                        <div>
                          <div style={{ fontWeight: '700' }}>Tùy chỉnh</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tạo ngân sách theo nhu cầu</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', padding: '0 20px', zIndex: 10 }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '12px', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Crown size={14} /> PRO
                        </div>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#111827' }}>Tính năng Cao cấp</h4>
                        <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Nâng cấp gói Plus hoặc Ultra để mở khoá</p>
                        <button className="btn-primary" onClick={() => setIsProfileOpen(true)} style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '20px' }}>Nâng cấp ngay</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid-responsive-1-1" style={{gap: '15px'}}>
                    <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, background: '#DCFCE7', color: '#16A34A', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌱</div>
                      <div>
                        <div style={{ fontWeight: '700' }}>Tiết kiệm</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Ưu tiên tiết kiệm 50% thu nhập</div>
                      </div>
                    </div>
                    <div style={{ padding: '20px 15px', background: 'rgba(var(--color-primary-rgb), 0.1)', borderRadius: '16px', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, background: 'var(--color-card)', color: 'var(--color-primary-ink)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚖️</div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--color-primary-hover)' }}>Cân bằng</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-ink)' }}>Chi tiêu hợp lý và tiết kiệm</div>
                      </div>
                    </div>
                    <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, background: '#FEF3C7', color: '#D97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</div>
                      <div>
                        <div style={{ fontWeight: '700' }}>Thoải mái</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Chi tiêu linh hoạt vẫn kiểm soát</div>
                      </div>
                    </div>
                    <div style={{ padding: '20px 15px', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, background: '#DBEAFE', color: '#2563EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</div>
                      <div>
                        <div style={{ fontWeight: '700' }}>Tùy chỉnh</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tạo ngân sách theo nhu cầu</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom row */}
            <div className="grid-responsive-2-1" style={{gap: '20px'}}>
              
              {/* History */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>Lịch sử ngân sách</h3>
                <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                  <div style={{ minWidth: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr 30px', gap: '10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)', marginBottom: '15px' }}>
                      <div>Thời gian</div>
                      <div style={{textAlign: 'right'}}>Ngân sách</div>
                      <div style={{textAlign: 'right'}}>Đã chi</div>
                      <div style={{textAlign: 'right'}}>Còn lại</div>
                      <div style={{textAlign: 'center'}}>Trạng thái</div>
                      <div></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {budgetHistory.map((row, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr 30px', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
                          <div style={{fontWeight: '600'}}>Tháng {row.m}, {row.y}</div>
                          <div style={{textAlign: 'right'}}>{row.b !== null ? formatCurrency(row.b) : 'Chưa có DL'}</div>
                          <div style={{textAlign: 'right'}}>{formatCurrency(row.s)}</div>
                          <div style={{textAlign: 'right', color: row.b !== null ? (row.b - row.s >= 0 ? 'var(--color-income)' : 'var(--color-expense)') : 'inherit'}}>{row.b !== null ? formatCurrency(Math.abs(row.b - row.s)) : '-'}</div>
                          <div style={{display: 'flex', justifyContent: 'center'}}>
                            <span style={{background: row.bg, color: row.c, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap'}}>{row.stat}</span>
                          </div>
                          <div style={{textAlign: 'right', color: 'var(--color-text-secondary)'}}>
                            {row.isCurrent ? <MoreVertical style={{cursor: 'pointer'}} size={16} onClick={() => { setBudgetInputValue(((row.b || monthlyBudget || 10000000) / 1000000).toString()); setIsEditBudgetOpen(true); }}/> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart & Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="widget">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Ngân sách năm {currentYear}</h3>
                    <div style={{fontSize: '0.75rem', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '6px'}}>Năm {currentYear} ⌄</div>
                  </div>
                  <div style={{ height: 180, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearBudgetData} margin={{top: 10, right: 0, left: -25, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E5F3"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#716B7A'}} dy={5}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#716B7A'}} tickFormatter={v => v + 'M'}/>
                        <RechartsTooltip />
                        <Line type="stepAfter" dataKey="budget" stroke="#C4B5FD" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="spent" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 3, fill: 'var(--color-primary)'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width: 12, height: 12, background: '#C4B5FD', borderRadius: '3px'}}></div> Ngân sách</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width: 12, height: 12, background: 'var(--color-primary)', borderRadius: '3px'}}></div> Đã chi</div>
                  </div>
                </div>

                <div className="widget">
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '15px' }}>Cài đặt ngân sách</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{width: 32, height: 32, background: '#FEF3C7', color: '#D97706', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Bell size={16}/></div>
                        <div>
                          <div style={{fontWeight: '600', fontSize: '0.85rem'}}>Nhắc nhở khi chi tiêu gần hết</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--color-text-secondary)'}}>Thông báo khi đã chi 80% ngân sách</div>
                        </div>
                      </div>
                      <div 
                        style={{ width: 40, height: 22, background: budgetSettings.reminder ? 'var(--color-primary)' : '#E5E7EB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                        onClick={() => {
                          const newSettings = { ...budgetSettings, reminder: !budgetSettings.reminder };
                          setBudgetSettings(newSettings);
                          updateSettingsAPI({ budgetSettings: newSettings });
                        }}
                      >
                        <div style={{ width: 18, height: 18, background: 'var(--color-card)', borderRadius: '50%', position: 'absolute', top: 2, left: budgetSettings.reminder ? 'auto' : 2, right: budgetSettings.reminder ? 2 : 'auto', transition: 'all 0.3s' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{width: 32, height: 32, background: '#F3F4F6', color: '#6B7280', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Settings size={16}/></div>
                        <div>
                          <div style={{fontWeight: '600', fontSize: '0.85rem'}}>Tự động tạo ngân sách tháng mới</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--color-text-secondary)'}}>Sao chép ngân sách từ tháng trước</div>
                        </div>
                      </div>
                      <div 
                        style={{ width: 40, height: 22, background: budgetSettings.autoCopy ? 'var(--color-primary)' : '#E5E7EB', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                        onClick={() => {
                          const newSettings = { ...budgetSettings, autoCopy: !budgetSettings.autoCopy };
                          setBudgetSettings(newSettings);
                          updateSettingsAPI({ budgetSettings: newSettings });
                        }}
                      >
                        <div style={{ width: 18, height: 18, background: 'var(--color-card)', borderRadius: '50%', position: 'absolute', top: 2, left: budgetSettings.autoCopy ? 'auto' : 2, right: budgetSettings.autoCopy ? 2 : 'auto', transition: 'all 0.3s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '5px' }}>Báo cáo phân tích</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Thống kê chi tiết tình hình tài chính của bạn</p>
            </div>
            
            {/* 6. Xu hướng chi tiêu (Metric cards) */}
            <div className="grid-responsive-3" style={{gap: '20px', marginBottom: '20px'}}>
              <div className="widget">
                <h3 style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '5px'}}>So với tháng trước</h3>
                <div style={{fontSize: '1.5rem', fontWeight: '800'}}>{pctChange > 0 ? '+' : ''}{pctChange}%</div>
                <div style={{fontSize: '0.8rem', color: isGoodTrend ? 'var(--color-income)' : 'var(--color-expense)', marginTop: '5px'}}>
                  {isGoodTrend ? '↓ Giảm chi tiêu (Tốt)' : '↑ Tăng chi tiêu (Cần chú ý)'}
                </div>
              </div>
              <div className="widget">
                <h3 style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '5px'}}>Trung bình 3 tháng</h3>
                <div style={{fontSize: '1.5rem', fontWeight: '800'}}>{formatCurrency(avg3Months)}</div>
                <div style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '5px'}}>
                  {totalExpense < avg3Months ? 'Tháng này đang tiêu ít hơn TB' : 'Tháng này đang tiêu nhiều hơn TB'}
                </div>
              </div>
              <div className="widget">
                <h3 style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '5px'}}>Dự báo cuối tháng</h3>
                <div style={{fontSize: '1.5rem', fontWeight: '800'}}>{formatCurrency(projectedEndMonth)}</div>
                <div style={{fontSize: '0.8rem', color: (monthlyBudget && projectedEndMonth > monthlyBudget) ? 'var(--color-expense)' : 'var(--color-income)', marginTop: '5px'}}>
                  {monthlyBudget === null ? '  Chưa thiết lập ngân sách' : (projectedEndMonth > monthlyBudget ? '↑ Có thể vượt ngân sách dự kiến' : '↓ An toàn trong ngân sách')}
                </div>
              </div>
            </div>

            <div className="grid-responsive-2-1" style={{gap: '20px', marginBottom: '20px'}}>
              {/* 1. Chi tiêu theo thời gian */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Chi tiêu theo thời gian (Tháng này)</h3>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart data={dailyExpenseData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} tickFormatter={v => v + 'k'}/>
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-primary)'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Chi tiêu theo danh mục */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Cơ cấu chi tiêu</h3>
                <div style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                  {pieData.map((item, i) => (
                    <div key={i} style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'}}>
                      <div style={{width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(item.name)}}></div>
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid-responsive-1-1" style={{gap: '20px', marginBottom: '20px'}}>
              {/* 3. Thu nhập vs Chi tiêu */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Thu nhập vs Chi tiêu (6 tháng)</h3>
                <div style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer>
                    <BarChart data={incomeVsExpenseData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} tickFormatter={v => v + 'M'}/>
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                      <Bar dataKey="income" name="Thu nhập" fill="#34D399" radius={[4, 4, 0, 0]} barSize={15} />
                      <Bar dataKey="expense" name="Chi tiêu" fill="#FB7185" radius={[4, 4, 0, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 9. Dòng tiền tích lũy */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Dòng tiền tích lũy</h3>
                <div style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer>
                    <AreaChart data={cumulativeData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#716B7A'}} tickFormatter={v => v + 'M'}/>
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="balance" name="Số dư" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid-responsive-1-1-1" style={{gap: '20px', marginBottom: '20px'}}>
              {/* 5. Top danh mục chi nhiều nhất */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Top danh mục chi tiêu</h3>
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={topCategories} margin={{top: 0, right: 20, left: 20, bottom: 0}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12}} width={70} />
                      <RechartsTooltip />
                      <Bar dataKey="val" fill="#A78BFA" radius={[0, 4, 4, 0]} barSize={20}>
                        {topCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7. Chi tiêu theo ngày trong tuần */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Chi tiêu theo thứ</h3>
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer>
                    <BarChart data={shiftedWeekdayData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis hide />
                      <RechartsTooltip />
                      <Bar dataKey="val" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 8. Cố định vs Linh hoạt */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Cố định vs Linh hoạt</h3>
                <div style={{ height: 180, width: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={[{name: 'Cố định (Nhà, Hóa đơn)', value: fixedAmt}, {name: 'Linh hoạt (Khác)', value: flexAmt}]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                        <Cell fill="#6366F1" />
                        <Cell fill="#EC4899" />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.8rem', marginTop: '10px' }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#6366F1'}}></div> Cố định {Math.round(fixedAmt/(fixedAmt+flexAmt)*100)}%</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#EC4899'}}></div> Linh hoạt {Math.round(flexAmt/(fixedAmt+flexAmt)*100)}%</div>
                </div>
              </div>
            </div>

            <div className="grid-responsive-1-1" style={{gap: '20px'}}>
              {/* 4. Ngân sách vs Thực tế (Progress bars) */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Ngân sách vs Thực tế</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {budgetHistory.slice(0, 3).map((m, i) => {
                    const spentPct = Math.min(Math.round((m.s / m.b) * 100) || 0, 100);
                    return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <span style={{fontWeight: '600'}}>Tháng {m.m}</span>
                        <span style={{color: 'var(--color-text-secondary)'}}>{spentPct}% ngân sách</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${spentPct}%`, height: '100%', background: spentPct > 90 ? 'var(--color-expense)' : '#34D399', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* 10. Heatmap lịch chi tiêu */}
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Cường độ chi tiêu (30 ngày qua)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
                  {heatmapData.map((val, i) => {
                    const intensities = ['var(--color-bg)', '#D8B4FE', '#C084FC', '#A855F7', 'var(--color-primary-hover)'];
                    return (
                      <div key={i} style={{ aspectRatio: '1/1', background: intensities[val], borderRadius: '4px' }} title={`Cường độ: ${val}`}></div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '10px' }}>
                  <span>Ít</span>
                  <div style={{width: 10, height: 10, background: 'var(--color-bg)', borderRadius: '2px'}}></div>
                  <div style={{width: 10, height: 10, background: '#D8B4FE', borderRadius: '2px'}}></div>
                  <div style={{width: 10, height: 10, background: '#C084FC', borderRadius: '2px'}}></div>
                  <div style={{width: 10, height: 10, background: '#A855F7', borderRadius: '2px'}}></div>
                  <div style={{width: 10, height: 10, background: 'var(--color-primary-hover)', borderRadius: '2px'}}></div>
                  <span>Nhiều</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            {!isGoalInitialized ? (
              <div style={{ maxWidth: '500px', width: '100%', boxSizing: 'border-box', marginTop: isMobile ? '20px' : '50px', background: 'var(--color-card)', padding: isMobile ? '20px' : '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <img src={mascotAsset('goal_mascot')} alt="Goal Mascot" style={{ width: 150, marginBottom: '20px' }} />
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px', color: 'var(--color-text)' }}>Bắt đầu tiết kiệm cho những mục tiêu to lớn nhé!</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px' }}>Để gợi ý lộ trình tốt nhất, Peacee1 cần biết một vài thông tin cơ bản về bạn.</p>
                
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                  <div className="input-group">
                    <label style={{fontWeight: '600'}}>Mức lương hiện tại (VNĐ/tháng)</label>
                    <input type="text" placeholder="Ví dụ: 15.000.000" value={goalForm.salary.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} onChange={e => setGoalForm({...goalForm, salary: e.target.value.replace(/\./g, '')})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                  </div>
                  <div className="grid-responsive-1-1" style={{gap: '15px'}}>
                    <div className="input-group">
                      <label style={{fontWeight: '600'}}>Tuổi</label>
                      <input type="number" placeholder="25" value={goalForm.age} onChange={e => setGoalForm({...goalForm, age: e.target.value})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label style={{fontWeight: '600'}}>Giới tính</label>
                      <select value={goalForm.gender} onChange={e => setGoalForm({...goalForm, gender: e.target.value})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', backgroundColor: 'var(--color-card)', boxSizing: 'border-box'}}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveGoalInit} 
                  style={{ width: '100%', padding: '15px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)' }}
                >
                  Bắt đầu lập mục tiêu
                </button>
              </div>
            ) : (
              <div style={{width: '100%', maxWidth: '1000px'}}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '5px' }}>Mục tiêu của bạn</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Theo dõi và quản lý các khoản tiết kiệm.</p>
                  </div>
                  <div style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '15px 25px', borderRadius: '16px', boxShadow: '0 8px 20px rgba(var(--color-primary-rgb), 0.3)' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>Tổng tiền đang tiết kiệm</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                      {formatCurrency(
                        (customNormalSaving !== null ? customNormalSaving : Math.max((parseInt(profileData?.salary) || 0) - totalExpense, 0)) +
                        (customBankSavingTotal !== null ? customBankSavingTotal : Math.round(bankSaving.amount * (1 + (bankSaving.rate / 100) * (bankSaving.months / 12)))) +
                        (investmentIncome || 0)
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid-responsive-1-1" style={{gap: '20px', marginBottom: '20px'}}>
                  {/* Tiết kiệm bình thường */}
                  <div className="widget" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Tiết kiệm bình thường</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Lương tháng - Chi tiêu</p>
                    <div className="input-group">
                      <label>Số tiền (VNĐ)</label>
                      <input type="text" 
                             value={(customNormalSaving !== null ? customNormalSaving : Math.max((parseInt(profileData?.salary) || 0) - totalExpense, 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                             onChange={(e) => setCustomNormalSaving(parseInt(e.target.value.replace(/\./g, '')) || 0)} 
                             style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                  </div>

                  {/* Đầu tư */}
                  <div className="widget" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Đầu tư (Linh hoạt)</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Thu nhập đầu tư tháng này</p>
                    <div className="input-group">
                      <label>Số tiền (VNĐ)</label>
                      <input type="text" value={investmentIncome ? investmentIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setInvestmentIncome(parseInt(e.target.value.replace(/\./g, '')) || 0)} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                  </div>
                </div>

                {/* Gửi tiết kiệm */}
                <div className="widget" style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '5px' }}>Gửi tiết kiệm</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Tính lãi suất theo số tháng gửi.</p>
                  <div className="grid-responsive-1-1-1" style={{gap: '15px'}}>
                    <div className="input-group">
                      <label>Số tiền gửi (VNĐ)</label>
                      <input type="text" value={bankSaving.amount ? bankSaving.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setBankSaving({...bankSaving, amount: parseInt(e.target.value.replace(/\./g, '')) || 0})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label>Lãi suất (%/năm)</label>
                      <input type="number" value={bankSaving.rate} onChange={(e) => setBankSaving({...bankSaving, rate: parseFloat(e.target.value) || 0})} step="0.1" style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label>Số tháng gửi</label>
                      <input type="number" value={bankSaving.months} onChange={(e) => setBankSaving({...bankSaving, months: parseInt(e.target.value) || 0})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', padding: '15px', background: 'var(--color-background)', borderRadius: '12px', fontWeight: '600' }}>
                    <span>Tổng tiền nhận được sau {bankSaving.months} tháng:</span>
                    <input type="text" 
                           value={(customBankSavingTotal !== null ? customBankSavingTotal : Math.round(bankSaving.amount * (1 + (bankSaving.rate / 100) * (bankSaving.months / 12)))).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                           onChange={(e) => setCustomBankSavingTotal(parseInt(e.target.value.replace(/\./g, '')) || 0)} 
                           style={{padding: '8px', borderRadius: '8px', border: '1px solid var(--color-primary)', width: '150px', fontWeight: 'bold', color: 'var(--color-primary-ink)'}} />
                    <span>VNĐ</span>
                  </div>
                </div>

                {/* Mục tiêu */}
                <div className="widget">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Mục tiêu lớn</h3>
                  <div className="grid-responsive-1-1" style={{gap: '15px'}}>
                    <div className="input-group">
                      <label>Tên mục tiêu</label>
                      <input type="text" value={userGoal.name} onChange={(e) => setUserGoal({...userGoal, name: e.target.value})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label>Thời hạn</label>
                      <input type="date" value={userGoal.deadline} onChange={(e) => setUserGoal({...userGoal, deadline: e.target.value})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label>Số tiền hiện có (VNĐ)</label>
                      <input type="text" value={userGoal.currentSaved ? userGoal.currentSaved.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setUserGoal({...userGoal, currentSaved: parseInt(e.target.value.replace(/\./g, '')) || 0})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                    <div className="input-group">
                      <label>Số tiền cần (VNĐ)</label>
                      <input type="text" value={userGoal.targetAmount ? userGoal.targetAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setUserGoal({...userGoal, targetAmount: parseInt(e.target.value.replace(/\./g, '')) || 0})} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} />
                    </div>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <span style={{fontWeight: '600', color: 'var(--color-primary-ink)'}}>Tiến độ hoàn thành</span>
                      <span style={{fontWeight: '700'}}>{Math.min(Math.round((userGoal.currentSaved / userGoal.targetAmount) * 100) || 0, 100)}%</span>
                    </div>
                    <div style={{ height: 12, background: 'var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((userGoal.currentSaved / userGoal.targetAmount) * 100 || 0, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #F472B6, var(--color-primary))', borderRadius: '6px' }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button onClick={handleSaveGoals} className="btn-primary" style={{ padding: '12px 30px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', background: 'linear-gradient(90deg, var(--color-primary), #F472B6)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.3)' }}>
                    Lưu các thay đổi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Quản lý Danh mục</h2>
              <button 
                onClick={() => setIsAddingCategory(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(90deg, var(--color-primary), #F472B6)', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                + Thêm danh mục
              </button>
            </div>
            
            <div className="grid-responsive-1-1" style={{gap: '20px'}}>
              {/* Cột Chi tiêu */}
              <div className="widget" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: 'var(--color-expense)' }}>Chi tiêu (Expense)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(profileData?.custom_categories || []).filter(c => c.type === 'EXPENSE').map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                        <span style={{ fontWeight: '600' }}>{cat.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-expense)', padding: '5px' }}
                        title="Xoá danh mục"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột Thu nhập */}
              <div className="widget" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: 'var(--color-income)' }}>Thu nhập (Income)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(profileData?.custom_categories || []).filter(c => c.type === 'INCOME').map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                        <span style={{ fontWeight: '600' }}>{cat.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-expense)', padding: '5px' }}
                        title="Xoá danh mục"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personalization' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '5px' }}>Cá nhân hóa</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Tùy chỉnh giao diện và trải nghiệm của ứng dụng theo ý thích</p>
            </div>
            
            <div className="grid-responsive-2-1" style={{ gap: '20px' }}>
              <div className="widget">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Palette size={20} color="var(--color-primary-ink)"/> Giao diện & Màu sắc</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Chế độ hiển thị</label>
                    <div className="personal-display-options">
                      {[['light','Sáng',Sun],['dark','Tối',Moon],['system','Hệ thống',Smartphone]].map(([value,label,Icon]) => <button type="button" key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={24} /><span>{label}</span></button>)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Màu chủ đạo</label>
                    <div className="personal-color-options" role="group" aria-label="Chọn màu giao diện">
                      {personalPalettes.map(palette => <button key={palette.id} type="button" aria-pressed={personalAccent === palette.id} disabled={accentBusy || !profileData} onClick={() => changeAccent(palette.id)} className="personal-color-option">
                        <span style={{ background: palette.color }} /><strong>{palette.name}</strong>{personalAccent === palette.id && <small>Đang chọn</small>}
                      </button>)}
                    </div>
                    <p style={{ marginTop: 12 }}>Đổi màu giao diện và bộ hình mèo. Lựa chọn được lưu theo tài khoản.</p>
                    {accentError && <p role="alert">{accentError}</p>}
                    <img src={mascotAsset('cat_mascot')} alt={`Mèo Peacee1 · ${personalPalettes.find(palette => palette.id === personalAccent)?.name}`} width="160" height="160" style={{ objectFit: 'contain', marginTop: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '10px' }}>Bố cục bảng điều khiển (Dashboard)</label>
                    <div className="input-group">
                      <select style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', width: '100%', outline: 'none' }}>
                        <option>Mặc định (Tổng quan - Biểu đồ - Thu chi)</option>
                        <option>Ưu tiên Lịch sử giao dịch</option>
                        <option>Ưu tiên Biểu đồ phân tích</option>
                        <option>Chỉ hiển thị cơ bản</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="widget">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sliders size={20} color="var(--color-primary-ink)"/> Tùy chỉnh thông báo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Nhắc nhở nhập liệu</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Gửi thông báo vào lúc 20:00 hằng ngày</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Cảnh báo ngân sách</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Khi chi tiêu vượt quá 80% ngân sách</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Báo cáo tuần/tháng</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Gửi email tóm tắt vào cuối kỳ</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }} />
                    </div>
                  </div>
                </div>

                <div className="widget" style={{ background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(244,114,182,0.1))', border: '1px solid rgba(var(--color-primary-rgb), 0.3)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px', color: 'var(--color-primary-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}><Crown size={20} /> Widget tùy chỉnh</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px', lineHeight: '1.5' }}>
                    Người dùng Plus và Ultra có thể kéo thả, sắp xếp lại các widget và chọn ra những chỉ số quan trọng nhất hiển thị trên Dashboard.
                  </p>
                  <button className="btn-primary" onClick={() => setIsProfileOpen(true)} style={{ width: '100%', padding: '10px', borderRadius: '12px', fontSize: '0.9rem' }}>Nâng cấp để mở khóa</button>
                </div>
              </div>
            </div>
          </div>
        )}

                {activeTab === 'business' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Doanh nghiệp</h2>
                <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>Beta</span>
              </div>
              <p style={{ color: 'var(--color-text-secondary)' }}>Hồ sơ quán, sản phẩm, nhân viên và phân tích dòng tiền</p>
            </div>

            {bizLoading && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <p>Đang tải...</p>
              </div>
            )}

            {!bizLoading && bizData === false && (
              <div className="widget" style={{ maxWidth: '540px', margin: '0 auto', padding: '40px 30px', textAlign: 'center' }}>
                {!isBizCreating ? (
                  <>
                    <img src={mascotAsset('biz_cat')} alt="Business Cat" style={{ width: '180px', height: '180px', objectFit: 'contain', margin: '0 auto 20px auto' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>Bắt đầu khởi tạo doanh nghiệp của riêng mình nào!</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '25px', lineHeight: '1.6' }}>Thiết lập thông tin quán/doanh nghiệp của bạn để trải nghiệm bộ công cụ quản lý chuyên nghiệp.</p>
                    <button 
                      onClick={() => setIsBizCreating(true)}
                      style={{ background: 'linear-gradient(45deg, var(--color-primary), #F472B6)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.4)' }}
                    >
                      + Bắt đầu
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <button onClick={() => setIsBizCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '5px' }}><ArrowLeft size={20}/></button>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Tạo quán mới</h3>
                    </div>
                    {bizMsg && <p style={{ color: bizMsg.includes('✅') ? 'var(--color-income)' : 'var(--color-expense)', marginBottom: '15px', fontSize: '0.9rem' }}>{bizMsg}</p>}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                        <div 
                          style={{ width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed var(--color-border)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                          onClick={() => document.getElementById('biz-avatar-input').click()}
                        >
                          {bizAvatarPreview ? <img src={bizAvatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>📷</span>}
                        </div>
                        <input id="biz-avatar-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarUpload(e, 'biz')} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Nhấp để tải ảnh quán</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        <div>
                          <label style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Mô hình kinh doanh *</label>
                          <select value={bizForm.model} onChange={e => {
                            const m = e.target.value;
                            const isMed = m.includes('vừa');
                            setBizForm(f => ({ ...f, model: m, maxEmployees: isMed ? 50 : 20 }));
                          }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                            <option value="Quán cafe">Quán cafe (tối đa 20 NV)</option>
                            <option value="Quán net">Quán net (tối đa 20 NV)</option>
                            <option value="Quán bi a">Quán bi a (tối đa 20 NV)</option>
                            <option value="Quán ăn">Quán ăn (tối đa 20 NV)</option>
                            <option value="Doanh nghiệp nhỏ">Doanh nghiệp nhỏ (tối đa 20 NV)</option>
                            <option value="Doanh nghiệp vừa">Doanh nghiệp vừa (tối đa 50 NV)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Tên quán/doanh nghiệp *</label>
                          <input type="text" value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} placeholder="Nhập tên..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                        </div>
                        <button onClick={handleCreateBiz} disabled={bizActionLoading} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: bizActionLoading ? 'not-allowed' : 'pointer', marginTop: '10px', opacity: bizActionLoading ? 0.7 : 1 }}>
                          {bizActionLoading ? 'Đang xử lý...' : 'Khởi tạo ngay'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!bizLoading && bizData && (
              <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                <div 
                  className="widget biz-card" 
                  style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', transition: 'transform 0.2s', border: '1px solid var(--color-border)' }} 
                  onClick={() => {
                    if (window.confirm('Bạn có muốn chuyển sang Peacee1 Doanh nghiệp không?')) {
                      window.location.href = `/business/${bizData.id}`;
                    }
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={bizData.avatar_url ? `/api${bizData.avatar_url}` : '/default_avatar.png'} alt="avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{bizData.name}</h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                        <span style={{ display: 'inline-block', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: '12px' }}>{bizData.model}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Doanh thu hôm nay</p>
                      <p style={{ color: 'var(--color-income)', fontWeight: 'bold', fontSize: '1.1rem' }}>{bizSummary ? `+ ${formatCurrency(bizSummary.today_income)}` : 'Đang tải...'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Chi tiêu hôm nay</p>
                      <p style={{ color: 'var(--color-expense)', fontWeight: 'bold', fontSize: '1.1rem' }}>{bizSummary ? `- ${formatCurrency(bizSummary.today_expense)}` : 'Đang tải...'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {activeTab === 'settings' && (
          <div className="dashboard-scroll" style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Cài đặt hệ thống</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Tùy chỉnh trải nghiệm cá nhân của bạn</p>
            </div>
            
            <div className="widget" style={{ padding: 20, marginBottom: 20 }}>
              <h3>Quản lý tiền cá nhân</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}><input type="checkbox" checked={Boolean(profileData?.separate_personal_wallets)} disabled={walletSettingBusy || !profileData} onChange={async event => {
                const enabled = event.target.checked;
                setWalletSettingBusy(true); setWalletSettingError('');
                try {
                  await axios.post('/api/users/settings', { separatePersonalWallets: enabled }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                  setProfileData(current => ({ ...current, separate_personal_wallets: enabled }));
                } catch (error) { setWalletSettingError(error.response?.data?.message || 'Không thể lưu tuỳ chọn.'); }
                finally { setWalletSettingBusy(false); }
              }} />Phân biệt tiền tài khoản và tiền mặt</label>
              <p>Khi bật, mỗi khoản thu chi cần chọn nguồn tiền. Giao dịch cũ chưa chọn nguồn được giữ ở mục “Chưa phân loại”; bạn có thể sửa để phân loại. Tắt tuỳ chọn vẫn giữ nguồn tiền đã lưu.</p>
              {walletSettingError && <p role="alert">{walletSettingError}</p>}
            </div>
            <div className="widget" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Giao diện (Theme)</h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button 
                  onClick={() => setTheme('light')}
                  style={{ 
                    flex: 1, 
                    padding: '15px', 
                    borderRadius: '12px', 
                    border: theme === 'light' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', 
                    background: 'var(--color-card)', 
                    color: 'var(--color-text)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}>
                  <Sun size={20} /> Sáng (Light)
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  style={{ 
                    flex: 1, 
                    padding: '15px', 
                    borderRadius: '12px', 
                    border: theme === 'dark' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', 
                    background: 'var(--color-card)', 
                    color: 'var(--color-text)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}>
                  <Moon size={20} /> Tối (Dark)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Modals from old code... */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editTxId ? 'Sửa Giao Dịch' : 'Thêm Giao Dịch'}</h3>
              <button className="close-btn" onClick={() => { setIsModalOpen(false); setEditTxId(null); }}>×</button>
            </div>
            <form onSubmit={handleAddTransaction}>
              <div className="input-group">
                <label>Loại</label>
                <select style={{padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)'}} value={type} onChange={e => { setType(e.target.value); setCategory(''); }}>
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>
              <div className="input-group">
                <label>Danh mục</label>
                <select style={{padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box'}} value={category} onChange={e => setCategory(e.target.value)} required>
                  <option value="" disabled>Chọn danh mục</option>
                  {(profileData?.custom_categories || []).filter(c => c.type === type).map((cat, i) => (
                    <option key={i} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {profileData?.separate_personal_wallets && <div className="input-group">
                <label htmlFor="personal-payment-method">Nguồn tiền</label>
                <select id="personal-payment-method" required value={personalPaymentMethod} onChange={event => setPersonalPaymentMethod(event.target.value)} style={{ padding: '0.75rem', width: '100%', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <option value="">Chọn nguồn tiền</option><option value="CASH">Tiền mặt</option><option value="TRANSFER">Tiền tài khoản</option>
                </select>
              </div>}
              <div className="input-group">
                <label>Số tiền (VNĐ)</label>
                <input type="text" value={amount ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={e => setAmount(e.target.value.replace(/\./g, ''))} required placeholder="50.000" />
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
                    <div key={i} onMouseEnter={() => setHoveredTx(t.id)} onMouseLeave={() => setHoveredTx(null)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{t.category}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t.description || 'Thu nhập'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {hoveredTx === t.id && (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button onClick={() => handleEditTx(t)} style={{background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px'}} title="Sửa">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleDeleteTx(t.id)} style={{background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px'}} title="Xóa">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        )}
                        <div style={{ color: 'var(--color-income)', fontWeight: 'bold' }}>+{formatCurrency(t.amount)}</div>
                      </div>
                    </div>
                  ))}
                  {selectedDayInfo.expenses.map((t, i) => (
                    <div key={i} onMouseEnter={() => setHoveredTx(t.id)} onMouseLeave={() => setHoveredTx(null)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{t.category}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t.description || 'Chi tiêu'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {hoveredTx === t.id && (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button onClick={() => handleEditTx(t)} style={{background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px'}} title="Sửa">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleDeleteTx(t.id)} style={{background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px'}} title="Xóa">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        )}
                        <div style={{ color: 'var(--color-expense)', fontWeight: 'bold' }}>-{formatCurrency(t.amount)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Advisor Modal */}
      {isAiModalOpen && (
        <div className="modal-overlay" onClick={() => !aiLoading && setIsAiModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--color-card)',
            borderRadius: '24px',
            width: '90vw',
            maxWidth: '600px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #F472B6 100%)',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={mascotAsset('cat_ai_mascot')} alt="AI Cat" style={{ width: 56, height: 56, objectFit: 'contain' }} />
                <div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem' }}>Trợ lý AI Tài chính</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>Peacee1 AI đang phân tích ✨</div>
                </div>
              </div>
              {!aiLoading && (
                <button onClick={() => setIsAiModalOpen(false)} style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>×</button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    border: '4px solid rgba(var(--color-primary-rgb), 0.2)',
                    borderTopColor: 'var(--color-primary)',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px',
                  }}></div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text)', marginBottom: '8px' }}>AI đang phân tích...</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Peacee1 AI đang xem xét dữ liệu tài chính của bạn 📊</div>
                </div>
              ) : (
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(244,114,182,0.08))',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span>🔒</span>
                    <span>Phân tích dựa trên 30 ngày gần nhất. Dữ liệu được bảo mật bởi Peacee1.</span>
                  </div>
                  <div style={{
                    lineHeight: '1.8',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {aiAnalysis}
                  </div>
                  <button onClick={handleAiAnalyze} style={{
                    marginTop: '24px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, var(--color-primary), #F472B6)',
                    color: 'white',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                  }}>
                    🔄 Phân tích lại
                  </button>
                </div>
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
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    {profileData.name.charAt(0)}
                  </div>
                )}
                <label style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--color-card)', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  📷 <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={loading} />
                </label>
              </div>
              <h2 style={{ margin: '15px 0 5px', fontSize: '1.4rem' }}>{profileData.name}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {getPlanBadge(profileData.plan)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '20px', color: '#D97706', fontWeight: '700', fontSize: '1rem', marginTop: '5px' }}>
                <img src="/coin_icon.png" alt="Coin" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> {profileData.coin} Coins
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

            {/* Upgrade Section */}
            <h4 style={{marginTop: '20px', marginBottom: '10px'}}>🚀 Nâng Cấp Tài Khoản</h4>
            <div className="grid-responsive-1-1" style={{gap: '10px', marginBottom: '20px'}}>
              {(profileData.plan === 'normal') && (
                <div className="upgrade-card" style={{padding: '15px', border: '1px solid var(--color-border)', borderRadius: '12px', textAlign: 'center'}}>
                  <h4 style={{margin: '0 0 5px'}}>Gói Plus</h4>
                  <p style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 10px'}}>1000 Coins</p>
                  <button className="upgrade-btn" onClick={() => handleUpgrade('plus')} style={{width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--color-background)', border: '1px solid var(--color-border)', cursor: 'pointer'}}>Nâng cấp</button>
                </div>
              )}
              
              {(profileData.plan === 'normal' || profileData.plan === 'plus') && (
                <div className="upgrade-card" style={{padding: '15px', border: '1px solid var(--color-primary)', borderRadius: '12px', textAlign: 'center'}}>
                  <h4 style={{margin: '0 0 5px'}}>Gói Ultra 💎</h4>
                  <p style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 10px'}}>
                    {profileData.plan === 'normal' ? '3500' : '3000'} Coins
                  </p>
                  <button className="upgrade-btn" onClick={() => handleUpgrade('ultra')} style={{width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer'}}>Nâng cấp</button>
                </div>
              )}
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

      {isCheckinOpen && profileData && (
        <div className="modal-overlay">
          <div className="modal-content checkin-modal" style={{ padding: 0, overflow: 'hidden', maxWidth: '750px', width: '90vw', background: 'var(--color-bg)' }}>
            
            {/* Banner Section */}
            <div style={{ position: 'relative', background: 'var(--color-primary)' }}>
              <button onClick={() => setIsCheckinOpen(false)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              <img src={mascotAsset('checkin_banner')} alt="Banner Điểm Danh" style={{ width: '100%', display: 'block', borderRadius: '0' }} />
            </div>

            {/* Content Section */}
            <div style={{ padding: '20px 25px 25px' }}>
              
              {/* 3 Info Cards */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: 'var(--color-card)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '1.8rem' }}>🔥</div>
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-text)', lineHeight: 1 }}>{profileData.checkin_streak || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Ngày liên tiếp</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-primary-ink)', marginTop: '2px' }}>Điểm danh mỗi ngày để duy trì chuỗi!</div>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-card)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <img src="/coin_icon.png" alt="Coin" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-text)', lineHeight: 1 }}>{(profileData.coin || 0).toLocaleString('vi-VN')}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Coin hiện có</div>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-card)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '1.8rem' }}>🎁</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>Điểm danh đủ 7 ngày nhận thêm phần thưởng lớn!</div>
                </div>
              </div>

              {/* 7-day streak tracker */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '20px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const streak = profileData.checkin_streak || 0;
                  const isClaimed = day <= (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0));
                  const isGift = day === 7;
                  return (
                    <div key={day} style={{ 
                      flex: 1, 
                      background: isClaimed ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--color-card)',
                      border: isClaimed ? '2px solid var(--color-primary)' : '1px solid #E9E5F3',
                      borderRadius: '10px', padding: '10px 4px', textAlign: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: isClaimed ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '6px' }}>Ngày {day}</div>
                      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center', height: '28px', alignItems: 'center' }}>
                        {isClaimed
                          ? <span style={{ fontSize: '1.4rem' }}>✅</span>
                          : isGift
                            ? <span style={{ fontSize: '1.4rem' }}>🎁</span>
                            : <img src="/coin_icon.png" alt="Coin" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                        }
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isGift ? '#F59E0B' : '#181525' }}>
                        +{isGift ? 100 : 20}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Checkin button */}
              <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', borderRadius: '30px', fontWeight: 'bold', background: 'linear-gradient(90deg, var(--color-primary), #F472B6)', border: 'none', boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={handleCheckin} disabled={loading}>
                {loading ? 'Đang xử lý...' : <><img src="/coin_icon.png" alt="Coin" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> Điểm danh hôm nay (+20 coin)</>}
              </button>

              {/* Bonus rewards */}
              <div style={{ marginTop: '18px', background: 'var(--color-card)', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  🎁 Phần thưởng thêm
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, background: '#FEF3C7', padding: '10px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>👑</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400E' }}>Duy trì 7 ngày</div>
                    <div style={{ fontSize: '0.68rem', color: '#B45309', marginTop: '2px' }}>Nhận 100 coin bonus</div>
                  </div>
                  <div style={{ flex: 1, background: '#DBEAFE', padding: '10px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>⭐</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1E40AF' }}>Duy trì 30 ngày</div>
                    <div style={{ fontSize: '0.68rem', color: '#1D4ED8', marginTop: '2px' }}>Nhận 500 coin bonus</div>
                  </div>
                  <div style={{ flex: 1, background: '#D1FAE5', padding: '10px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🏆</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#065F46' }}>Duy trì liên tiếp</div>
                    <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '2px' }}>Nhiều phần thưởng đặc biệt hơn</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Thêm danh mục mới</h3>
              <button className="close-btn" onClick={() => setIsAddingCategory(false)}>×</button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Loại danh mục</label>
                <select style={{padding: '12px 16px', borderRadius: '10px', border: '2px solid var(--color-border)', width: '100%', boxSizing: 'border-box', outline: 'none'}} value={newCategory.type} onChange={e => setNewCategory({...newCategory, type: e.target.value})}>
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>
              <div className="input-group" style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Tên danh mục</label>
                <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} required placeholder="Ví dụ: Lương tháng 13" style={{padding: '12px 16px', borderRadius: '10px', border: '2px solid var(--color-border)', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
              </div>
              <div className="input-group" style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Màu sắc (RGB Picker)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input type="color" value={newCategory.color} onChange={e => setNewCategory({...newCategory, color: e.target.value})} style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace', background: 'var(--color-background)', padding: '8px 12px', borderRadius: '8px' }}>{newCategory.color}</span>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, var(--color-primary), #F472B6)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', marginTop: '25px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                Lưu danh mục <span style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem'}}><img src="/coin_icon.png" alt="Coin" style={{width: 16, height: 16}} /> -100</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {isEditBudgetOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>✏️ Sửa giới hạn chi tiêu tháng</h3>
              <button className="close-btn" onClick={() => setIsEditBudgetOpen(false)}>×</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Giới hạn chi tiêu (triệu đồng)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  value={budgetInputValue}
                  onChange={(e) => setBudgetInputValue(e.target.value)}
                  placeholder="Ví dụ: 10"
                  min="0"
                  step="0.5"
                  style={{ flex: 1, padding: '12px 16px', border: '2px solid var(--color-border)', borderRadius: '10px', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>triệu đ</span>
              </div>
              {budgetInputValue && (
                <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-primary-ink)', fontWeight: '500' }}>
                  = {(parseFloat(budgetInputValue) * 1000000).toLocaleString('vi-VN')} đ / tháng
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsEditBudgetOpen(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-card)', cursor: 'pointer', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                Hủy
              </button>
              <button onClick={() => {
                const newBudget = Math.round(parseFloat(budgetInputValue) * 1000000);
                if (!isNaN(newBudget) && newBudget > 0) {
                  setMonthlyBudgets(prev => {
                    const updated = { ...prev, [`${currentYear}-${currentMonth + 1}`]: newBudget };
                    updateSettingsAPI({ monthlyBudgets: updated });
                    return updated;
                  });
                  setIsEditBudgetOpen(false);
                }
              }} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', background: 'linear-gradient(90deg, var(--color-primary), #F472B6)', color: 'white', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)' }}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
