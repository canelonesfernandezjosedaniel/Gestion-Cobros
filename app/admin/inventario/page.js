'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { getProductStats, fmt$, fmtDate } from '@/lib/utils';

export default function InventarioPage() {
  const { inventory, invHistory, records, productCatalog, saveInventory, eurRate, loading } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [sortMode, setSortMode] = useState('velocity');
  const [histOpen, setHistOpen] = useState(false);
  const [histProd, setHistProd] = useState('');
  const [histType, setHistType] = useState('');

  // Modal ajuste
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjType, setAdjType] = useState('add');
  const [adjForm, setAdjForm] = useState({ producto: '', qty: '', min: '', note: '' });

  const prodStats = useMemo(() => getProductStats(records, inventory), [records, inventory]);

  const productos = useMemo(() => {
    const allProds = [...new Set([...Object.keys(inventory), ...Object.keys(productCatalog)])];
    let list = allProds.map(nombre => {
      const inv = inventory[nombre] || { stock: 0, minStock: 3 };
      const stats = prodStats[nombre] || { velocity: 0, daysLeft: null };
      const status = inv.stock <= 0 ? 'out' : inv.stock <= (inv.minStock ?? 3) ? 'low' : 'ok';
      return { nombre, stock: inv.stock || 0, minStock: inv.minStock ?? 3, status, ...stats };
    });

    if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()));
    if (filtro) list = list.filter(p => p.status === filtro);

    list.sort((a, b) => {
      if (sortMode === 'velocity') return (b.velocity || 0) - (a.velocity || 0);
      if (sortMode === 'stock') return b.stock - a.stock;
      if (sortMode === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sortMode === 'days') {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      return 0;
    });
    return list;
  }, [inventory, productCatalog, prodStats, q, filtro, sortMode]);

  const totalUnits = productos.reduce((s, p) => s + p.stock, 0);
  const lowCount = productos.filter(p => p.status === 'low').length;
  const outCount = productos.filter(p => p.status === 'out').length;
  const fastestProd = [...productos].sort((a, b) => (b.velocity || 0) - (a.velocity || 0))[0];

  const openAdj = (nombre = '', type = 'add') => {
    const inv = inventory[nombre] || {};
    setAdjType(type);
    setAdjForm({ producto: nombre, qty: '', min: inv.minStock ?? 3, note: '' });
    setAdjOpen(true);
  };

  const confirmAdj = async () => {
    const { producto, qty, min, note } = adjForm;
    if (!producto || !qty) { toast('⚠️ Completa producto y cantidad', true); return; }
    const q = parseFloat(qty) || 0;
    const updated = { ...inventory };
    if (!updated[producto]) updated[producto] = { stock: 0, minStock: 3 };
    const prevStock = updated[producto].stock || 0;
    let newStock = prevStock;
    if (adjType === 'add') newStock = prevStock + q;
    if (adjType === 'set') newStock = q;
    if (adjType === 'remove') newStock = Math.max(0, prevStock - q);
    updated[producto] = { stock: newStock, minStock: parseFloat(min) || 3 };
    const histEntry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      producto,
      type: adjType,
      delta: newStock - prevStock,
      stockAfter: newStock,
      note: note || (adjType === 'add' ? 'Entrada de stock' : adjType === 'set' ? 'Stock establecido' : 'Retiro manual'),
    };
    await saveInventory(updated, histEntry);
    toast('✅ Stock actualizado');
    setAdjOpen(false);
  };

  const filteredHist = useMemo(() => {
    let h = [...invHistory].reverse();
    if (histProd) h = h.filter(x => x.producto === histProd);
    if (histType) h = h.filter(x => x.type === histType);
    return h.slice(0, 200);
  }, [invHistory, histProd, histType]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      {/* Stats banner */}
      <div className="stats-banner">
        {[
          { icon: '📦', lbl: 'Total unidades', val: totalUnits, sub: `${productos.length} productos` },
          { icon: '⚠️', lbl: 'Stock bajo', val: lowCount, sub: 'productos' },
          { icon: '❌', lbl: 'Agotados', val: outCount, sub: 'productos' },
          { icon: '🔥', lbl: 'Más vendido', val: fastestProd?.nombre || '—', sub: fastestProd ? `${(fastestProd.velocity || 0).toFixed(1)} u/día` : '' },
        ].map(s => (
          <div key={s.lbl} className="stat-pill">
            <div className="stat-pill-icon">{s.icon}</div>
            <div className="stat-pill-lbl">{s.lbl}</div>
            <div className="stat-pill-val">{s.val}</div>
            {s.sub && <div className="stat-pill-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ maxWidth: 240 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto..." />
        </div>
        <select className="sel" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="ok">✅ En stock</option>
          <option value="low">⚠️ Stock bajo</option>
          <option value="out">❌ Agotado</option>
        </select>
        <select className="sel" value={sortMode} onChange={e => setSortMode(e.target.value)}>
          <option value="velocity">🔥 Más vendidos</option>
          <option value="stock">📦 Mayor stock</option>
          <option value="nombre">🔤 A-Z</option>
          <option value="days">⏱ Se acaba antes</option>
        </select>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => openAdj('', 'add')}>📦 Cargar Stock</button>
        <button className="btn btn-ghost" onClick={() => setHistOpen(true)}>📋 Ver Historial</button>
      </div>

      {/* Grid */}
      <div className="inv-grid">
        {productos.map(p => {
          const maxStock = Math.max(p.stock, p.minStock * 3, 1);
          const pct = Math.min(100, (p.stock / maxStock) * 100);
          return (
            <div key={p.nombre} className={`inv-card ${p.status}`}>
              <div className="inv-product-name">{p.nombre}</div>
              <div className="inv-stock-row">
                <div>
                  <div className={`inv-stock-num ${p.status}`}>{p.stock}</div>
                  <div className="inv-stock-unit">unidades</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '.78rem', color: 'var(--text-2)' }}>
                  {p.daysLeft !== null && <div>~{p.daysLeft}d restantes</div>}
                  <div>mín: {p.minStock}</div>
                </div>
              </div>
              <div className="inv-progress">
                <div className={`inv-progress-fill ${p.status}`} style={{ width: `${pct}%` }}></div>
              </div>
              <div className="inv-stats">
                <div className="inv-stat">
                  <div className="inv-stat-lbl">Velocidad</div>
                  <div className="inv-stat-val">{(p.velocity || 0).toFixed(1)}/día</div>
                </div>
                <div className="inv-stat">
                  <div className="inv-stat-lbl">Total vendido</div>
                  <div className="inv-stat-val">{(p.ventas || 0).toFixed(0)}</div>
                </div>
              </div>
              <div className="inv-actions">
                <button className="inv-adj-btn add" onClick={() => openAdj(p.nombre, 'add')}>📥 Entrada</button>
                <button className="inv-adj-btn" onClick={() => openAdj(p.nombre, 'set')}>🔢 Fijar</button>
                <button className="inv-adj-btn" onClick={() => openAdj(p.nombre, 'remove')}>📤 Retiro</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal ajuste */}
      {adjOpen && (
        <div className="overlay open" onClick={e => e.target.className === 'overlay open' && setAdjOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>📦 Ajustar Stock</h3>
              <p>Actualiza las unidades disponibles</p>
            </div>
            <div className="modal-body">
              <div className="adj-type-btns">
                {[['add','📥','Entrada'],['set','🔢','Establecer'],['remove','📤','Retiro']].map(([t,i,l]) => (
                  <button key={t} className={`adj-type-btn${adjType === t ? ' active' : ''}`} onClick={() => setAdjType(t)}>
                    <div className="adj-icon">{i}</div><div className="adj-lbl">{l}</div>
                  </button>
                ))}
              </div>
              <div className="form-grp">
                <label className="form-lbl">Producto</label>
                <input className="form-inp" value={adjForm.producto} onChange={e => setAdjForm(f => ({ ...f, producto: e.target.value }))}
                  list="dl-inv-prods" placeholder="Selecciona o escribe..." />
                <datalist id="dl-inv-prods">
                  {[...new Set([...Object.keys(inventory), ...Object.keys(productCatalog)])].map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="form-grp">
                <label className="form-lbl">{adjType === 'add' ? 'Cantidad a ingresar' : adjType === 'set' ? 'Stock a establecer' : 'Cantidad a retirar'}</label>
                <input className="form-inp" type="number" step="1" min="0" value={adjForm.qty} onChange={e => setAdjForm(f => ({ ...f, qty: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-grp">
                <label className="form-lbl">Stock mínimo (alerta)</label>
                <input className="form-inp" type="number" step="1" min="0" value={adjForm.min} onChange={e => setAdjForm(f => ({ ...f, min: e.target.value }))} placeholder="Ej: 5" />
              </div>
              <div className="form-grp">
                <label className="form-lbl">Nota (opcional)</label>
                <input className="form-inp" value={adjForm.note} onChange={e => setAdjForm(f => ({ ...f, note: e.target.value }))} placeholder="Ej: Hornada nueva..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAdjOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmAdj}>✅ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {histOpen && (
        <div className="overlay open" onClick={e => e.target.className === 'overlay open' && setHistOpen(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>📋 Historial de Inventario</h3>
              <p>Todos los movimientos registrados</p>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <select className="sel" value={histProd} onChange={e => setHistProd(e.target.value)}>
                  <option value="">Todos los productos</option>
                  {Object.keys(inventory).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="sel" value={histType} onChange={e => setHistType(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  <option value="sale">🛒 Venta</option>
                  <option value="add">📥 Entrada</option>
                  <option value="set">🔢 Establecido</option>
                  <option value="remove">📤 Retiro</option>
                </select>
              </div>
              <div className="hist-timeline">
                {filteredHist.length === 0 ? (
                  <div className="empty"><div className="empty-icon">📋</div>Sin movimientos</div>
                ) : filteredHist.map(h => (
                  <div key={h.id} className="hist-item">
                    <div className={`hist-icon ${h.type === 'sale' ? 'sale' : h.type === 'add' ? 'add' : 'adjust'}`}>
                      {h.type === 'sale' ? '🛒' : h.type === 'add' ? '📥' : h.type === 'set' ? '🔢' : '📤'}
                    </div>
                    <div className="hist-info">
                      <div className="hist-title">{h.producto}</div>
                      <div className="hist-sub">{fmtDate(h.date)} · {h.note}</div>
                    </div>
                    <div className={`hist-delta ${h.delta >= 0 ? 'pos' : 'neg'}`}>
                      {h.delta >= 0 ? '+' : ''}{h.delta} → {h.stockAfter}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setHistOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
