'use client';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const TITLES = {
  '/admin/dashboard':  'Dashboard',
  '/admin/registro':   'Registro de Ventas',
  '/admin/clientes':   'Clientes',
  '/admin/quincena':   'Acumulativo Quincenal',
  '/admin/proximo-envio': 'Próximo envío',
  '/admin/productos':  'Catálogo de Productos',
  '/admin/inventario': 'Inventario & Estadísticas',
  '/admin/pagos':      'Registrar Pago',
};

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname();
  const { eurRate, setEurRate, fetchRate } = useApp();
  const title = TITLES[pathname] || 'Ventas Canelones';

  const handleManualRate = e => {
    const v = parseFloat(e.target.value);
    if (v > 0) setEurRate(v);
  };

  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuClick} aria-label="Menú">☰</button>
      <div className="topbar-title">{title}</div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="topbar-rate">
          <span style={{ opacity: .55, fontSize: '.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>€ BCV</span>
          <span style={{ fontWeight: 800, fontSize: '.95rem' }}>
            {eurRate > 0 ? eurRate.toLocaleString('es-VE', { minimumFractionDigits: 0 }) : '—'}
          </span>
          <span style={{ opacity: .45, fontSize: '.68rem' }}>Bs</span>
          <input
            type="number"
            placeholder="Manual"
            step="0.01"
            onChange={handleManualRate}
            style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem', color: 'var(--gold)', width: 65, textAlign: 'right' }}
          />
        </div>
        <button onClick={fetchRate} title="Actualizar tasa BCV" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 8,
          width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '.9rem', transition: 'all .2s', color: 'var(--text-2)',
        }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--vermilion)'; e.currentTarget.style.background = 'var(--vermilion-pale)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}
        >🔄</button>
      </div>
    </header>
  );
}
