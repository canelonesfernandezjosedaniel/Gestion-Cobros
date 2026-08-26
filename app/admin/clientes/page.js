'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { getClientStats, buildMsg, fmt$, fmtBsAmt, fmtDate, initials, colorFor, DEFAULT_TMPL } from '@/lib/utils';

const DEFAULT_TEMPLATE = `Hola {nombre}! 🍰 Te escribimos de Emprendimiento.\n\nTu saldo pendiente es de *{pendiente_usd}*\n💱 *{pendiente_bs}* (tasa BCV €)\n\n¡Gracias por tu preferencia! 😊`;

export default function ClientesPage() {
  const { records, clientPhones, setClientPhones, eurRate, waTemplate, saveWaTemplate, fbSet, loading } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [tmpl, setTmpl] = useState(waTemplate || DEFAULT_TEMPLATE);
  const [previewVis, setPreviewVis] = useState(false);

  // Bulk WA
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkIdx, setBulkIdx] = useState(0);
  const [bulkSent, setBulkSent] = useState(0);
  const [bulkSkipped, setBulkSkipped] = useState(0);

  const stats = useMemo(() => getClientStats(records), [records]);

  const clientes = useMemo(() => {
    let list = Object.entries(stats).map(([nombre, s]) => ({ nombre, ...s, pendiente: s.total - s.pagado }));
    if (q) list = list.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()));
    if (filtro === 'pendiente') list = list.filter(c => c.pendiente > 0.01);
    if (filtro === 'ok') list = list.filter(c => c.pendiente <= 0.01);
    if (filtro === 'sin-tel') list = list.filter(c => !clientPhones[c.nombre]);
    return list.sort((a, b) => b.pendiente - a.pendiente);
  }, [stats, clientPhones, q, filtro]);

  const deudores = clientes.filter(c => c.pendiente > 0.01);

  const savePhone = async (nombre, phone) => {
    setClientPhones(prev => ({ ...prev, [nombre]: phone }));
    await fbSet('clientes_config', nombre, { nombre, telefono: phone }).catch(() => {});
  };

  const sendWA = (nombre, pendiente) => {
    const phone = clientPhones[nombre];
    if (!phone) { toast('⚠️ Agrega el teléfono primero', true); return; }
    const msg = buildMsg(tmpl, nombre, stats[nombre], pendiente, eurRate);
    const num = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Bulk
  const openBulk = () => { setBulkIdx(0); setBulkSent(0); setBulkSkipped(0); setBulkOpen(true); };
  const bulkClient = deudores[bulkIdx];
  const bulkMsg = bulkClient ? buildMsg(tmpl, bulkClient.nombre, stats[bulkClient.nombre], bulkClient.pendiente, eurRate) : '';
  const [editBulkMsg, setEditBulkMsg] = useState('');
  useMemo(() => { if (bulkClient) setEditBulkMsg(bulkMsg); }, [bulkIdx, bulkOpen]);

  const bulkSend = () => {
    if (!bulkClient) return;
    const phone = clientPhones[bulkClient.nombre];
    if (phone) {
      const num = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(editBulkMsg)}`, '_blank');
      setBulkSent(s => s + 1);
    }
    if (bulkIdx + 1 >= deudores.length) setBulkOpen(false);
    else setBulkIdx(i => i + 1);
  };
  const bulkSkip = () => { setBulkSkipped(s => s + 1); if (bulkIdx + 1 >= deudores.length) setBulkOpen(false); else setBulkIdx(i => i + 1); };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner"></div></div>;

  return (
    <div>
      {/* Template WA */}
      <div className="tmpl-card">
        <div className="tmpl-title">✏️ Mensaje WhatsApp personalizado</div>
        <textarea className="tmpl-ta" value={tmpl} onChange={e => { setTmpl(e.target.value); saveWaTemplate(e.target.value); }} />
        <div className="tmpl-vars">
          <span style={{ fontSize: '.72rem', color: 'var(--text-2)', marginRight: 3 }}>Insertar:</span>
          {['{nombre}','{pendiente_usd}','{pendiente_bs}','{tasa}','{compras}','{ultima_compra}'].map(v => (
            <button key={v} className="tmpl-chip" onClick={() => setTmpl(t => t + v)}>{v}</button>
          ))}
          <button className="tmpl-chip" style={{ background: '#fdf0ee', color: 'var(--red)' }} onClick={() => setTmpl(DEFAULT_TEMPLATE)}>↩ Reset</button>
          <button className="tmpl-chip" style={{ background: '#e3f2fd', color: '#1565c0' }} onClick={() => setPreviewVis(v => !v)}>👁 Vista previa</button>
        </div>
        {previewVis && deudores[0] && (
          <div className="tmpl-preview-box">
            {buildMsg(tmpl, deudores[0].nombre, stats[deudores[0].nombre], deudores[0].pendiente, eurRate)}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ maxWidth: 260 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente..." />
        </div>
        <select className="sel" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendiente">⏳ Con saldo</option>
          <option value="ok">✅ Al día</option>
          <option value="sin-tel">📵 Sin teléfono</option>
        </select>
        <span style={{ color: 'var(--text-2)', fontSize: '.82rem', marginLeft: 'auto' }}>{clientes.length} clientes</span>
        <button className="btn btn-success" onClick={openBulk}>📤 Envío Masivo WhatsApp</button>
      </div>

      {/* Grid */}
      <div className="clients-grid">
        {clientes.map(c => {
          const owe = c.pendiente > 0.01;
          return (
            <div key={c.nombre} className={`cli-card ${owe ? 'has-debt' : 'no-debt'}`}>
              <div className="cli-head">
                <div className="cli-av" style={{ background: colorFor(c.nombre) }}>{initials(c.nombre)}</div>
                <div>
                  <div className="cli-name">{c.nombre}</div>
                  <div className="cli-meta">{c.compras} compras · última: {fmtDate(c.ultima)}</div>
                </div>
              </div>
              <div className={`cli-debt-box ${owe ? 'owe' : 'ok'}`}>
                <div className={`debt-lbl ${owe ? 'owe' : 'ok'}`}>{owe ? 'SALDO PENDIENTE' : 'AL DÍA'}</div>
                <div className={`debt-usd ${owe ? 'owe' : 'ok'}`}>{fmt$(c.pendiente)}</div>
                {owe && eurRate > 0 && <div className="debt-bs owe">{fmtBsAmt(c.pendiente, eurRate)}</div>}
              </div>
              <div className="cli-phone-row">
                <input className="phone-inp" placeholder="Teléfono (ej: 04141234567)"
                  defaultValue={clientPhones[c.nombre] || ''}
                  onBlur={e => { if (e.target.value !== (clientPhones[c.nombre] || '')) savePhone(c.nombre, e.target.value); }} />
                <button className="wa-btn" disabled={!clientPhones[c.nombre]} onClick={() => sendWA(c.nombre, c.pendiente)}>
                  📱 WA
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Modal */}
      {bulkOpen && deudores.length > 0 && (
        <div className="overlay open">
          <div className="modal modal-lg">
            <div className="bulk-header-band">
              <h3>📱 Envío Masivo WhatsApp</h3>
              <p>{bulkIdx + 1} de {deudores.length} clientes con saldo</p>
              <div className="bulk-progress"><div className="bulk-prog-fill" style={{ width: `${(bulkIdx / deudores.length) * 100}%` }}></div></div>
            </div>
            {bulkIdx < deudores.length ? (
              <div className="modal-body">
                <div className="bulk-cli-card">
                  <div className="bulk-cli-nm">
                    <span className="pay-av" style={{ background: colorFor(deudores[bulkIdx].nombre), width: 34, height: 34, fontSize: '.88rem' }}>
                      {initials(deudores[bulkIdx].nombre)}
                    </span>
                    {deudores[bulkIdx].nombre}
                  </div>
                  <div className="bulk-amt">⏳ Pendiente: {fmt$(deudores[bulkIdx].pendiente)}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Mensaje (editable):</div>
                  <textarea className="tmpl-ta" style={{ minHeight: 100 }} value={editBulkMsg} onChange={e => setEditBulkMsg(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="wa-send-btn" onClick={bulkSend}>📱 Abrir en WhatsApp</button>
                  <button className="skip-btn" onClick={bulkSkip}>⏭ Saltar</button>
                  <button className="skip-btn" style={{ color: 'var(--red)', borderColor: '#fde8e6' }} onClick={() => setBulkOpen(false)}>✕ Parar</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 26px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🎉</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--jade)', marginBottom: 8 }}>¡Envío completado!</div>
                <div style={{ color: 'var(--text-2)', marginBottom: 22 }}>Enviados: {bulkSent} · Saltados: {bulkSkipped}</div>
                <button className="btn btn-primary" onClick={() => setBulkOpen(false)}>✓ Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
