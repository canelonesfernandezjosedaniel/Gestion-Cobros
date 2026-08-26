'use client';
import { useState } from 'react';

const NEW_KEY = '__nuevo__';

export default function ClienteSelect({ value, onChange, clientes = [], placeholder = '— Seleccionar cliente —' }) {
  const [isNew, setIsNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const handleSelect = e => {
    if (e.target.value === NEW_KEY) {
      setIsNew(true);
      setNuevoNombre('');
      onChange('');
    } else {
      setIsNew(false);
      onChange(e.target.value);
    }
  };

  const handleNuevoChange = e => {
    setNuevoNombre(e.target.value);
    onChange(e.target.value);
  };

  const handleCancel = () => {
    setIsNew(false);
    setNuevoNombre('');
    onChange('');
  };

  if (isNew) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="form-inp"
          type="text"
          value={nuevoNombre}
          onChange={handleNuevoChange}
          placeholder="Nombre del nuevo cliente"
          autoFocus
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
            background: 'none', cursor: 'pointer', color: 'var(--text-2)',
            fontFamily: 'var(--font-body)', fontSize: '.82rem', whiteSpace: 'nowrap',
          }}
        >✕ Cancelar</button>
      </div>
    );
  }

  return (
    <select className="form-inp" value={value} onChange={handleSelect}>
      <option value="">{placeholder}</option>
      <option value={NEW_KEY}>➕ Nuevo cliente...</option>
      {clientes.length > 0 && <option disabled>──────────────</option>}
      {clientes.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
