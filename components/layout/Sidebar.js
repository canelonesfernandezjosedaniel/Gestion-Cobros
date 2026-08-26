'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

const NAV = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: '📊' },
  { href: '/admin/registro',   label: 'Registro',   icon: '📋' },
  { href: '/admin/clientes',   label: 'Clientes',   icon: '👥', badge: 'debtors' },
  { href: '/admin/quincena',   label: 'Quincena',   icon: '📅' },
  { href: '/admin/proximo-envio', label: 'Próximo envío', icon: '🧾' },
  { href: '/admin/productos',  label: 'Productos',  icon: '🍰' },
  { href: '/admin/inventario', label: 'Inventario', icon: '📦', badge: 'stock' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { eurRate, lowStockCount, debtorCount, dbStatus } = useApp();

  const dotClass = dbStatus === 'connected' ? 'db-dot connected' : dbStatus === 'error' ? 'db-dot error' : 'db-dot offline';
  const dotLabel = dbStatus === 'connected' ? 'Base de datos ✓' : dbStatus === 'error' ? 'Error BD' : 'Conectando...';

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,.4)' }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#c41d2e,#8b0f1e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: '#fff',
              boxShadow: '0 2px 12px rgba(196,29,46,.4)', flexShrink: 0,
            }}>売</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#fff', letterSpacing: '.3px' }}>Ventas Canelones</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', marginTop: 1 }}>Gestión de ventas</div>
            </div>
          </div>
        </div>

        <div className="sidebar-rate">
          <div style={{ fontSize: '.63rem', fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 5 }}>€ Euro BCV Oficial</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: '#f0c060' }}>
            {eurRate > 0 ? `Bs ${eurRate.toLocaleString('es-VE', { minimumFractionDigits: 0 })}` : <span style={{ color: 'rgba(255,255,255,.3)', fontSize: '.9rem' }}>Cargando...</span>}
          </div>
        </div>

        <nav className="nav-group">
          <div className="nav-label">Principal</div>
          {NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const badge = item.badge === 'debtors' ? debtorCount : item.badge === 'stock' ? lowStockCount : 0;
            return (
              <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </Link>
            );
          })}

          <div className="nav-label" style={{ marginTop: 18 }}>Acciones</div>
          <Link href="/catalogo" className="nav-item" target="_blank" onClick={onClose}>
            <span className="nav-icon">🛍️</span> Ver Catálogo
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="db-status">
            <div className={dotClass}></div>
            <span style={{ fontSize: '.78rem' }}>{dotLabel}</span>
          </div>
          <button onClick={logout} style={{
            marginTop: 8, width: '100%', padding: '9px 14px', background: 'rgba(196,29,46,.12)',
            border: '1px solid rgba(196,29,46,.2)', borderRadius: 8, color: 'rgba(255,100,100,.85)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(196,29,46,.25)'; e.currentTarget.style.color = '#ff8080'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(196,29,46,.12)'; e.currentTarget.style.color = 'rgba(255,100,100,.85)'; }}
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
