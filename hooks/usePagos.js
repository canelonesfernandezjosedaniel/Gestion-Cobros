'use client';
import { useApp } from '@/context/AppContext';
import { getClientStats, fmt$ } from '@/lib/utils';

export function usePagos() {
  const { records, setRecords, payments, setPayments, eurRate, fbAdd, fbUpdate } = useApp();

  const confirmPayment = async ({ name, amount, note }) => {
    if (!name || amount <= 0) throw new Error('Datos inválidos');

    let toPay = parseFloat(amount);
    let updatedRecords = records.map(r => ({ ...r }));

    // FIFO: ventas "Debe" del cliente ordenadas por fecha (más antigua primero)
    const debeRecs = updatedRecords
      .filter(r => r.cliente === name && r.status === 'Debe')
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    for (const r of debeRecs) {
      if (toPay <= 0.001) break;

      if (toPay >= r.total - 0.001) {
        // Pago cubre esta venta completa
        r.status = 'Pagado';
        if (r._fbId) await fbUpdate('ventas', r._fbId, { status: 'Pagado' }).catch(() => {});
        toPay -= r.total;
      } else {
        // Pago parcial: split el record
        const paid = parseFloat(toPay.toFixed(2));
        const due = parseFloat((r.total - paid).toFixed(2));
        const paidQty = parseFloat((paid / r.precio).toFixed(4));
        const dueQty = parseFloat((due / r.precio).toFixed(4));

        // El record original queda con la parte pagada
        r.total = paid;
        r.cantidad = paidQty;
        r.status = 'Pagado';
        if (r._fbId) await fbUpdate('ventas', r._fbId, { total: paid, cantidad: paidQty, status: 'Pagado' }).catch(() => {});

        // Crear nuevo record con la parte que debe
        const newRec = {
          fecha: r.fecha, cliente: r.cliente, producto: r.producto,
          precio: r.precio, cantidad: dueQty, total: due, status: 'Debe',
        };
        const _fbId = await fbAdd('ventas', newRec).catch(() => null);
        updatedRecords.push({ ...newRec, id: Date.now() + Math.random(), _fbId });
        toPay = 0;
      }
    }

    setRecords(updatedRecords);

    // Registrar el pago
    const payLog = {
      fecha: new Date().toISOString().slice(0, 10),
      cliente: name,
      monto_usd: parseFloat(amount),
      monto_bs: eurRate > 0 ? parseFloat((amount * eurRate).toFixed(2)) : 0,
      tasa: eurRate || 0,
      nota: note || '',
    };
    const payId = await fbAdd('pagos', payLog).catch(() => null);
    setPayments(prev => [...prev, {
      id: payId, date: payLog.fecha, client: payLog.cliente,
      amount: payLog.monto_usd, amountBs: payLog.monto_bs,
      rate: payLog.tasa, note: payLog.nota,
    }]);

    return { paid: parseFloat(amount), remaining: Math.max(0, toPay) };
  };

  const getClientDebt = (name) => {
    const stats = getClientStats(records);
    const s = stats[name];
    if (!s) return 0;
    return Math.max(0, s.total - s.pagado);
  };

  const getClientPayments = (name) =>
    payments.filter(p => p.client === name)
      .sort((a, b) => b.date?.localeCompare(a.date || '') || 0)
      .slice(0, 5);

  return { confirmPayment, getClientDebt, getClientPayments };
}
