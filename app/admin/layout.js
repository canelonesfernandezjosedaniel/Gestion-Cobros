'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import FabActions from '@/components/ui/FabActions';

export default function AdminLayout({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 30% 50%, #1a0508 0%, #07080e 100%)',
        color: '#fff', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>Ventas Canelones</div>
        <div className="spinner" style={{ borderTopColor: '#c41d2e' }}></div>
      </div>
    );
  }

  if (user === null) return null;

  return (
    <AppProvider>
      <ToastProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
               className="main-content">
            <Topbar onMenuClick={() => setMobileOpen(o => !o)} />
            <div style={{ padding: '28px 32px', flex: 1 }} className="content">
              {children}
            </div>
          </div>
        </div>
        <FabActions />
        <style jsx global>{`
          @media(max-width:768px){
            .main-content { margin-left: 0 !important; }
            .content { padding: 16px !important; }
          }
          .sidebar {
            position:fixed; top:0; left:0; height:100vh; width:var(--sidebar-w);
            background:var(--sidebar-bg); color:#c8cadc; display:flex; flex-direction:column;
            z-index:200; transition:transform .2s cubic-bezier(.4,0,.2,1);
            border-right:1px solid rgba(255,255,255,.05);
          }
          .sidebar::after {
            content:''; position:absolute; top:0; right:0; width:1px; height:100%;
            background:linear-gradient(180deg,transparent 0%,var(--vermilion) 35%,var(--gold) 65%,transparent 100%);
            opacity:.35;
          }
          @media(max-width:768px){ .sidebar{ transform:translateX(-100%); } .sidebar.open{ transform:translateX(0); } }
          .sidebar-logo { padding:22px 18px 16px; border-bottom:1px solid rgba(255,255,255,.06); }
          .sidebar-rate { padding:14px 18px; border-bottom:1px solid rgba(255,255,255,.06); }
          .nav-group { padding:12px 10px; flex:1; overflow-y:auto; }
          .nav-group::-webkit-scrollbar { width:3px; }
          .nav-group::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
          .nav-label {
            font-size:.6rem; font-weight:700; color:rgba(255,255,255,.25);
            text-transform:uppercase; letter-spacing:1.2px; padding:0 8px;
            margin-bottom:6px; margin-top:4px;
          }
          .nav-item {
            display:flex; align-items:center; gap:9px; padding:9px 10px;
            border-radius:8px; cursor:pointer; font-size:.84rem; font-weight:500;
            color:rgba(255,255,255,.45); transition:all .18s; margin-bottom:2px;
            text-decoration:none; position:relative; overflow:hidden;
          }
          .nav-icon { font-size:.95rem; width:20px; text-align:center; flex-shrink:0; }
          .nav-badge {
            margin-left:auto; background:var(--vermilion); color:#fff;
            border-radius:10px; font-size:.62rem; font-weight:700; padding:2px 7px; min-width:18px; text-align:center;
          }
          .nav-item:hover { background:rgba(255,255,255,.07); color:rgba(255,255,255,.9); }
          .nav-item.active { background:rgba(196,29,46,.15); color:#fff; font-weight:600; }
          .nav-item.active::before {
            content:''; position:absolute; left:0; top:20%; bottom:20%;
            width:3px; background:var(--vermilion); border-radius:0 2px 2px 0;
          }
          .sidebar-footer { padding:12px 12px 16px; border-top:1px solid rgba(255,255,255,.06); }
          .db-status { display:flex; align-items:center; gap:7px; margin-bottom:4px; }
          .db-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
          .db-dot.connected { background:#22c55e; box-shadow:0 0 6px rgba(34,197,94,.5); }
          .db-dot.error { background:var(--vermilion); }
          .db-dot.offline { background:rgba(255,255,255,.25); }
          .topbar {
            background:#fff; border-bottom:1px solid var(--border);
            padding:0 28px; height:60px;
            display:flex; align-items:center; gap:14px; position:sticky; top:0; z-index:100;
            box-shadow:0 1px 0 var(--border), 0 4px 16px rgba(13,15,26,.05);
          }
          .topbar::after {
            content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
            background:linear-gradient(90deg,var(--vermilion) 0%,var(--gold) 40%,transparent 70%);
            opacity:.25;
          }
          .hamburger { display:none; background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-2); padding:6px; border-radius:6px; }
          @media(max-width:768px){ .hamburger { display:flex; } }
          .topbar-title {
            font-family:var(--font-display); font-size:1.15rem; font-weight:700;
            color:var(--ink); letter-spacing:.2px;
          }
          .topbar-rate {
            background:var(--gold-pale); border:1px solid var(--gold-light);
            border-radius:22px; padding:6px 14px; font-size:.82rem; font-weight:700;
            color:var(--gold); display:flex; align-items:center; gap:7px;
          }
        `}</style>
      </ToastProvider>
    </AppProvider>
  );
}
