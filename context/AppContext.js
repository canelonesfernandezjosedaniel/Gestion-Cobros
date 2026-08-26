'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadVentas, fbGetAll, fbSet, fbAdd, fbUpdate, fbDelete, loadAppConfig } from '@/lib/db';
import { getClientStats } from '@/lib/utils';

const AppContext = createContext(null);

const DEFAULT_TMPL = `Hola {nombre}! 🍰 Te escribimos de Emprendimiento.

Tu saldo pendiente es de *{pendiente_usd}*
💱 *{pendiente_bs}* (tasa BCV €)

¡Gracias por tu preferencia! 😊`;

export function AppProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [productCatalog, setProductCatalog] = useState({});
  const [inventory, setInventory] = useState({});
  const [invHistory, setInvHistory] = useState([]);
  const [nextShipmentChecks, setNextShipmentChecks] = useState({});
  const [clientPhones, setClientPhones] = useState({});
  const [eurRate, setEurRate] = useState(0);
  const [waTemplate, setWaTemplate] = useState(DEFAULT_TMPL);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connected' | 'offline' | 'error'

  useEffect(() => {
    loadAllData();
    fetchRate();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ventas, clientesDocs, pagosDocs, config] = await Promise.all([
        loadVentas(),
        fbGetAll('clientes_config'),
        fbGetAll('pagos'),
        loadAppConfig(),
      ]);

      setRecords(ventas.map(r => ({
        id: r.id || r._fbId,
        _fbId: r.id || r._fbId,
        fecha: r.fecha || '',
        cliente: r.cliente || '',
        producto: r.producto || '',
        precio: parseFloat(r.precio) || 0,
        cantidad: parseFloat(r.cantidad) || 0,
        total: parseFloat(r.total) || 0,
        status: r.status || 'Pagado',
      })));

      const phones = {};
      clientesDocs.forEach(d => { phones[d.nombre] = d.telefono || ''; });
      setClientPhones(phones);

      setPayments(pagosDocs.map(d => ({
        id: d.id || d._id,
        date: d.fecha,
        client: d.cliente,
        amount: parseFloat(d.monto_usd) || 0,
        amountBs: parseFloat(d.monto_bs) || 0,
        rate: parseFloat(d.tasa) || 0,
        note: d.nota || '',
      })));

      if (config.product_catalog) {
        try { setProductCatalog(JSON.parse(config.product_catalog)); } catch {}
      }
      if (config.inventory) {
        try { setInventory(JSON.parse(config.inventory)); } catch {}
      }
      if (config.inv_history) {
        try { setInvHistory(JSON.parse(config.inv_history)); } catch {}
      }
      if (config.next_shipment_checks) {
        try { setNextShipmentChecks(JSON.parse(config.next_shipment_checks)); } catch {}
      }
      if (config.wa_template) setWaTemplate(config.wa_template);

      setDbStatus('connected');
    } catch (e) {
      console.error('loadAllData error:', e);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRate = async () => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('emp_rate_cache') : null;
      if (cached) {
        const { rate, ts } = JSON.parse(cached);
        if (Date.now() - ts < 30 * 60 * 1000) { setEurRate(rate); }
      }
      const r = await fetch('https://ve.dolarapi.com/v1/euros/oficial', {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error('rate fetch failed');
      const d = await r.json();
      const rate = parseFloat(d.promedio || d.venta || d.compra || 0);
      if (rate > 0) {
        setEurRate(rate);
        if (typeof window !== 'undefined') {
          localStorage.setItem('emp_rate_cache', JSON.stringify({ rate, ts: Date.now() }));
        }
      }
    } catch {
      // mantener eurRate anterior
    }
  };

  // ── Inventario ─────────────────────────────────────────────
  const deductFromInventory = useCallback(async (producto, cantidad, cliente, fecha) => {
    setInventory(prev => {
      const updated = { ...prev };
      if (!updated[producto]) updated[producto] = { stock: 0, minStock: 3 };
      const prevStock = updated[producto].stock || 0;
      const newStock = Math.max(0, prevStock - cantidad);
      updated[producto] = { ...updated[producto], stock: newStock };

      const histEntry = {
        id: Date.now() + Math.random(),
        date: fecha || new Date().toISOString().slice(0, 10),
        producto,
        type: 'sale',
        delta: -Math.min(cantidad, prevStock),
        stockAfter: newStock,
        note: `Venta a ${cliente}`,
        cliente,
      };

      setInvHistory(ph => {
        const updatedHist = [...ph, histEntry].slice(-500);
        // Persistir en background
        const inv = updated;
        fbSet('app_config', 'inventory', { key: 'inventory', value: JSON.stringify(inv) }).catch(() => {});
        fbSet('app_config', 'inv_history', { key: 'inv_history', value: JSON.stringify(updatedHist) }).catch(() => {});
        return updatedHist;
      });

      return updated;
    });
  }, []);

  const saveInventory = useCallback(async (updated, histEntry) => {
    setInventory(updated);
    if (histEntry) {
      setInvHistory(prev => {
        const next = [...prev, histEntry].slice(-500);
        fbSet('app_config', 'inv_history', { key: 'inv_history', value: JSON.stringify(next) }).catch(() => {});
        return next;
      });
    }
    await fbSet('app_config', 'inventory', { key: 'inventory', value: JSON.stringify(updated) });
  }, []);

  const saveProductCatalog = useCallback(async updated => {
    setProductCatalog(updated);
    await fbSet('app_config', 'product_catalog', { key: 'product_catalog', value: JSON.stringify(updated) });
  }, []);

  const saveWaTemplate = useCallback(async tmpl => {
    setWaTemplate(tmpl);
    await fbSet('app_config', 'wa_template', { key: 'wa_template', value: tmpl }).catch(() => {});
  }, []);

  const saveNextShipmentChecks = useCallback(async updated => {
    setNextShipmentChecks(updated);
    await fbSet('app_config', 'next_shipment_checks', { key: 'next_shipment_checks', value: JSON.stringify(updated) }).catch(() => {});
  }, []);

  // ── Derivados ──────────────────────────────────────────────
  const lowStockCount = Object.entries(inventory)
    .filter(([, v]) => v.stock !== undefined && v.stock <= (v.minStock ?? 3)).length;

  const clientStats = getClientStats(records);

  const debtorCount = Object.values(clientStats)
    .filter(s => s.total - s.pagado > 0.01).length;

  return (
    <AppContext.Provider value={{
      records, setRecords,
      payments, setPayments,
      productCatalog, saveProductCatalog,
      inventory, saveInventory, deductFromInventory,
      invHistory,
      nextShipmentChecks, saveNextShipmentChecks,
      clientPhones, setClientPhones,
      eurRate, setEurRate, fetchRate,
      waTemplate, saveWaTemplate,
      loading, loadAllData,
      dbStatus,
      lowStockCount, debtorCount, clientStats,
      // raw firestore helpers expuestos para pagos y otras ops
      fbAdd, fbSet, fbUpdate, fbDelete,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export { DEFAULT_TMPL };
