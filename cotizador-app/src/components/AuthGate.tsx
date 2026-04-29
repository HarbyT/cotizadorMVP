import React, { useState } from 'react';

interface AuthGateProps {
  visible: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export const AuthGate: React.FC<AuthGateProps> = ({ visible, isSubmitting, error, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
      }}
    >
      <div className="glass-panel" style={{ width: '420px', maxWidth: '92%', padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Ingreso Interno</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Inicia sesion para habilitar sincronizacion con Supabase.
        </p>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error && (
          <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => void onSubmit(email, password)}
          disabled={isSubmitting || !email || !password}
        >
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
};