// db.js
// Capa de acceso a datos REAL — Migrada a Supabase.
import { supabase } from './supabase'; // Asegúrate de que la ruta apunte a tu cliente de Supabase 

const TABLES = { clientes_config: 'clientes' };

function tableName(colName) {
return TABLES[colName] || colName;
}

/** 

* Obtiene todos los registros de una tabla.
* @param {string} colName - Nombre de la tabla en Supabase.
*/
export async function fbGetAll(colName) {
const table = tableName(colName);
const { data, error } = await supabase
.from(table)
.select('*');

if (error) {
console.error(`[db] Error en fbGetAll para '${colName}':`, error.message);
return [];
}
return data;
} 

/** 

* Obtiene un único registro por su ID.
* @param {string} colName - Nombre de la tabla.
* @param {string|number} docId - ID del registro.
*/
export async function fbGetDoc(colName, docId) {
const table = tableName(colName);
const column = table === 'app_config' ? 'key' : 'id';
const { data, error } = await supabase
.from(table)
.select('*')
.eq(column, docId)
.single(); // .single() devuelve un objeto directo en lugar de un array

if (error) {
console.error(`[db] Error en fbGetDoc para '${colName}/${docId}':`, error.message);
return null;
}
return data;
} 

/** 

* Inserta un nuevo registro (Genera un nuevo ID automáticamente en Supabase).
* @param {string} colName - Nombre de la tabla.
* @param {Object} data - Datos a insertar.
*/
export async function fbAdd(colName, data) {
const table = tableName(colName);
const { data: insertedData, error } = await supabase
.from(table)
.insert([data])
.select()
.single();

if (error) {
console.error(`[db] Error en fbAdd para '${colName}':`, error.message);
return null;
}
return insertedData;
} 

/** 

* Inserta o reemplaza un registro especificando un ID (Upsert).
* @param {string} colName - Nombre de la tabla.
* @param {string|number} docId - ID del registro.
* @param {Object} data - Datos a guardar.
*/
export async function fbSet(colName, docId, data) {
const table = tableName(colName);
const payload = table === 'app_config'
? { key: docId, value: data.value ?? '' }
: table === 'clientes'
? { ...data, nombre: data.nombre || docId }
: { id: docId, ...data };
const { error } = await supabase
.from(table)
.upsert(payload);

if (error) {
console.error(`[db] Error en fbSet para '${colName}/${docId}':`, error.message);
}
} 

/** 

* Actualiza parcialmente los campos de un registro existente.
* @param {string} colName - Nombre de la tabla.
* @param {string|number} docId - ID del registro.
* @param {Object} data - Campos a actualizar.
*/
export async function fbUpdate(colName, docId, data) {
const table = tableName(colName);
const column = table === 'app_config' ? 'key' : 'id';
const { error } = await supabase
.from(table)
.update(data)
.eq(column, docId);

if (error) {
console.error(`[db] Error en fbUpdate para '${colName}/${docId}':`, error.message);
}
} 

/** 

* Elimina un registro por su ID.
* @param {string} colName - Nombre de la tabla.
* @param {string|number} docId - ID del registro.
*/
export async function fbDelete(colName, docId) {
const table = tableName(colName);
const column = table === 'app_config' ? 'key' : 'id';
const { error } = await supabase
.from(table)
.delete()
.eq(column, docId);

if (error) {
console.error(`[db] Error en fbDelete para '${colName}/${docId}':`, error.message);
}
} 

/** 

* Inserta múltiples registros en bloque (Batch).
* @param {string} colName - Nombre de la tabla.
* @param {Array} items - Lista de objetos a insertar.
*/
export async function fbBatchSet(colName, items) {
if (!items || items.length === 0) return;

const table = tableName(colName);
const { error } = await supabase
.from(table)
.insert(items); 

if (error) {
console.error(`[db] Error en fbBatchSet para '${colName}':`, error.message);
}
} 

/** 

* Carga las ventas ordenadas de forma descendente por fecha (útil para gráficos y listas).
*/
export async function loadVentas() {
const { data, error } = await supabase
.from('ventas')
.select('*')
.order('fecha', { ascending: false });

if (error) {
console.error("[db] Error en loadVentas:", error.message);
return [];
}
return data;
} 

/** 

* Carga la configuración global de la aplicación.
*/
export async function loadAppConfig() {
const { data, error } = await supabase
.from('app_config')
.select('key, value');

if (error) {
console.error("[db] Error en loadAppConfig:", error.message);
return {};
} 

return (data || []).reduce((config, row) => {
config[row.key] = row.value;
return config;
}, {});
}
