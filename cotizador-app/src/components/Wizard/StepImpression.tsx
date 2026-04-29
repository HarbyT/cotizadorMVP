import React from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';

type PrintFormat = '1x0' | '1x1' | '2x0' | '2x2' | '4x0' | '4x1' | '4x4' | 'Manual';

export const StepImpression: React.FC = () => {
  const wizard = useWizardStore();
  const { machines, inks, plates } = useDBStore();

  return (
    <div className="animate-fade-in">
      <h2>Paso 3: Impresion y Tinta</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Asigna la maquina, la logica de impresion y los forzadores operativos antes de compilar la cotizacion.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '2rem',
          background: 'white',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={wizard.sellMachineProcess}
              onChange={(event) => wizard.updateField('sellMachineProcess', event.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            Cobrar Proceso de Maquina
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Si se desactiva, el costo de maquina quedara en $0.
          </p>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={wizard.sellInkProcess}
              onChange={(event) => wizard.updateField('sellInkProcess', event.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            Cobrar Consumo de Tintas
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Si se desactiva, el costo de tintas quedara en $0.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem' }}>
        <div className="input-group">
          <label className="input-label">Maquina</label>
          <select
            className="input-field"
            value={wizard.selectedMachineId || ''}
            onChange={(event) => wizard.updateField('selectedMachineId', event.target.value || null)}
          >
            <option value="" disabled>
              Seleccione maquina
            </option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name} ({machine.technology})
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-primary)' }}>
            $ Especial Maquina / unidad operativa
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Usa Tarifa BD"
            value={wizard.strategicMachinePrice === null ? '' : wizard.strategicMachinePrice}
            onChange={(event) =>
              wizard.updateField('strategicMachinePrice', event.target.value ? Number(event.target.value) : null)
            }
          />
        </div>

        <div className="input-group">
          <label className="input-label">Tipo de Tinta</label>
          <select
            className="input-field"
            value={wizard.selectedInkId || ''}
            onChange={(event) => wizard.updateField('selectedInkId', event.target.value || null)}
          >
            <option value="" disabled>
              Seleccione tinta
            </option>
            {inks.map((ink) => (
              <option key={ink.id} value={ink.id}>
                {ink.type} - Base ${ink.baseCost}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-primary)' }}>
            $ Especial Base Tinta
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Usa Tarifa de Sistema"
            value={wizard.strategicInkPrice === null ? '' : wizard.strategicInkPrice}
            onChange={(event) => wizard.updateField('strategicInkPrice', event.target.value ? Number(event.target.value) : null)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Tipo de Plancha / Preprensa</label>
          <select
            className="input-field"
            value={wizard.selectedPlateId || ''}
            onChange={(event) => wizard.updateField('selectedPlateId', event.target.value || null)}
          >
            <option value="" disabled>
              Seleccione plancha
            </option>
            {plates.map((plate) => (
              <option key={plate.id} value={plate.id}>
                {plate.name} - ${plate.baseCost}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-primary)' }}>
            $ Especial Plancha
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Usa Tarifa de Sistema"
            value={wizard.strategicPlatePrice === null ? '' : wizard.strategicPlatePrice}
            onChange={(event) => wizard.updateField('strategicPlatePrice', event.target.value ? Number(event.target.value) : null)}
          />
        </div>

        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
          <hr style={{ borderColor: 'var(--border-color)', opacity: 0.5 }} />
        </div>

        <div className="input-group">
          <label className="input-label">Formato de Caras</label>
          <select
            className="input-field"
            value={wizard.printFormat || 'Manual'}
            onChange={(event) => {
              const value = event.target.value as PrintFormat;
              wizard.updateField('printFormat', value);

              if (value === '1x0') wizard.updateField('numberOfInks', 1);
              else if (value === '1x1') wizard.updateField('numberOfInks', 2);
              else if (value === '2x0') wizard.updateField('numberOfInks', 2);
              else if (value === '2x2') wizard.updateField('numberOfInks', 4);
              else if (value === '4x0') wizard.updateField('numberOfInks', 4);
              else if (value === '4x1') wizard.updateField('numberOfInks', 5);
              else if (value === '4x4') wizard.updateField('numberOfInks', 8);
            }}
          >
            <option value="Manual">Manual (Escoger Tintas)</option>
            <option value="1x0">1x0 (Tiro)</option>
            <option value="1x1">1x1 (Tiro y Retiro)</option>
            <option value="2x0">2x0 (Tiro)</option>
            <option value="2x2">2x2 (Tiro y Retiro)</option>
            <option value="4x0">4x0 (Tiro - Policromia)</option>
            <option value="4x1">4x1 (Tiro y Retiro)</option>
            <option value="4x4">4x4 (Tiro y Retiro - Policromia)</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Amplificador de Tintas</label>
          <input
            type="number"
            className="input-field"
            min="0"
            max="20"
            disabled={wizard.printFormat !== 'Manual'}
            value={wizard.numberOfInks}
            onChange={(event) => wizard.updateField('numberOfInks', parseInt(event.target.value, 10) || 0)}
          />
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-accent)' }}>
            Forzar Pases/Colores
          </label>
          <input
            type="number"
            className="input-field"
            min="1"
            placeholder="Auto por maquina/formato"
            value={wizard.forcePassesOrColors === null ? '' : wizard.forcePassesOrColors}
            onChange={(event) =>
              wizard.updateField('forcePassesOrColors', event.target.value ? Number(event.target.value) : null)
            }
          />
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-accent)' }}>
            Forzar Costo Maquina
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Total proceso maquina"
            value={wizard.forceMachineCost === null ? '' : wizard.forceMachineCost}
            onChange={(event) => wizard.updateField('forceMachineCost', event.target.value ? Number(event.target.value) : null)}
          />
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-accent)' }}>
            Forzar Costo Planchas
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Total planchas"
            value={wizard.forcePlatesCost === null ? '' : wizard.forcePlatesCost}
            onChange={(event) => wizard.updateField('forcePlatesCost', event.target.value ? Number(event.target.value) : null)}
          />
        </div>

        <div className="input-group">
          <label className="input-label" style={{ color: 'var(--color-accent)' }}>
            Forzar Costo Tintas
          </label>
          <input
            type="number"
            className="input-field"
            min="0"
            placeholder="Total tintas"
            value={wizard.forceInkCost === null ? '' : wizard.forceInkCost}
            onChange={(event) => wizard.updateField('forceInkCost', event.target.value ? Number(event.target.value) : null)}
          />
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: 'var(--bg-surface-hover)',
          borderRadius: 'var(--radius-md)',
          marginTop: '2rem',
          borderLeft: '4px solid var(--color-accent)',
        }}
      >
        <h4 style={{ marginBottom: '0.5rem' }}>Informacion de Cobro de la Maquina</h4>
        {wizard.selectedMachineId ? (
          (() => {
            const machine = machines.find((entry) => entry.id === wizard.selectedMachineId);
            if (!machine) return null;

            return (
              <div style={{ fontSize: '0.9rem' }}>
                <p>
                  <strong>Preparacion:</strong> ${machine.setupCost.toLocaleString('es-CO')}
                </p>
                <p>
                  <strong>Variable:</strong> ${machine.variableCost.toLocaleString('es-CO')}{' '}
                  {machine.technology === 'Gran Formato' ? 'por unidad operativa' : 'por millar operativo'}
                </p>
              </div>
            );
          })()
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Seleccione una maquina para ver detalles de su operacion.
          </p>
        )}
      </div>
    </div>
  );
};
