// Cliente de Supabase (listo para implementar).
//
// TODO: cuando el proyecto de Supabase esté creado:
//   1. Definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
//      (ver .env.example).
//   2. Aplicar la migration de supabase/migrations/ (esquema documentado en
//      supabase/README.md: tablas ventas, pagos, clientes, app_config con RLS).
//   3. Reemplazar las funciones stub de lib/db.js por queries reales a Supabase
//      usando este cliente.
//   4. Reemplazar el stub de auth en context/AuthContext.js por
//      supabase.auth.signInWithPassword / signInWithOAuth / onAuthStateChange / signOut.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local. ' +
    'El cliente de Supabase no funcionará hasta configurarlas.'
  );
}

// Nota: se crea igual aunque falten las env vars para no romper el build;
// las llamadas fallarán en tiempo de ejecución con un error claro hasta configurar.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
