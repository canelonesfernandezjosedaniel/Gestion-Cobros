'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { usePagos } from '@/hooks/usePagos';
import { getClientStats, fmt$, fmtBs, fmtDate, initials, colorFor } from '@/lib/utils';

export default function PagosPage() {
  const { records, eurRate, loading } = useApp();
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

  const setPct = pct => {
    if (!debt) return;
    const amt = (debt * pct / 100).toFixed(2);
    onUsdChange(amt);
  };

  const amount = parseFloat(amountUsd) || 0;
  const remaining = Math.max(0, debt - amount);
  const clears = amount >= debt - 0.001;

  const handleConfirm = async () => {
    if (!clienteName) { toast('⚠️ Selecciona un cliente', true); return; }
    if (amount <= 0) { toast('⚠️ Ingresa un monto', true); return; }
    if (amount > debt + 0.001) { toast('⚠️ El monto supera la deuda', true); return; }
    setSaving(true);
    try {
      await confirmPayment({ name: clienteName, amount, note });
      toast('✅ Pago registrado correctamente');
      setAmountUsd(''); setAmountBs(''); setNote('');
    } catch (e) {
      toast('❌ Error: ' + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="modal" style={{ position: 'static', width: '100%', maxWidth: '100%', animation: 'none', boxShadow: 'var(--shadow)' }}>
        <div className="pay-header-band">
          <h3>💳 Registrar Pago</h3>
          <p>El saldo se actualiza automáticamente</p>
        </div>
        <div className="modal-body">
          {/* Cliente */}
          <div className="form-grp">
            <label className="form-lbl">Cliente</label>
            <input className="form-inp" type="text" value={clienteName}
              onChange={e => { setClienteName(e.target.value); setAmountUsd(''); setAmountBs(''); }}
              list="dl-pay-cli" placeholder="Escribe o elige cliente..." />
            <datalist id="dl-pay-cli">{allClientes.map(c => <option key={c} value={c} />)}</datalist>
          </div>

          {/* Info cliente */}
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

          {/* Montos */}
          <div className="pay-amt-row">
            <div>
              <div className="amt-lbl usd">Monto Pagado ($)</div>
              <div className="amt-wrap">
                <span className="amt-cur">$</span>
                <input className="amt-inp" type="number" step="0.01" placeholder="0.00"
                  value={amountUsd} onChange={e => onUsdChange(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="amt-lbl bs">Equivalente (Bs)</div>
              <div className="amt-wrap">
                <span className="amt-cur bs-cur">Bs</span>
                <input className="amt-inp bs-inp" type="number" step="1" placeholder="0"
                  value={amountBs} onChange={e => onBsChange(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Atajos % */}
          {debt > 0 && (
            <div className="pay-shortcuts">
              <span style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>Rápido:</span>
              {[25, 50, 75].map(p => (
                <button key={p} className="pay-shortcut" onClick={() => setPct(p)}>{p}%</button>
              ))}
              <button className="pay-shortcut" onClick={() => setPct(100)}>💯 Total</button>
            </div>
          )}

          {/* Resumen */}
          {amount > 0 && debt > 0 && (
            <div className="pay-sum" style={{ display: 'block' }}>
              <div className="pay-sum-row"><span>Deuda anterior</span><span style={{ fontWeight: 600 }}>{fmt$(debt)}</span></div>
              <div className="pay-sum-row"><span>Pago recibido</span><span style={{ color: 'var(--jade)', fontWeight: 600 }}>{fmt$(amount)}</span></div>
              <div className={`pay-sum-row total ${clears ? 'clear' : 'owe'}`}>
                <span>Saldo restante</span>
                <span>{clears ? '✅ Saldado' : fmt$(remaining)}</span>
              </div>
            </div>
          )}

          {/* Nota */}
          <div className="form-grp">
            <label className="form-lbl">Nota (opcional)</label>
            <input className="form-inp" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ej: Transferencia, efectivo, Bs..." />
          </div>

          {/* Historial reciente */}
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
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving || !clienteName || amount <= 0}
            style={{ flex: 1 }}
          >
            {saving ? '⏳ Guardando...' : '💳 Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
