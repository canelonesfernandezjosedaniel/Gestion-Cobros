'use client';
import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, isErr = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, isErr }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: t.isErr ? 'var(--vermilion)' : 'var(--ink)',
              color: '#fff',
              padding: '11px 22px',
              borderRadius: 10,
              fontSize: '.88rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid rgba(255,255,255,.08)',
              animation: 'slideUp .3s ease',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
