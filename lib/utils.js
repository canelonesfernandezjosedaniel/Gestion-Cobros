export const fmt$ = n => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtBs = n => (n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = d => { if (!d) return ''; const [y, m, dy] = d.split('-'); return `${dy}/${m}/${y}`; };

export const getQ = fecha => {
  if (!fecha) return '';
  const d = new Date(fecha + 'T12:00:00');
  const ms = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return d.getDate() <= 15
    ? `${ms[d.getMonth()]} 1-15 ${d.getFullYear()}`
    : `${ms[d.getMonth()]} 16-31 ${d.getFullYear()}`;
};

export const initials = s => s.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const colorFor = s => {
  const cs = ['#1a3d2b','#0d47a1','#4a148c','#b71c1c','#e65100','#006064','#1a237e','#33691e','#37474f','#4e342e'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
};

export const toBs = (usd, eurRate) => eurRate > 0 ? usd * eurRate : null;
export const fmtBsAmt = (usd, eurRate) => {
  const b = toBs(usd, eurRate);
  return b !== null ? 'Bs ' + fmtBs(b) : '—';
};

// Recibe records como parámetro (no usa variables globales)
export function getClientStats(records) {
  const s = {};
  records.forEach(r => {
    if (r.status === 'Presupuesto') return;
    if (!s[r.cliente]) s[r.cliente] = { total: 0, pagado: 0, compras: 0, ultima: '' };
    s[r.cliente].total += r.total;
    if (r.status === 'Pagado') s[r.cliente].pagado += r.total;
    s[r.cliente].compras++;
    if (r.fecha > s[r.cliente].ultima) s[r.cliente].ultima = r.fecha;
  });
  return s;
}

export function buildMsg(template, nombre, stats, pendiente, eurRate) {
  const bs = eurRate > 0 ? 'Bs ' + fmtBs(pendiente * eurRate) : '';
  const tasa = eurRate > 0 ? eurRate.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '—';
  return template
    .replace(/{nombre}/g, nombre)
    .replace(/{pendiente_usd}/g, fmt$(pendiente))
    .replace(/{pendiente_bs}/g, bs)
    .replace(/{tasa}/g, tasa)
    .replace(/{compras}/g, stats?.compras || 0)
    .replace(/{ultima_compra}/g, stats?.ultima ? fmtDate(stats.ultima) : '—');
}

export function getProductStats(records, inventory) {
  const stats = {};
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  records.forEach(r => {
    if (r.status === 'Presupuesto') return;
    if (!r.producto) return;
    if (!stats[r.producto]) stats[r.producto] = { ventas: 0, total: 0, recientes: 0 };
    stats[r.producto].ventas += r.cantidad;
    stats[r.producto].total += r.total;
    if (r.fecha >= thirtyDaysAgo) stats[r.producto].recientes += r.cantidad;
  });

  // Calcular velocidad (unidades/día en últimos 30 días) y días restantes
  Object.keys(stats).forEach(nombre => {
    const velocity = stats[nombre].recientes / 30;
    stats[nombre].velocity = velocity;
    const stock = inventory[nombre]?.stock ?? 0;
    stats[nombre].daysLeft = velocity > 0 ? Math.floor(stock / velocity) : null;
  });

  return stats;
}
