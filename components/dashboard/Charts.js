'use client';
import { useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getClientStats, getQ, fmt$ } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export default function Charts({ records }) {
  const { monthly, topProds, topClients, statusData } = useMemo(() => {
    const salesRecords = records.filter(r => r.status !== 'Presupuesto');

    // Ventas mensuales (últimos 6 meses)
    const byMonth = {};
    salesRecords.forEach(r => {
      const key = r.fecha?.slice(0, 7);
      if (key) byMonth[key] = (byMonth[key] || 0) + r.total;
    });
    const monthKeys = Object.keys(byMonth).sort().slice(-6);
    const monthly = {
      labels: monthKeys.map(k => { const [y, m] = k.split('-'); return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m)-1] + ' ' + y.slice(2); }),
      datasets: [{ data: monthKeys.map(k => byMonth[k]), backgroundColor: 'rgba(196,29,46,.15)', borderColor: '#c41d2e', borderWidth: 2, fill: true, tension: 0.4 }],
    };

    // Top productos
    const byProd = {};
    salesRecords.forEach(r => { if (r.producto) byProd[r.producto] = (byProd[r.producto] || 0) + r.total; });
    const topP = Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topProds = {
      labels: topP.map(([n]) => n),
      datasets: [{ data: topP.map(([, v]) => v), backgroundColor: ['#c41d2e','#b8941f','#1c5c46','#0d47a1','#4a148c','#e65100','#006064','#37474f'] }],
    };

    // Top clientes
    const stats = getClientStats(salesRecords);
    const topC = Object.entries(stats).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    const topClients = {
      labels: topC.map(([n]) => n.split(' ')[0]),
      datasets: [{ data: topC.map(([, s]) => s.total), backgroundColor: 'rgba(28,92,70,.7)' }],
    };

    // Estado cobros
    const cobrado = salesRecords.filter(r => r.status === 'Pagado').reduce((s, r) => s + r.total, 0);
    const pendiente = salesRecords.filter(r => r.status === 'Debe').reduce((s, r) => s + r.total, 0);
    const statusData = {
      labels: ['Cobrado', 'Pendiente'],
      datasets: [{ data: [cobrado, pendiente], backgroundColor: ['#1c5c46', '#c41d2e'], borderWidth: 0 }],
    };

    return { monthly, topProds, topClients, statusData };
  }, [records]);

  return (
    <>
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">📈 Ventas Mensuales</div></div>
          <div className="card-body" style={{ height: 260 }}>
            <Line data={monthly} options={{ ...CHART_OPTS, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🍰 Top Productos</div></div>
          <div className="card-body" style={{ height: 260 }}>
            <Bar data={topProds} options={{ ...CHART_OPTS, indexAxis: 'y' }} />
          </div>
        </div>
      </div>
      <div className="charts-grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">🏆 Top 10 Clientes</div></div>
          <div className="card-body" style={{ height: 240 }}>
            <Bar data={topClients} options={CHART_OPTS} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">💳 Estado de Cobros</div></div>
          <div className="card-body" style={{ height: 240 }}>
            <Doughnut data={statusData} options={{ ...CHART_OPTS, plugins: { legend: { display: true, position: 'bottom' } } }} />
          </div>
        </div>
      </div>
    </>
  );
}
