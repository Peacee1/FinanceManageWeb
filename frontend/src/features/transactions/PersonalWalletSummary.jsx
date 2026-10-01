import React from 'react';

export default function PersonalWalletSummary({ transactions, formatCurrency }) {
  const groups = [
    { method: 'CASH', name: 'Tiền mặt' },
    { method: 'TRANSFER', name: 'Tiền tài khoản' },
    { method: null, name: 'Chưa phân loại' },
  ];
  return <section className="widget" style={{ padding: 20, marginBottom: 20 }} aria-label="Thu chi theo nguồn tiền">
    <h3>Thu chi theo nguồn tiền · tháng đang xem</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginTop: 16 }}>
      {groups.map(group => {
        const rows = transactions.filter(row => (row.payment_method || null) === group.method);
        if (group.method === null && !rows.length) return null;
        const income = rows.filter(row => row.type === 'INCOME').reduce((sum, row) => sum + Number(row.amount), 0);
        const expense = rows.filter(row => row.type === 'EXPENSE').reduce((sum, row) => sum + Number(row.amount), 0);
        return <div key={group.name} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
          <strong>{group.name}</strong>
          <p style={{ color: 'var(--color-income)', marginTop: 12 }}>Thu: {formatCurrency(income)}</p>
          <p style={{ color: 'var(--color-expense)' }}>Chi: {formatCurrency(expense)}</p>
          <p>Thu − chi: <strong>{formatCurrency(income - expense)}</strong></p>
        </div>;
      })}
    </div>
    <p style={{ color: 'var(--color-text-secondary)', marginTop: 12 }}>Tính từ giao dịch đã ghi trong tháng, chưa gồm số dư ban đầu. Tiền tài khoản do bạn nhập, không tự đồng bộ ngân hàng.</p>
  </section>;
}
