import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Inventory from '../features/inventory/Inventory';
import CafeOverview, { isCafeModel } from '../features/business/CafeOverview';
import { newRequestId } from '../utils/requestId';
import { vietnamDate } from '../utils/businessDate';
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle, LogOut, PawPrint, Clock } from 'lucide-react';

const API_URL = '';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const EmployeeDashboard = ({ user, handleLogout }) => {
  const [activeSection, setActiveSection] = useState('sales');
  const [businessContext, setBusinessContext] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const checkoutAttempt = useRef(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // { product, quantity }
  const [todayOrders, setTodayOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const token = localStorage.getItem('token');
  const axiosAuth = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    fetchProducts();
    fetchTodayOrders();
    axiosAuth.get('/api/business/context').then(response => setBusinessContext(response.data.business)).catch(error => setSuccessMsg(error.response?.data?.message || 'Không thể tải thông tin quán.'));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosAuth.get('/api/business/products');
      setProducts(res.data.products || []);
    } catch (err) {
      console.error('Loi lay san pham:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayOrders = async () => {
    try {
      const res = await axiosAuth.get('/api/transactions?scope=business');
      const today = vietnamDate();
      const todayTx = (res.data || []).filter(t => t.date?.startsWith(today) && t.type === 'INCOME');
      setTodayOrders(todayTx);
    } catch (err) {
      console.error('Loi lay lich su:', err);
    }
  };

  const addToCart = (product) => {
    if (submitting) return;
    const inCart = cart.find(item => item.product.id === product.id)?.quantity || 0;
    if (product.track_stock && inCart >= product.stock_quantity) { setSuccessMsg('❌ Không đủ tồn kho.'); return; }
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    if (submitting) return;
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const updateCartQty = (productId, delta) => {
    if (submitting) return;
    const item = cart.find(item => item.product.id === productId);
    if (delta > 0 && item?.product.track_stock && item.quantity >= item.product.stock_quantity) { setSuccessMsg('❌ Không đủ tồn kho.'); return; }
    setCart(prev => prev.map(c => {
      if (c.product.id === productId) {
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null;
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.product.price * c.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      if (!paymentMethod) { setSuccessMsg('❌ Vui lòng chọn tiền mặt hoặc chuyển khoản.'); return; }
      const items = cart.map(item => ({ productId: item.product.id, quantity: item.quantity }));
      const signature = JSON.stringify({ items, paymentMethod });
      if (checkoutAttempt.current?.signature !== signature) checkoutAttempt.current = { signature, requestId: newRequestId() };
      await axiosAuth.post('/api/business/checkout', { items, paymentMethod, requestId: checkoutAttempt.current.requestId, expectedTotal: cartTotal });
      checkoutAttempt.current = null;
      setPaymentMethod('');
      fetchProducts();
      setCart([]);
      setSuccessMsg('Thanh toan thanh cong!');
      fetchTodayOrders();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Loi thanh toan:', err);
      if (err.response?.status >= 400 && err.response?.status < 500) checkoutAttempt.current = null;
      fetchProducts();
      setSuccessMsg('❌ ' + (err.response?.data?.message || 'Không thể lưu đơn hàng. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const todayRevenue = todayOrders.reduce((sum, t) => sum + parseInt(t.amount || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PawPrint size={24} color="var(--color-primary)" />
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>POS Bán hàng</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Nhân viên: {user?.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Doanh thu hôm nay</div>
            <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--color-income)' }}>{formatCurrency(todayRevenue)}</div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 20px' }}>
        <button className="btn-primary" onClick={() => setActiveSection('sales')}>Bán hàng</button>
        {isCafeModel(businessContext?.model) && <button className="btn-primary" onClick={() => setActiveSection('tables')}>Tổng quan quán</button>}
        <button className="btn-primary" onClick={() => setActiveSection('inventory')}>Kho hàng · Nhập / xuất</button>
      </div>
      {successMsg && <div role={successMsg.startsWith('❌') ? 'alert' : 'status'} style={{ margin: '0 20px 12px', padding: 12, border: '1px solid var(--color-border)', borderRadius: 10 }}>{successMsg}</div>}
      {activeSection === 'tables' && isCafeModel(businessContext?.model) ? <div style={{ padding: 20 }}><CafeOverview user={user} businessId={businessContext.id} /></div> : activeSection === 'inventory' ? <div style={{ padding: 20 }}><Inventory user={user} /></div> : (
      <div className="employee-pos-grid">
        {/* Left: Product Grid */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '15px', fontSize: '1rem' }}>
            <ShoppingBag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Menu sản phẩm ({products.length})
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>Đang tải...</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              <ShoppingBag size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
              <p>Chưa có sản phẩm nào. Chủ quán cần thêm sản phẩm.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {products.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{ background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '15px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  {product.avatar_url ? (
                    <img src={`/api/${product.avatar_url.replace(/^\//, '')}`} alt={product.name} style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover', marginBottom: '10px' }} />
                  ) : (
                    <div style={{ width: '70px', height: '70px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(244,114,182,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', fontSize: '1.8rem' }}>🛍️</div>
                  )}
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '5px' }}>{product.name}</div>
                  <div style={{ fontWeight: '800', color: 'var(--color-primary)', fontSize: '0.95rem' }}>{formatCurrency(product.price)}</div>
                  <p style={{ fontSize: '.8rem', marginTop: 6 }}>{product.track_stock ? `Tồn kho: ${product.stock_quantity}` : 'Chưa theo dõi tồn'}</p>
                  <div style={{ marginTop: '8px', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: '600' }}>+ Thêm</div>
                </div>
              ))}
            </div>
          )}

          {/* Lịch sử hôm nay */}
          <h3 style={{ fontWeight: '700', margin: '25px 0 15px', fontSize: '1rem' }}>
            <Clock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Lịch sử bán hôm nay ({todayOrders.length} đơn)
          </h3>
          {todayOrders.length === 0 ? (
            <div style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Chưa có đơn nào hôm nay</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayOrders.map(order => (
                <div key={order.id} style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '15px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{order.description || 'Bán hàng'}</div>
                    <div style={{ fontSize: '.8rem' }}>{order.payment_method === 'CASH' ? 'Tiền mặt' : order.payment_method === 'TRANSFER' ? 'Chuyển khoản' : 'Chưa ghi nhận hình thức'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{new Date(order.created_at || order.date).toLocaleTimeString('vi-VN')}</div>
                  </div>
                  <div style={{ fontWeight: '800', color: 'var(--color-income)', fontSize: '1rem' }}>+{formatCurrency(order.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: '70px', height: 'calc(100vh - 70px)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>Giỏ hàng ({cart.length})</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontSize: '0.9rem' }}>Chọn sản phẩm từ menu để thêm vào giỏ</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{ background: 'var(--color-bg)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', flex: 1 }}>{item.product.name}</div>
                      <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-expense)', padding: 0 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => updateCartQty(item.product.id, -1)} style={{ width: 28, height: 28, borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: '700', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.product.id, 1)} style={{ width: 28, height: 28, borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <div style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{formatCurrency(item.product.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>Tổng cộng</span>
                <span style={{ fontWeight: '900', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{formatCurrency(cartTotal)}</span>
              </div>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>Hình thức thanh toán <span aria-hidden="true">*</span>
                <select required value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} disabled={submitting} style={{ width: '100%', minHeight: 44, marginTop: 8, padding: 10, border: '1px solid var(--color-border)', borderRadius: 10 }}>
                  <option value="">Chọn hình thức</option><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option>
                </select>
              </label>
              {successMsg && (
                <div style={{ background: 'rgba(52,211,153,0.15)', color: '#047857', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> {successMsg}
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={submitting || !paymentMethod}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #7C3AED, #9333EA)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(124,58,237,0.3)', transition: 'all 0.2s' }}
              >
                {submitting ? 'Đang xử lý...' : '✓ Thanh toán'}
              </button>
            </div>
          )}
        </div>
      </div>)}
    </div>
  );
};

export default EmployeeDashboard;
