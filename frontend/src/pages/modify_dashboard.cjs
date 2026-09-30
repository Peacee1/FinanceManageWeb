const fs = require('fs');
const file = 'c:/Users/Admin/Downloads/webquanlychitieu/frontend/src/pages/Dashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

const newBusinessTab = `        {activeTab === 'business' && (
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
                    <img src="/biz_cat.png" alt="Business Cat" style={{ width: '180px', height: '180px', objectFit: 'contain', margin: '0 auto 20px auto' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>Bắt đầu khởi tạo doanh nghiệp của riêng mình nào!</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '25px', lineHeight: '1.6' }}>Thiết lập thông tin quán/doanh nghiệp của bạn để trải nghiệm bộ công cụ quản lý chuyên nghiệp.</p>
                    <button 
                      onClick={() => setIsBizCreating(true)}
                      style={{ background: 'linear-gradient(45deg, #7C3AED, #F472B6)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)' }}
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
                        <button onClick={handleCreateBiz} disabled={bizActionLoading} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: bizActionLoading ? 'not-allowed' : 'pointer', marginTop: '10px', opacity: bizActionLoading ? 0.7 : 1 }}>
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
                      window.location.href = \`/business/\${bizData.id}\`;
                    }
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={bizData.avatar_url ? \`/api\${bizData.avatar_url}\` : '/default_avatar.png'} alt="avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #7C3AED' }} />
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
                      <p style={{ color: 'var(--color-income)', fontWeight: 'bold', fontSize: '1.1rem' }}>+ 0 ₫</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Chi tiêu hôm nay</p>
                      <p style={{ color: 'var(--color-expense)', fontWeight: 'bold', fontSize: '1.1rem' }}>- 0 ₫</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}`;

const regex = /\{activeTab === 'business' && \([\s\S]*?(?=\s*\{activeTab === 'settings' &&)/;
c = c.replace(regex, newBusinessTab + '\n\n');

fs.writeFileSync(file, c);
console.log('Replaced business tab in Dashboard.jsx successfully');
