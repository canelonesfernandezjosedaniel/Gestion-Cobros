'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fmt$, fmtBsAmt } from '@/lib/utils';

export default function ProductosPage() {
  const { records, productCatalog, saveProductCatalog, eurRate, loading } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [sortCol, setSortCol] = useState('nombre');
  const [sortDir, setSortDir] = useState(1);
  const [modal, setModal] = useState(false);
  const [editNombre, setEditNombre] = useState(null);
  const [form, setForm] = useState({ nombre: '', precio: '', desc: '' });

  const prodStats = useMemo(() => {
    const s = {};
    records.forEach(r => {
      if (r.status === 'Presupuesto') return;
      if (!r.producto) return;
      if (!s[r.producto]) s[r.producto] = { ventas: 0, total: 0 };
      s[r.producto].ventas += r.cantidad;
      s[r.producto].total += r.total;
    });
    return s;
  }, [records]);

  const productos = useMemo(() => {
    let list = Object.entries(productCatalog).map(([nombre, info]) => ({
      nombre, precio: info.precio || 0, desc: info.desc || '',
      ventas: prodStats[nombre]?.ventas || 0, total: prodStats[nombre]?.total || 0,
    }));
    if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => {
      const av = typeof a[sortCol] === 'string' ? a[sortCol].toLowerCase() : a[sortCol];
      const bv = typeof b[sortCol] === 'string' ? b[sortCol].toLowerCase() : b[sortCol];
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return list;
  }, [productCatalog, prodStats, q, sortCol, sortDir]);

  const sort = col => { if (sortCol === col) setSortDir(d => d * -1); else { setSortCol(col); setSortDir(1); } };

  const openAdd = () => { setEditNombre(null); setForm({ nombre: '', precio: '', desc: '' }); setModal(true); };
  const openEdit = p => { setEditNombre(p.nombre); setForm({ nombre: p.nombre, precio: p.precio, desc: p.desc }); setModal(true); };

  const saveProd = async () => {
    const { nombre, precio, desc } = form;
    if (!nombre || !precio) { toast('⚠️ Nombre y precio son requeridos', true); return; }
    const updated = { ...productCatalog };
    if (editNombre && editNombre !== nombre) delete updated[editNombre];
    updated[nombre] = { precio: parseFloat(precio), desc };
    await saveProductCatalog(updated);
    toast('✅ Producto guardado');
    setModal(false);
  };

  const deleteProd = async nombre => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const updated = { ...productCatalog };
    delete updated[nombre];
    await saveProductCatalog(updated);
    toast('🗑 Producto eliminado');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ maxWidth: 260 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto..." />
        </div>
        <span style={{ color: 'var(--text-2)', fontSize: '.82rem' }}>{productos.length} productos</span>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>➕ Nuevo Producto</button>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => sort('nombre')}>Producto ↕</th>
                <th onClick={() => sort('precio')}>Precio ($) ↕</th>
                <th>Precio (Bs)</th>
                <th onClick={() => sort('ventas')}>Veces vendido ↕</th>
                <th onClick={() => sort('total')}>Total generado ↕</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>Sin productos. Agrega el primero.</td></tr>
              ) : productos.map(p => (
                <tr key={p.nombre}>
                  <td><strong>{p.nombre}</strong>{p.desc && <div style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>{p.desc}</div>}</td>
                  <td>{fmt$(p.precio)}</td>
                  <td style={{ color: 'var(--amber)', fontSize: '.82rem' }}>{eurRate > 0 ? `Bs ${(p.precio * eurRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}` : '—'}</td>
                  <td>{p.ventas.toFixed(1)}</td>
                  <td>{fmt$(p.total)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-ghost" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn btn-xs btn-danger" onClick={() => deleteProd(p.nombre)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sum-bar">
          <span>📦 {productos.length} productos</span>
          <span>💰 Total generado: <strong>{fmt$(productos.reduce((s, p) => s + p.total, 0))}</strong></span>
        </div>
      </div>

      {modal && (
        <div className="overlay open" onClick={e => e.target.className === 'overlay open' && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editNombre ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h3>
              <p>El precio se autocompletará al seleccionar en ventas</p>
            </div>
            <div className="modal-body">
              <div className="form-grp">
                <label className="form-lbl">Nombre del Producto</label>
                <input className="form-inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Alfajores, Craqueladas..." />
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label className="form-lbl">Precio ($)</label>
                  <input className="form-inp" type="number" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label className="form-lbl" style={{ color: '#e65100' }}>Precio (Bs)</label>
                  <input className="form-inp" type="text" readOnly
                    value={eurRate > 0 && form.precio ? `Bs ${(parseFloat(form.precio) * eurRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}` : '—'}
                    style={{ background: '#fffde7', color: '#e65100', borderColor: '#ffcc80' }} />
                </div>
              </div>
              <div className="form-grp">
                <label className="form-lbl">Descripción (opcional)</label>
                <input className="form-inp" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Notas sobre el producto..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveProd}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
