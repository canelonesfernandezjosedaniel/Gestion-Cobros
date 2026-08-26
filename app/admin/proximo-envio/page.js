'use client';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fmt$, fmtDate } from '@/lib/utils';

const rowKey = r => [r.cliente || 'Sin cliente', r.producto || 'Sin producto', r.precio || 0].join('::');

export default function ProximoEnvioPage() {
  const { records, nextShipmentChecks, saveNextShipmentChecks, loading } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('cliente');

  const rows = useMemo(() => {
    const grouped = {};

    records
      .filter(r => r.status === 'Presupuesto')
      .forEach(r => {
        const key = rowKey(r);
        if (!grouped[key]) {
          grouped[key] = {
            key,
            cliente: r.cliente || 'Sin cliente',
            producto: r.producto || 'Sin producto',
            precio: r.precio || 0,
            cantidad: 0,
            total: 0,
            fechas: [],
          };
        }

        grouped[key].cantidad += r.cantidad || 0;
        grouped[key].total += r.total || 0;
        if (r.fecha) grouped[key].fechas.push(r.fecha);
      });

    let list = Object.values(grouped).map(row => ({
      ...row,
      checked: Boolean(nextShipmentChecks[row.key]),
      fecha: row.fechas.sort()[0] || '',
    }));

    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(row =>
        row.cliente.toLowerCase().includes(needle) ||
        row.producto.toLowerCase().includes(needle)
      );
    }

    if (filter === 'listos') list = list.filter(row => row.checked);
    if (filter === 'pendientes') list = list.filter(row => !row.checked);

    list.sort((a, b) => {
      if (sortBy === 'monto') return b.total - a.total;
      if (sortBy === 'producto') return a.producto.localeCompare(b.producto);
      return a.cliente.localeCompare(b.cliente) || a.producto.localeCompare(b.producto);
    });

    return list;
  }, [records, nextShipmentChecks, q, filter, sortBy]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const ready = rows.filter(r => r.checked).reduce((s, r) => s + r.total, 0);
    return { total, ready, pending: total - ready, count: rows.length, readyCount: rows.filter(r => r.checked).length };
  }, [rows]);

  const toggleRow = row => {
    const updated = { ...nextShipmentChecks, [row.key]: !row.checked };
    if (row.checked) delete updated[row.key];
    saveNextShipmentChecks(updated);
  };

  const setAllVisible = checked => {
    const updated = { ...nextShipmentChecks };
    rows.forEach(row => {
      if (checked) updated[row.key] = true;
      else delete updated[row.key];
    });
    saveNextShipmentChecks(updated);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      <div className="stats-banner">
        {[
          { icon: '🧾', lbl: 'Presupuestos', val: totals.count, sub: 'producto por persona' },
          { icon: '✅', lbl: 'Validados', val: totals.readyCount, sub: fmt$(totals.ready) },
          { icon: '⏳', lbl: 'Por revisar', val: totals.count - totals.readyCount, sub: fmt$(totals.pending) },
          { icon: '💰', lbl: 'Total compra', val: fmt$(totals.total), sub: 'solo presupuesto' },
        ].map(s => (
          <div key={s.lbl} className="stat-pill">
            <div className="stat-pill-icon">{s.icon}</div>
            <div className="stat-pill-lbl">{s.lbl}</div>
            <div className="stat-pill-val">{s.val}</div>
            <div className="stat-pill-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-wrap" style={{ maxWidth: 280 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente o producto..." />
          </div>
          <select className="sel" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pendientes">Pendientes</option>
            <option value="listos">Validados</option>
          </select>
          <select className="sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="cliente">Ordenar: Cliente</option>
            <option value="producto">Ordenar: Producto</option>
            <option value="monto">Ordenar: Mayor monto</option>
          </select>
          <button className="btn btn-ghost" onClick={() => setAllVisible(true)}>✅ Validar visibles</button>
          <button className="btn btn-ghost" onClick={() => setAllVisible(false)}>↩ Limpiar visibles</button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <p>No hay presupuestos para revisar</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Costo unit.</th>
                  <th>Total producto</th>
                  <th>Primera fecha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.key} style={{ background: row.checked ? 'var(--jade-pale)' : undefined }}>
                    <td>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: row.checked ? 'var(--jade)' : 'var(--text-2)' }}>
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggleRow(row)}
                          style={{ width: 18, height: 18, accentColor: 'var(--jade)', cursor: 'pointer' }}
                        />
                        {row.checked ? 'Tiene' : 'Falta'}
                      </label>
                    </td>
                    <td><strong>{row.cliente}</strong></td>
                    <td>{row.producto}</td>
                    <td>{row.cantidad}</td>
                    <td>{fmt$(row.precio)}</td>
                    <td><strong>{fmt$(row.total)}</strong></td>
                    <td style={{ color: 'var(--text-2)', fontSize: '.78rem' }}>{row.fecha ? fmtDate(row.fecha) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)' }}>
                  <td colSpan={5} style={{ fontWeight: 800, color: 'var(--ink)' }}>TOTAL VISIBLE</td>
                  <td style={{ fontWeight: 900, color: 'var(--vermilion)' }}>{fmt$(totals.total)}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: '.78rem' }}>{totals.readyCount} validados</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
