'use client';
import { useMemo } from 'react';
import { fmt$, fmtBsAmt, getClientStats } from '@/lib/utils';

export default function KpiGrid({ records, payments, eurRate }) {
  const kpis = useMemo(() => {
    const salesRecords = records.filter(r => r.status !== 'Presupuesto');
    const total = salesRecords.reduce((s, r) => s + r.total, 0);
    const cobrado = salesRecords.filter(r => r.status === 'Pagado').reduce((s, r) => s + r.total, 0);
    const pendiente = salesRecords.filter(r => r.status === 'Debe').reduce((s, r) => s + r.total, 0);
    const clientes = new Set(salesRecords.map(r => r.cliente)).size;
    const hoy = new Date().toISOString().slice(0, 10);
    const hoyRecords = salesRecords.filter(r => r.fecha === hoy);
    const hoyTotal = hoyRecords.reduce((s, r) => s + r.total, 0);
    const stats = getClientStats(salesRecords);
    const deudores = Object.values(stats).filter(s => s.total - s.pagado > 0.01).length;

    return [
      { label: 'Total Ventas', value: fmt$(total), sub: fmtBsAmt(total, eurRate), color: 'g', icon: '💰' },
      { label: 'Cobrado', value: fmt$(cobrado), sub: `${clientes} clientes`, color: 'a', icon: '✅' },
      { label: 'Pendiente', value: fmt$(pendiente), sub: `${deudores} deudores`, color: 'r', icon: '⏳' },
      { label: 'Hoy', value: fmt$(hoyTotal), sub: hoyRecords.length + ' ventas', color: 'b', icon: '📅' },
      { label: 'Tasa BCV', value: eurRate > 0 ? `Bs ${eurRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—', sub: 'EUR oficial', color: 'p', icon: '💱' },
    ];
  }, [records, payments, eurRate]);

  return (
    <div className="kpi-grid">
      {kpis.map(k => (
        <div key={k.label} className={`kpi ${k.color}`} data-icon={k.icon}>
          <div className="kpi-icon">{k.icon}</div>
          <div className="kpi-lbl">{k.label}</div>
          <div className="kpi-val">{k.value}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
