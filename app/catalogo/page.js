import { fbGetDoc } from '@/lib/db';
import CatalogoGrid from '@/components/catalogo/CatalogoGrid';
import styles from '@/styles/catalogo.module.css';

export const revalidate = 60; // revalidar cada 60 segundos

// TODO: fbGetDoc es un stub (ver lib/db.js) hasta que se implemente Supabase;
// por ahora esta página siempre mostrará el estado "catálogo vacío".
async function getCatalogoData() {
  try {
    const [catalogDoc, invDoc] = await Promise.all([
      fbGetDoc('app_config', 'product_catalog'),
      fbGetDoc('app_config', 'inventory'),
    ]);

    const catalog = catalogDoc ? JSON.parse(catalogDoc.value || '{}') : {};
    const inventory = invDoc ? JSON.parse(invDoc.value || '{}') : {};

    let eurRate = 0;
    try {
      const r = await fetch('https://ve.dolarapi.com/v1/euros/oficial', { next: { revalidate: 1800 } });
      if (r.ok) {
        const d = await r.json();
        eurRate = parseFloat(d.promedio || d.venta || d.compra || 0);
      }
    } catch {}

    return { catalog, inventory, eurRate };
  } catch (e) {
    console.error('getCatalogoData error:', e);
    return { catalog: {}, inventory: {}, eurRate: 0 };
  }
}

export default async function CatalogoPage() {
  const { catalog, inventory, eurRate } = await getCatalogoData();

  const productos = Object.entries(catalog)
    .map(([nombre, info]) => {
      const inv = inventory[nombre];
      const stock = inv?.stock ?? null;
      const minStock = inv?.minStock ?? 3;
      const status = stock === null ? null : stock <= 0 ? 'out' : stock <= minStock ? 'low' : 'ok';
      return { nombre, precio: info.precio || 0, desc: info.desc || '', stock, minStock, status };
    })
    // Solo mostrar si está en inventario Y tiene stock > 0
    .filter(p => p.precio > 0 && (p.status === 'ok' || p.status === 'low'))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoMark}>売</div>
        <div className={styles.headerText}>
          <h1>Catálogo de Productos</h1>
          <p>Repostería artesanal · Precios actualizados</p>
        </div>
      </header>

      {eurRate > 0 && (
        <div className={styles.rateBanner}>
          💱 Tasa BCV EUR/Bs:{' '}
          <strong>Bs {eurRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          <span style={{ opacity: .6, marginLeft: 4 }}>· Los precios en Bs son aproximados</span>
        </div>
      )}

      {productos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🍰</div>
          <div>El catálogo está vacío por el momento.</div>
          <div style={{ marginTop: 8, fontSize: '.85rem' }}>Vuelve pronto para ver los productos disponibles.</div>
        </div>
      ) : (
        <CatalogoGrid productos={productos} eurRate={eurRate} />
      )}

      <div className={styles.footer}>
        Impulsado por Ventas Canelones · Los precios pueden variar sin previo aviso
      </div>
    </div>
  );
}
