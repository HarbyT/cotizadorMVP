import React from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { IVA_RATE } from '../../utils/financial';

export const StepFinancial: React.FC = () => {
  const wizard = useWizardStore();
  const quantity = Math.max(1, wizard.quantity || 1);

  const displayedTotalPrice =
    wizard.customSalePrice === null
      ? ''
      : wizard.includeIva && wizard.manualPriceIncludesIva
        ? Number((wizard.customSalePrice * (1 + IVA_RATE)).toFixed(2))
        : wizard.customSalePrice;

  const displayedUnitPrice =
    wizard.customSalePrice === null
      ? ''
      : wizard.includeIva && wizard.manualPriceIncludesIva
        ? Number(((wizard.customSalePrice * (1 + IVA_RATE)) / quantity).toFixed(2))
        : Number((wizard.customSalePrice / quantity).toFixed(2));

  const updateManualTotal = (rawValue: string) => {
    if (rawValue === '') {
      wizard.updateField('customSalePrice', null);
      return;
    }

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const netValue = wizard.includeIva && wizard.manualPriceIncludesIva ? parsed / (1 + IVA_RATE) : parsed;
    wizard.updateField('customSalePrice', netValue);
  };

  const updateManualUnit = (rawValue: string) => {
    if (rawValue === '') {
      wizard.updateField('customSalePrice', null);
      return;
    }

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const totalFromUnit = parsed * quantity;
    const netValue = wizard.includeIva && wizard.manualPriceIncludesIva ? totalFromUnit / (1 + IVA_RATE) : totalFromUnit;
    wizard.updateField('customSalePrice', netValue);
  };

  return (
    <div className="animate-fade-in">
      <h2>Paso 5: Simulador Financiero e Ingenieria Inversa</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Controla la utilidad sobre costo base, define si la cotizacion sale con IVA 19% y, si lo necesitas, fuerza el precio final manual.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '760px' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Utilidad Objetivo sobre Costo Base</h3>
          <div className="input-group">
            <label className="input-label">Utilidad Objetivo (%)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="range"
                min="-0.5"
                max="2"
                step="0.01"
                style={{ flex: 1 }}
                value={wizard.targetMargin}
                onChange={(event) => {
                  wizard.updateField('targetMargin', parseFloat(event.target.value));
                  wizard.updateField('customSalePrice', null);
                }}
              />
              <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right' }}>{(wizard.targetMargin * 100).toFixed(0)}%</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Este porcentaje ahora se calcula como Utilidad/Costo Base para que la rentabilidad quede exacta.
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-accent)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tratamiento de IVA (19%)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={wizard.includeIva}
                onChange={() => wizard.updateField('includeIva', true)}
              />
              Agregar IVA 19%
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={!wizard.includeIva}
                onChange={() => {
                  wizard.updateField('includeIva', false);
                  wizard.updateField('manualPriceIncludesIva', false);
                }}
              />
              Cotizar sin IVA
            </label>
          </div>

          {wizard.includeIva && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.9rem' }}>
              <input
                type="checkbox"
                checked={wizard.manualPriceIncludesIva}
                onChange={(event) => wizard.updateField('manualPriceIncludesIva', event.target.checked)}
              />
              El precio manual que ingreso ya viene con IVA incluido
            </label>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-warning)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Ajuste Manual de Precio</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Precio Total de Venta</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.75rem',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Total Global"
                  value={displayedTotalPrice}
                  onChange={(event) => updateManualTotal(event.target.value)}
                  style={{ flex: 1, fontWeight: 'bold' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Precio Unitario Promedio</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.75rem',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Valor Unitario"
                  value={displayedUnitPrice}
                  onChange={(event) => updateManualUnit(event.target.value)}
                  style={{ flex: 1, fontWeight: 'bold' }}
                />
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: '1.5' }}>
            Puedes forzar el valor de venta por unidad o total. El resumen lateral mostrara la utilidad real sobre costo base y los totales con o sin IVA, segun tu seleccion.
          </p>
        </div>
      </div>
    </div>
  );
};
