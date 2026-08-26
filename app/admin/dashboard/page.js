'use client';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import KpiGrid from '@/components/dashboard/KpiGrid';

const Charts = dynamic(() => import('@/components/dashboard/Charts'), { ssr: false });

export default function DashboardPage() {
  const { records, payments, eurRate, loading } = useApp();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <KpiGrid records={records} payments={payments} eurRate={eurRate} />
      <Charts records={records} />
    </div>
  );
}
