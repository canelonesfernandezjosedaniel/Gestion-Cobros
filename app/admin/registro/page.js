'use client';
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fmt$, fmtBsAmt, fmtDate, getQ } from '@/lib/utils';
import ClienteSelect from '@/components/ui/ClienteSelect';

const PAGE_SIZE = 50;

export default function RegistroPage() {
  const { records, setRecords, productCatalog, deductFromInventory, eurRate, fbAdd, fbUpdate, fbDelete, loading } = useApp();
  const toast = useToast();

  // Filtros
  const [q, setQ] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroQuin, setFiltroQuin] = useState('');
  const [sortCol, setSortCol] = useState('fecha');
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(1);

  // Modal
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ fecha: '', cliente: '', producto: '', precio: '', cantidad: '', status: 'Debe' });

  const allClientes = useMemo(() => [...new Set(records.map(r => r.cliente))].sort(), [records]);
  const allQuincenas = useMemo(() => [...new Set(records.map(r => getQ(r.fecha)))].filter(Boolean).sort(), [records]);
  const allProductos = useMemo(() => Object.keys(productCatalog).sort(), [productCatalog]);

  const filtered = useMemo(() => {
    let r = records.filter(r => {
      if (q && !r.cliente.toLowerCase().includes(q.toLowerCase()) && !(r.producto || '').toLowerCase().includes(q.toLowerCase())) return false;
      if (filtroStatus && r.status !== filtroStatus) return false;
      if (filtroCliente && r.cliente !== filtroCliente) return false;
      if (filtroQuin && getQ(r.fecha) !== filtroQuin) return false;
      return true;
    });
    r.sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return av < bv ? sortDir : av > bv ? -sortDir : 0;
    });
    return r;
  }, [records, q, filtroStatus, filtroCliente, filtroQuin, sortCol, sortDir]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const totalSum = filtered.reduce((s, r) => s + r.total, 0);
  const pagadoSum = filtered.filter(r => r.status === 'Pagado').reduce((s, r) => s + r.total, 0);
  const pendienteSum = filtered.filter(r => r.status === 'Debe').reduce((s, r) => s + r.total, 0);

  const sort = col => { if (sortCol === col) setSortDir(d => d * -1); else { setSortCol(col); setSortDir(-1); } setPage(1); };

  // CRUD
  const markPaid = useCallback(async id => {
    const r = records.find(r => r.id === id); if (!r) return;
    const updated = { ...r, status: 'Pagado' };
    setRecords(prev => prev.map(x => x.id === id ? updated : x));
    if (r._fbId) fbUpdate('ventas', r._fbId, { status: 'Pagado' }).catch(() => {});
    toast('✅ Marcado como Pagado');
  }, [records, setRecords, fbUpdate, toast]);

  const markDebe = useCallback(async id => {
    const r = records.find(r => r.id === id); if (!r) return;
    setRecords(prev => prev.map(x => x.id === id ? { ...x, status: 'Debe' } : x));
    if (r._fbId) fbUpdate('ventas', r._fbId, { status: 'Debe' }).catch(() => {});
    toast('↩ Marcado como Debe');
  }, [records, setRecords, fbUpdate, toast]);

  const delRecord = useCallback(async id => {
    if (!confirm('¿Eliminar este registro?')) return;
    const r = records.find(r => r.id === id);
    setRecords(prev => prev.filter(x => x.id !== id));
    if (r?._fbId) fbDelete('ventas', r._fbId).catch(() => {});
    toast('🗑 Eliminado');
  }, [records, setRecords, fbDelete, toast]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ fecha: new Date().toISOString().slice(0, 10), cliente: '', producto: '', precio: '', cantidad: '', status: 'Debe' });
    setModal(true);
  };

  const openEdit = id => {
    const r = records.find(r => r.id === id); if (!r) return;
    setEditingId(id);
    setForm({ fecha: r.fecha, cliente: r.cliente, producto: r.producto, precio: r.precio, cantidad: r.cantidad, status: r.status });
    setModal(true);
  };

  const handleProductoChange = nombre => {
    const info = productCatalog[nombre];
    if (info?.precio) setForm(f => ({ ...f, producto: nombre, precio: info.precio.toFixed(2) }));
    else setForm(f => ({ ...f, producto: nombre }));
  };

  const total = (parseFloat(form.precio) || 0) * (parseFloat(form.cantidad) || 0);

  const saveRecord = async () => {
    const { fecha, cliente, producto, precio, cantidad, status } = form;
    if (!fecha || !cliente || !precio || !cantidad) { toast('⚠️ Completa todos los campos', true); return; }
    const rec = { fecha, cliente, producto, precio: parseFloat(precio), cantidad: parseFloat(cantidad), total: parseFloat((parseFloat(precio) * parseFloat(cantidad)).toFixed(2)), status };

    if (editingId !== null) {
      const old = records.find(r => r.id === editingId);
      const updated = { ...old, ...rec };
      setRecords(prev => prev.map(r => r.id === editingId ? updated : r));
      if (old?._fbId) fbUpdate('ventas', old._fbId, rec).catch(() => {});
      toast('✅ Registro actualizado');
    } else {
      const newRec = { ...rec, id: Date.now() };
      const _fbId = await fbAdd('ventas', rec).catch(() => null);
      setRecords(prev => [...prev, { ...newRec, _fbId }]);
      if (status !== 'Presupuesto') deductFromInventory(producto, rec.cantidad, cliente, fecha);
      toast('✅ Venta guardada');
    }
    setModal(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      <div className="card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-wrap">
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Buscar cliente, producto..." />
          </div>
          <select className="sel" value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="Pagado">✅ Pagado</option>
            <option value="Debe">⏳ Debe</option>
            <option value="Presupuesto">🧾 Presupuesto</option>
          </select>
          <select className="sel" value={filtroCliente} onChange={e => { setFiltroCliente(e.target.value); setPage(1); }}>
            <option value="">Todos los clientes</option>
            {allClientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="sel" value={filtroQuin} onChange={e => { setFiltroQuin(e.target.value); setPage(1); }}>
            <option value="">Todas las quincenas</option>
            {allQuincenas.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}>➕ Nueva venta</button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => sort('fecha')}>Fecha</th>
                <th onClick={() => sort('cliente')}>Cliente</th>
                <th onClick={() => sort('producto')}>Producto</th>
                <th onClick={() => sort('precio')}>Precio</th>
                <th onClick={() => sort('cantidad')}>Cant.</th>
                <th onClick={() => sort('total')}>Total ($)</th>
                <th>Total (Bs)</th>
                <th>Status</th>
                <th>Quincena</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>Sin resultados</td></tr>
              ) : paged.map(r => (
                <tr key={r.id}>
                  <td>{fmtDate(r.fecha)}</td>
                  <td><strong>{r.cliente}</strong></td>
                  <td>{r.producto || '—'}</td>
                  <td>{fmt$(r.precio)}</td>
                  <td>{r.cantidad}</td>
                  <td><strong>{fmt$(r.total)}</strong></td>
                  <td style={{ color: 'var(--jade)', fontSize: '.78rem', fontWeight: 600 }}>{fmtBsAmt(r.total, eurRate)}</td>
                  <td>
                    <span className={`badge ${r.status === 'Pagado' ? 'badge-green' : r.status === 'Presupuesto' ? 'badge-amber' : 'badge-red'}`}>
                      {r.status === 'Pagado' ? '✅ Pagado' : r.status === 'Presupuesto' ? '🧾 Presupuesto' : '⏳ Debe'}
                    </span>
                  </td>
                  <td style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>{getQ(r.fecha)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.status !== 'Pagado'
                        ? <button className="btn btn-xs btn-success" onClick={() => markPaid(r.id)}>✅</button>
                        : <button className="btn btn-xs btn-ghost" onClick={() => markDebe(r.id)}>↩</button>}
                      <button className="btn btn-xs btn-ghost" onClick={() => openEdit(r.id)}>✏️</button>
                      <button className="btn btn-xs btn-danger" onClick={() => delRecord(r.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sum bar */}
        <div className="sum-bar">
          <span>📊 {filtered.length} registros</span>
          <span>💰 Total: <strong>{fmt$(totalSum)}</strong></span>
          <span>✅ Cobrado: <strong>{fmt$(pagadoSum)}</strong></span>
          <span>⏳ Pendiente: <strong>{fmt$(pendienteSum)}</strong>
            {eurRate > 0 && <span style={{ color: 'var(--jade)', fontSize: '.78rem' }}> ({fmtBsAmt(pendienteSum, eurRate)})</span>}
          </span>
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="pager">
            <span className="pager-info">Pág {page} de {totalPages}</span>
            {page > 1 && <button className="pg-btn" onClick={() => setPage(p => p - 1)}>‹</button>}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return p <= totalPages ? <button key={p} className={`pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button> : null;
            })}
            {page < totalPages && <button className="pg-btn" onClick={() => setPage(p => p + 1)}>›</button>}
          </div>
        )}
      </div>

      {/* Modal add/edit */}
      {modal && (
        <div className="overlay open" onClick={e => e.target.className === 'overlay open' && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId !== null ? '✏️ Editar Venta' : '➕ Nueva Venta'}</h3>
              <p>Los datos se sincronizan automáticamente</p>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-grp">
                  <label className="form-lbl">Fecha</label>
                  <input className="form-inp" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label className="form-lbl">Status</label>
                  <select className="form-inp" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="Pagado">✅ Pagado</option>
                    <option value="Debe">⏳ Debe</option>
                    <option value="Presupuesto">🧾 Presupuesto</option>
                  </select>
                </div>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Cliente</label>
                <ClienteSelect
                  value={form.cliente}
                  onChange={v => setForm(f => ({ ...f, cliente: v }))}
                  clientes={allClientes}
                />
              </div>
              <div className="form-grp">
                <label className="form-lbl">Producto</label>
                <input className="form-inp" type="text" value={form.producto}
                  onChange={e => handleProductoChange(e.target.value)}
                  list="dl-productos" placeholder="Producto" />
                <datalist id="dl-productos">{allProductos.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label className="form-lbl">Precio ($)</label>
                  <input className="form-inp" type="number" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label className="form-lbl">Cantidad</label>
                  <input className="form-inp" type="number" step="0.01" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
                </div>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Total ($)</label>
                <input className="form-inp" type="text" value={total > 0 ? total.toFixed(2) : ''} readOnly style={{ background: 'var(--bg)', fontWeight: 700 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveRecord}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
