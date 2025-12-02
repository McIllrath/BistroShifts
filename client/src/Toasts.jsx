import React from 'react'

// Render simple Bootstrap toasts. We don't use the JS API; we show/hide via React.
export default function Toaster({ toasts = [], onRemove }) {
  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1200 }} aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast align-items-center text-bg-${t.type === 'error' ? 'danger' : (t.type === 'success' ? 'success' : 'primary')} border-0 show`} role="alert" aria-live="assertive" aria-atomic="true" style={{ minWidth: 240, marginBottom: 8 }}>
          <div className="d-flex">
            <div className="toast-body">{t.message}</div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => onRemove(t.id)}></button>
          </div>
        </div>
      ))}
    </div>
  )
}
