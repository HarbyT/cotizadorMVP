import { useState } from 'react';
import { WizardContainer } from './components/Wizard/WizardContainer';
import { AdminPanel } from './components/AdminPanel';
import { Dashboard } from './components/Dashboard';
import { useRemoteBootstrap } from './hooks/useRemoteBootstrap';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { AuthGate } from './components/AuthGate';
import './App.css';

function App() {
  const [view, setView] = useState<'dashboard' | 'wizard' | 'admin'>('dashboard');
  const auth = useSupabaseAuth();
  const { remoteEnabled, isBootstrapping, bootstrapError } = useRemoteBootstrap(!auth.requiresAuth || auth.isAuthenticated);

  return (
    <>
      <nav
        style={{
          padding: '1rem 2rem',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{ fontSize: '1.25rem', margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setView('dashboard')}
          title="Ir al inicio"
        >
          <span style={{ color: 'var(--color-primary)' }}>COT</span> Huellas Litograficas
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className={`btn ${view === 'wizard' ? 'btn-primary' : 'btn-outline'}`}
            style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
            onClick={() => setView('wizard')}
          >
            Cotizador V1
          </button>
          <button
            className={`btn ${view === 'admin' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem' }}
            onClick={() => setView('admin')}
          >
            Base de Datos
          </button>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '999px',
              background: remoteEnabled ? '#dcfce7' : '#f3f4f6',
              color: remoteEnabled ? '#166534' : '#374151',
              border: '1px solid #d1d5db',
            }}
            title={remoteEnabled ? 'Sincronizacion cloud habilitada' : 'Sincronizacion cloud deshabilitada'}
          >
            {remoteEnabled ? 'Cloud ON' : 'Cloud OFF'}
          </span>
          {auth.isAuthenticated && (
            <button className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }} onClick={() => void auth.signOut()}>
              Salir
            </button>
          )}
        </div>
      </nav>

      {auth.isLoadingSession && (
        <div style={{ padding: '0.5rem 2rem', fontSize: '0.85rem', color: '#1e3a8a', background: '#dbeafe', borderBottom: '1px solid #bfdbfe' }}>
          Verificando sesion cloud...
        </div>
      )}

      {isBootstrapping && (
        <div style={{ padding: '0.5rem 2rem', fontSize: '0.85rem', color: '#1e3a8a', background: '#dbeafe', borderBottom: '1px solid #bfdbfe' }}>
          Cargando datos desde Supabase...
        </div>
      )}

      {bootstrapError && (
        <div style={{ padding: '0.5rem 2rem', fontSize: '0.85rem', color: '#991b1b', background: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
          No fue posible sincronizar desde cloud: {bootstrapError}
        </div>
      )}

      {view === 'dashboard' && <Dashboard onNewQuote={() => setView('wizard')} />}
      {view === 'wizard' && <WizardContainer />}
      {view === 'admin' && (
        <div className="app-container" style={{ display: 'block' }}>
          <AdminPanel />
        </div>
      )}

      <AuthGate
        visible={auth.requiresAuth && !auth.isAuthenticated && !auth.isLoadingSession}
        isSubmitting={auth.isSubmitting}
        error={auth.authError}
        onSubmit={async (email, password) => {
          await auth.signInWithPassword(email, password);
        }}
      />
    </>
  );
}

export default App;