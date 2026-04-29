import React from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';

export const StepFinishes: React.FC = () => {
    const wizard = useWizardStore();
    const { finishes } = useDBStore();

    const handleToggleFinish = (id: string) => {
        const current = new Set(wizard.selectedFinishIds);
        if (current.has(id)) {
            current.delete(id);
        } else {
            current.add(id);
        }
        wizard.updateField('selectedFinishIds', Array.from(current));
    };

    return (
        <div className="animate-fade-in">
            <h2>Paso 4: Procesos Adicionales y Terminados</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Selecciona uno o más terminados para el trabajo. El sistema calculará el costo sumado automáticamente según el tipo de cobro.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {finishes.map(f => {
                    const isSelected = wizard.selectedFinishIds.includes(f.id);
                    return (
                        <div
                            key={f.id}
                            onClick={() => handleToggleFinish(f.id)}
                            style={{
                                padding: '1.25rem',
                                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                background: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{f.name}</span>
                                {isSelected && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Cobro por: {f.chargeType}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.5rem', color: 'var(--color-success)' }}>
                                {f.setupCost > 0 ? `Arr: $${f.setupCost.toLocaleString('es-CO')} ` : ''}
                                {f.variableCost > 0 ? `Var: $${f.variableCost.toLocaleString('es-CO')}` : ''}
                                {(f.setupCost === 0 && f.variableCost === 0) ? 'Gratuito / Incluido' : ''}
                            </div>

                            {isSelected && (
                                <div style={{ marginTop: '0.75rem', position: 'relative', zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Ajuste Manual del Total ($):</label>
                                    <input 
                                        type="number" 
                                        className="input-field" 
                                        style={{ width: '100%', padding: '0.35rem', fontSize: '0.85rem' }}
                                        placeholder="Automático..."
                                        value={wizard.strategicFinishPrices?.[f.id] ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const currentPrices = { ...(wizard.strategicFinishPrices || {}) };
                                            if (val === '') {
                                                delete currentPrices[f.id];
                                            } else {
                                                currentPrices[f.id] = Number(val);
                                            }
                                            wizard.updateField('strategicFinishPrices', currentPrices);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-base)', borderLeft: '4px solid var(--color-accent)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Nota: Los cobros fijos (Globales) se cobran una sola vez. Los cobros por Pliego o Millar se multiplicarán por la cantidad en tiempo real en la Calculadora de Costos.
                </p>
            </div>
        </div>
    );
};
