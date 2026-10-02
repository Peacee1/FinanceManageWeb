import React from 'react';
export default function FamilyDialog({ title, children, busy, error, onYes, onNo, onCancel }) {
  return <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <section role="dialog" aria-modal="true" aria-label={title} style={{ background: 'var(--color-bg)', color: 'var(--color-text)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 480 }}>
      <h2>{title}</h2><div style={{ margin: '16px 0' }}>{children}</div>
      {error && <p role="alert">{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button autoFocus type="button" className="btn-primary" disabled={busy} onClick={onYes}>Có</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onNo}>Không</button>
        {onCancel && <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Hủy</button>}
      </div>
    </section>
  </div>;
}
