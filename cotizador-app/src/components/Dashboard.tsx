import React from 'react';
import { useDBStore } from '../store/dbStore';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import { IVA_RATE } from '../utils/financial';

export const Dashboard: React.FC<{ onNewQuote: () => void }> = ({ onNewQuote }) => {
    const quotes = useDBStore(state => state.quotes) || [];
    const resolveDisplayTotal = (subtotal: number, includeIva: boolean) =>
        Math.round(includeIva ? subtotal * (1 + IVA_RATE) : subtotal).toLocaleString('es-CO');

    return (
        <div className="app-container animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Tablero Principal</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Resumen de cotizaciones e histórico de actividad.</p>
                </div>
                <button className="btn btn-primary" onClick={onNewQuote} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <FileText size={18} /> Nueva Cotización (V1)
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '1rem', borderRadius: '12px' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Histórico</p>
                        <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{quotes.length}</h3>
                    </div>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fef3c7', color: '#4f46e5', padding: '1rem', borderRadius: '12px' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>En Seguimiento</p>
                        <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{quotes.filter(q => q.status === 'En Seguimiento').length}</h3>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#dcfce7', color: '#b45309', padding: '1rem', borderRadius: '12px' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aprobadas</p>
                        <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{quotes.filter(q => q.status === 'Aprobada').length}</h3>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Últimas Cotizaciones</h3>
                {quotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No hay cotizaciones guardadas todavía.</p>
                        <button className="btn btn-outline" onClick={onNewQuote}>Comenzar a cotizar</button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem', fontWeight: 500 }}>ID</th>
                                <th style={{ padding: '1rem', fontWeight: 500 }}>Fecha</th>
                                <th style={{ padding: '1rem', fontWeight: 500 }}>Cliente</th>
                                <th style={{ padding: '1rem', fontWeight: 500 }}>Total Bruto</th>
                                <th style={{ padding: '1rem', fontWeight: 500 }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.slice(0, 10).map((q) => {
                                const includeIva = q.items?.[0]?.specs?.pricingSnapshot?.includeIva ?? true;

                                return (
                                    <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{q.id}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {new Date(q.date).toLocaleDateString('es-CO')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{q.clientName}</td>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>${resolveDisplayTotal(q.subtotal, includeIva)} COP</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '99px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: 600,
                                                background: q.status === 'Aprobada' ? '#dcfce7' : '#fef3c7',
                                                color: q.status === 'Aprobada' ? '#166534' : '#92400e'
                                            }}>
                                                {q.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
