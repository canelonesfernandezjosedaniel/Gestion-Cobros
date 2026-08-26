'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getQ, fmt$ } from '@/lib/utils';

export default function QuincenaPage() {
  const { records, loading } = useApp();
  const [mode, setMode] = useState('total');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'nombre'

  const { allQ, rows, colTotals, grandTotal } = useMemo(() => {
    // Convierte "May 16-31 2026" → número ordenable
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const qToNum = qn => {
      const p = qn.split(' ');
      return parseInt(p[2]) * 100 + MONTHS.indexOf(p[0]) * 2 + (p[1].startsWith('1-') ? 0 : 1);
    };

    const qSet = {};
    records.forEach(r => { if (r.status === 'Presupuesto') return; const qn = getQ(r.fecha); if (qn) qSet[qn] = true; });
    // Más reciente primero, últimas 12
    const allQ = Object.keys(qSet).sort((a, b) => qToNum(b) - qToNum(a)).slice(0, 12);

    const byClient = {};
    records.forEach(r => {
      if (r.status === 'Presupuesto') return;
      const qn = getQ(r.fecha);
      if (!qn || !allQ.includes(qn)) return;
      if (!byClient[r.cliente]) byClient[r.cliente] = {};
      if (!byClient[r.cliente][qn]) byClient[r.cliente][qn] = { total: 0, pendiente: 0 };
      byClient[r.cliente][qn].total += r.total;
      if (r.status !== 'Pagado') byClient[r.cliente][qn].pendiente += r.total;
    });

    let clis = Object.keys(byClient);
    if (q) clis = clis.filter(c => c.toLowerCase().includes(q.toLowerCase()));

    const rows = clis.map(nombre => ({
      nombre,
      data: allQ.map(qn => {
        const d = byClient[nombre]?.[qn];
        if (!d) return null;
        return mode === 'pendiente' ? d.pendiente : d.total;
      }),
      total: allQ.reduce((s, qn) => {
        const d = byClient[nombre]?.[qn];
        if (!d) return s;
        return s + (mode === 'pendiente' ? d.pendiente : d.total);
      }, 0),
    }));

    // Ordenar por total desc o nombre asc
    rows.sort((a, b) => sortBy === 'nombre' ? a.nombre.localeCompare(b.nombre) : b.total - a.total);

    const colTotals = allQ.map((_, i) => rows.reduce((s, r) => s + (r.data[i] || 0), 0));
    const grandTotal = colTotals.reduce((s, t) => s + t, 0);

    return { allQ, rows, colTotals, grandTotal };
  }, [records, mode, q, sortBy]);

  const maxVal = useMemo(() => Math.max(...rows.flatMap(r => r.data.filter(Boolean)), 1), [rows]);
  const getHeat = val => {
    if (!val) return 'h0';
    const pct = val / maxVal;
    if (pct > 0.7) return 'h3';
    if (pct > 0.4) return 'h2';
    return 'h1';
  };

  // Quincena actual
  const currentQ = getQ(new Date().toISOString().slice(0, 10));

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      {/* Stats banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Quincenas', value: allQ.length, icon: '📅', color: 'var(--jade)' },
          { label: 'Clientes', value: rows.length, icon: '👥', color: 'var(--vermilion)' },
          { label: 'Total período', value: fmt$(grandTotal), icon: '💰', color: 'var(--gold)', big: true },
          { label: 'Quincena actual', value: currentQ || '—', icon: '📍', color: 'var(--jade)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '.62rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: s.big ? '1.3rem' : '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="sel" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="total">Total vendido</option>
            <option value="pendiente">Solo pendiente</option>
          </select>
          <select className="sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="total">Ordenar: Mayor total</option>
            <option value="nombre">Ordenar: Nombre A-Z</option>
          </select>
          <div className="search-wrap" style={{ maxWidth: 220, flex: 1 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente..." />
          </div>
          <span style={{ fontSize: '.78rem', color: 'var(--text-2)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {rows.length} clientes · {allQ.length} quincenas
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="empty"><div className="empty-icon">📅</div><p>Sin datos</p></div>
        ) : (
          <div className="quin-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>Cliente</th>
                  {allQ.map(qn => (
                    <th key={qn} style={{ fontSize: '.65rem', whiteSpace: 'nowrap', background: qn === currentQ ? 'rgba(196,29,46,.08)' : undefined }}>
                      {qn === currentQ ? '📍 ' : ''}{qn}
                    </th>
                  ))}
                  <th style={{ background: 'var(--ink)', color: '#fff' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.nombre} style={{ background: ri % 2 === 0 ? '#fff' : '#fdfaf7' }}>
                    <td style={{ fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap' }}>
                      {ri < 3 && <span style={{ marginRight: 4, opacity: .6 }}>{['🥇','🥈','🥉'][ri]}</span>}
                      {row.nombre}
                    </td>
                    {row.data.map((val, i) => (
                      <td key={i} className={val ? getHeat(val) : 'h0'}
                        style={{ background: allQ[i] === currentQ ? (val ? undefined : 'rgba(196,29,46,.03)') : undefined }}>
                        {val ? fmt$(val) : <span style={{ opacity: .3 }}>—</span>}
                      </td>
                    ))}
                    <td className="quin-total">{fmt$(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)' }}>
                  <td style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text-2)' }}>TOTAL</td>
                  {colTotals.map((t, i) => (
                    <td key={i} style={{ fontWeight: 700, fontSize: '.82rem', color: t > 0 ? 'var(--jade)' : 'var(--text-3)' }}>
                      {t > 0 ? fmt$(t) : '—'}
                    </td>
                  ))}
                  <td style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--ink)', background: 'var(--jade-pale)', borderTop: '2px solid var(--jade-light)' }}>
                    {fmt$(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
