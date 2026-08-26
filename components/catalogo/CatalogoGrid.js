'use client';
import { useState, useMemo } from 'react';
import styles from '@/styles/catalogo.module.css';

export default function CatalogoGrid({ productos, eurRate }) {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const filtered = useMemo(() => {
    let list = productos;
    if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()) || (p.desc || '').toLowerCase().includes(q.toLowerCase()));
    if (filtro === 'disponible') list = list.filter(p => p.status !== 'out');
    if (filtro === 'low') list = list.filter(p => p.status === 'low');
    return list;
  }, [productos, q, filtro]);

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar producto..."
          />
        </div>
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'low', label: '⚠️ Pocas unidades' },
        ].map(f => (
          <button
            key={f.key}
            className={`${styles.filterBtn}${filtro === f.key ? ' ' + styles.active : ''}`}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
        <span className={styles.count}>{filtered.length} productos</span>
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🍰</div>
            <div>No hay productos que coincidan</div>
          </div>
        ) : filtered.map(p => {
          const precioBs = eurRate > 0 ? Math.round(p.precio * eurRate) : null;
          return (
            <div key={p.nombre} className={`${styles.card}${p.status === 'low' ? ' ' + styles.low : ''}`}>
              <div className={styles.cardBody}>
                <div className={styles.prodIcon}>🍰</div>
                <div className={styles.prodName}>{p.nombre}</div>
                {p.desc && <div className={styles.prodDesc}>{p.desc}</div>}
                <div className={styles.prices}>
                  <span className={styles.priceUsd}>${p.precio.toFixed(2)}</span>
                  {precioBs && (
                    <span className={styles.priceBs}>
                      ≈ Bs {precioBs.toLocaleString('es-VE')}
                    </span>
                  )}
                </div>
                {p.status && (
                  <span className={`${styles.stockBadge} ${p.status === 'low' ? styles.stockLow : styles.stockOk}`}>
                    {p.status === 'low' ? `⚠️ Últimas ${p.stock} unidades` : '✅ Disponible'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
