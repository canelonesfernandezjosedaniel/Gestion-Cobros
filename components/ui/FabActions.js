'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { usePagos } from '@/hooks/usePagos';
import { getClientStats, fmt$, fmtBs, fmtDate, initials, colorFor } from '@/lib/utils';
import ClienteSelect from '@/components/ui/ClienteSelect';

// ── Venta Modal ────────────────────────────────────────────
function VentaModal({ onClose }) {
  const { records, eurRate, productCatalog, setRecords, deductFromInventory, fbAdd } = useApp();
  const toast = useToast();
  const allClients = useMemo(() => [...new Set(records.map(r => r.cliente))].sort(), [records]);
  const allProducts = useMemo(() => Object.keys(productCatalog || {}), [productCatalog]);
  const today = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(today);
  const [cliente, setCliente] = useState('');
  const [producto, setProducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [status, setStatus] = useState('Debe');
  const [saving, setSaving] = useState(false);

  const total = ((parseFloat(precio) || 0) * (parseFloat(cantidad) || 0)).toFixed(2);

  const handleSave = async () => {
    if (!fecha || !cliente || !precio || !cantidad) {
      toast('⚠️ Completa todos los campos', true); return;
    }
    setSaving(true);
    try {
      const rec = { fecha, cliente, producto, precio: parseFloat(precio), cantidad: parseFloat(cantidad), total: parseFloat(total), status };
      const newRec = { ...rec, id: Date.now() };
      const _fbId = await fbAdd('ventas', rec).catch(() => null);
      setRecords(prev => [...prev, { ...newRec, _fbId }]);
      deductFromInventory(producto, rec.cantidad, cliente, fecha);
      toast('✅ Venta guardada');
      onClose();
    } catch (e) {
      toast('❌ Error: ' + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay open" onClick={e => e.currentTarget === e.target && onClose()} style={{ zIndex: 600 }}>
      <div className="modal">
        <div className="modal-header">
          <h3>➕ Nueva Venta</h3>
          <p>Los datos se sincronizan automáticamente</p>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-grp">
              <label className="form-lbl">Fecha</label>
              <input className="form-inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="form-grp">
              <label className="form-lbl">Status</label>
              <select className="form-inp" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Pagado">✅ Pagado</option>
                <option value="Debe">⏳ Debe</option>
              </select>
            </div>
          </div>
          <div className="form-grp">
            <label className="form-lbl">Cliente</label>
            <ClienteSelect value={cliente} onChange={setCliente} clientes={allClients} />
          </div>
          <div className="form-grp">
            <label className="form-lbl">Producto</label>
            <input className="form-inp" type="text" value={producto} onChange={e => setProducto(e.target.value)}
              list="fab-dl-prods" placeholder="Producto" />
            <datalist id="fab-dl-prods">{(allProducts || []).map(p => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="form-row">
            <div className="form-grp">
              <label className="form-lbl">Precio ($)</label>
              <input className="form-inp" type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
            <div className="form-grp">
              <label className="form-lbl">Cantidad</label>
              <input className="form-inp" type="number" step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
          </div>
          <div className="form-grp">
            <label className="form-lbl">Total ($)</label>
            <input className="form-inp" type="number" value={total} readOnly style={{ background: 'var(--bg)', fontWeight: 700 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pago Modal ────────────────────────────────────────────
function PagoModal({ onClose }) {
  const { records, eurRate } = useApp();
  const { confirmPayment, getClientDebt, getClientPayments } = usePagos();
  const toast = useToast();

  const [clienteName, setClienteName] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [amountBs, setAmountBs] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const allClientes = useMemo(() => [...new Set(records.map(r => r.cliente))].sort(), [records]);
  const debt = useMemo(() => clienteName ? getClientDebt(clienteName) : 0, [clienteName, records]);
  const recentPayments = useMemo(() => clienteName ? getClientPayments(clienteName) : [], [clienteName, records]);
  const stats = useMemo(() => getClientStats(records), [records]);

  const onUsdChange = v => {
    setAmountUsd(v);
    if (eurRate > 0 && v) setAmountBs(((parseFloat(v) || 0) * eurRate).toFixed(0));
    else setAmountBs('');
  };
  const onBsChange = v => {
    setAmountBs(v);
    if (eurRate > 0 && v) setAmountUsd(((parseFloat(v) || 0) / eurRate).toFixed(2));
    else setAmountUsd('');
  };
  const setPct = pct => { if (!debt) return; onUsdChange((debt * pct / 100).toFixed(2)); };

  const amount = parseFloat(amountUsd) || 0;
  const remaining = Math.max(0, debt - amount);
  const clears = amount >= debt - 0.001;

  const handleConfirm = async () => {
    if (!clienteName) { toast('⚠️ Selecciona un cliente', true); return; }
    if (amount <= 0) { toast('⚠️ Ingresa un monto', true); return; }
    setSaving(true);
    try {
      await confirmPayment({ name: clienteName, amount, note });
      toast('✅ Pago registrado correctamente');
      setClienteName(''); setAmountUsd(''); setAmountBs(''); setNote('');
      onClose();
    } catch (e) {
      toast('❌ Error: ' + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay open" onClick={e => e.currentTarget === e.target && onClose()} style={{ zIndex: 600 }}>
      <div className="modal">
        <div className="pay-header-band">
          <h3>💳 Registrar Pago</h3>
          <p>El saldo se actualiza automáticamente</p>
        </div>
        <div className="modal-body">
          <div className="form-grp">
            <label className="form-lbl">Cliente</label>
            <ClienteSelect
              value={clienteName}
              onChange={v => { setClienteName(v); setAmountUsd(''); setAmountBs(''); }}
              clientes={allClientes}
            />
          </div>
          {clienteName && stats[clienteName] && (
            <div className="pay-ci-box">
              <div className="pay-av" style={{ background: colorFor(clienteName) }}>{initials(clienteName)}</div>
              <div>
                <div className="pay-ci-name">{clienteName}</div>
                <div className="pay-ci-debt">Pendiente: {fmt$(debt)}</div>
                {eurRate > 0 && <div className="pay-ci-bs">≈ Bs {fmtBs(debt * eurRate)}</div>}
              </div>
            </div>
          )}
          <div className="pay-amt-row">
            <div>
              <div className="amt-lbl usd">Monto Pagado ($)</div>
              <div className="amt-wrap"><span className="amt-cur">$</span>
                <input className="amt-inp" type="number" step="0.01" placeholder="0.00" value={amountUsd} onChange={e => onUsdChange(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="amt-lbl bs">Equivalente (Bs)</div>
              <div className="amt-wrap"><span className="amt-cur bs-cur">Bs</span>
                <input className="amt-inp bs-inp" type="number" step="1" placeholder="0" value={amountBs} onChange={e => onBsChange(e.target.value)} />
              </div>
            </div>
          </div>
          {debt > 0 && (
            <div className="pay-shortcuts">
              <span style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>Rápido:</span>
              {[25, 50, 75].map(p => <button key={p} className="pay-shortcut" onClick={() => setPct(p)}>{p}%</button>)}
              <button className="pay-shortcut" onClick={() => setPct(100)}>💯 Total</button>
            </div>
          )}
          {amount > 0 && debt > 0 && (
            <div className="pay-sum" style={{ display: 'block' }}>
              <div className="pay-sum-row"><span>Deuda anterior</span><span style={{ fontWeight: 600 }}>{fmt$(debt)}</span></div>
              <div className="pay-sum-row"><span>Pago recibido</span><span style={{ color: 'var(--jade)', fontWeight: 600 }}>{fmt$(amount)}</span></div>
              <div className={`pay-sum-row total ${clears ? 'clear' : 'owe'}`}>
                <span>Saldo restante</span><span>{clears ? '✅ Saldado' : fmt$(remaining)}</span>
              </div>
            </div>
          )}
          <div className="form-grp">
            <label className="form-lbl">Nota (opcional)</label>
            <input className="form-inp" value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: Transferencia, efectivo..." />
          </div>
          {recentPayments.length > 0 && (
            <div className="pay-hist" style={{ display: 'block' }}>
              <h4>📋 Últimos pagos</h4>
              {recentPayments.map((p, i) => (
                <div key={i} className="pay-hist-item">
                  <span>{fmtDate(p.date)}</span>
                  <span style={{ color: 'var(--jade)', fontWeight: 600 }}>{fmt$(p.amount)}</span>
                  {p.note && <span style={{ color: 'var(--text-2)', fontSize: '.75rem' }}>{p.note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !clienteName || amount <= 0} style={{ flex: 1 }}>
            {saving ? '⏳ Guardando...' : '💳 Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FAB Buttons + Modals ──────────────────────────────────
export default function FabActions() {
  const [open, setOpen] = useState(null); // 'venta' | 'pago' | null

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 26, right: 26,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', zIndex: 400,
      }}>
        <button
          onClick={() => setOpen('venta')}
          style={{
            background: 'linear-gradient(135deg,#1a7a40 0%,#0f4d28 100%)',
            color: '#fff', border: 'none', borderRadius: 50, padding: '13px 22px',
            fontWeight: 700, fontSize: '.88rem', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(26,122,64,.45)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            transition: 'all .2s',
          }}
        >
          📋 Nueva Venta
        </button>
        <button
          onClick={() => setOpen('pago')}
          style={{
            background: 'linear-gradient(135deg,#c41d2e 0%,#a01020 100%)',
            color: '#fff', border: 'none', borderRadius: 50, padding: '13px 22px',
            fontWeight: 700, fontSize: '.88rem', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196,29,46,.45)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            transition: 'all .2s',
          }}
        >
          💳 Registrar Pago
        </button>
      </div>

      {open === 'venta' && <VentaModal onClose={() => setOpen(null)} />}
      {open === 'pago' && <PagoModal onClose={() => setOpen(null)} />}
    </>
  );
}
