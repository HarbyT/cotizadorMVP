import React, { useMemo } from 'react';
import type { QuoteItemGeometrySnapshot } from '../../types/database';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';
import { calculateGeometry } from '../../domain/geometryEngine';
import { calcularCabidas, calcularPliegosTotales } from '../../utils/paperCalculator';

export const StepMaterials: React.FC = () => {
  const wizard = useWizardStore();
  const { papers, machines } = useDBStore();
  const { overrideCabidas, quantity, mermaPercent, updateField } = wizard;

  const paper = papers.find((entry) => entry.id === wizard.selectedPaperId) ?? null;
  const machine = machines.find((entry) => entry.id === wizard.selectedMachineId) ?? null;
  const machineGripperMargin = machine?.gripperMargin ?? 1.5;

  const effectiveSubstrateKind = wizard.materialSubstrateKind || paper?.substrateKind || 'sheet';
  const effectiveRollPricingMode = wizard.rollPricingMode || paper?.pricingMode || 'linear_meter';
  const effectiveRollWidth = Math.max(1, wizard.rollWidthCm || paper?.rollWidthCm || paper?.formatWidth || 100);
  const effectiveGripper = Math.max(0, wizard.geometryGripperCm || machineGripperMargin);

  const legacyCalcResult = useMemo(() => {
    if (!paper || wizard.width <= 0 || wizard.height <= 0) {
      return null;
    }

    return calcularCabidas({
      anchoPieza: wizard.width,
      altoPieza: wizard.height,
      anchoPliego: paper.formatWidth,
      altoPliego: paper.formatHeight,
      pinza: machineGripperMargin,
      calle: 0.5,
      sangrado: 0,
    });
  }, [paper, wizard.width, wizard.height, machineGripperMargin]);

  const advancedCalcResult = useMemo(() => {
    if (!wizard.useAdvancedGeometry || !paper || wizard.width <= 0 || wizard.height <= 0) {
      return null;
    }

    return calculateGeometry({
      strategy: 'guillotine_2stage_mixed',
      pieceWidthCm: wizard.width,
      pieceHeightCm: wizard.height,
      quantity: wizard.quantity,
      bleedCm: wizard.geometryBleedCm,
      gapCm: wizard.geometryGapCm,
      gripperCm: effectiveGripper,
      wastePct: wizard.mermaPercent,
      allowRotation: wizard.geometryAllowRotation,
      substrateKind: effectiveSubstrateKind,
      sheetWidthCm: paper.formatWidth,
      sheetHeightCm: paper.formatHeight,
      rollWidthCm: effectiveRollWidth,
      pricingMode: effectiveRollPricingMode,
      unitCostSheet: paper.costPerSheet,
      unitCostLinearMeter: paper.costPerLinearMeter,
      unitCostSquareMeter: paper.costPerSquareMeter,
    });
  }, [
    wizard.useAdvancedGeometry,
    paper,
    wizard.width,
    wizard.height,
    wizard.quantity,
    wizard.geometryBleedCm,
    wizard.geometryGapCm,
    effectiveGripper,
    wizard.mermaPercent,
    wizard.geometryAllowRotation,
    effectiveSubstrateKind,
    effectiveRollWidth,
    effectiveRollPricingMode,
  ]);

  React.useEffect(() => {
    if (!wizard.useAdvancedGeometry) {
      if (!legacyCalcResult) {
        updateField('geometryMaterialCost', null);
        updateField('geometrySnapshot', null);
        return;
      }

      const finalCabidas = overrideCabidas !== null ? overrideCabidas : legacyCalcResult.totalCabidas;
      updateField('cabidas', finalCabidas);

      const pliegos = calcularPliegosTotales(quantity, finalCabidas, mermaPercent);
      updateField('pliegosTotales', pliegos);
      updateField('geometryMaterialCost', null);
      updateField('geometrySnapshot', null);
      return;
    }

    if (!advancedCalcResult || !paper) {
      updateField('cabidas', 0);
      updateField('pliegosTotales', 0);
      updateField('geometryMaterialCost', null);
      updateField('geometrySnapshot', null);
      return;
    }

    const engineCabidas = Math.max(0, advancedCalcResult.piecesPerSheetOrRun);
    const finalCabidas = overrideCabidas !== null ? Math.max(1, overrideCabidas) : engineCabidas;
    updateField('cabidas', finalCabidas);

    let materialCost = advancedCalcResult.materialCost;
    const materialConsumption = { ...advancedCalcResult.materialConsumption };
    let pliegosTotalesForWorkflow = 0;

    if (effectiveSubstrateKind === 'sheet') {
      const requiredSheets = calcularPliegosTotales(quantity, finalCabidas, mermaPercent);
      pliegosTotalesForWorkflow = requiredSheets;
      materialCost = requiredSheets * paper.costPerSheet;
      materialConsumption.requiredSheets = requiredSheets;
    } else {
      const requiredLinearMetersRaw = finalCabidas > 0 ? (quantity / finalCabidas) * (1 + mermaPercent) : 0;
      const requiredLinearMeters = Math.ceil(requiredLinearMetersRaw * 100) / 100;
      const consumedAreaM2 = (effectiveRollWidth * requiredLinearMeters * 100) / 10000;
      pliegosTotalesForWorkflow = requiredLinearMeters;

      if (effectiveRollPricingMode === 'square_meter') {
        materialCost = consumedAreaM2 * (paper.costPerSquareMeter || 0);
      } else {
        materialCost = requiredLinearMeters * (paper.costPerLinearMeter || 0);
      }

      materialConsumption.requiredLinearMeters = requiredLinearMeters;
      materialConsumption.consumedAreaM2 = consumedAreaM2;
    }

    updateField('pliegosTotales', pliegosTotalesForWorkflow);
    updateField('geometryMaterialCost', materialCost);

    const snapshot: QuoteItemGeometrySnapshot = {
      strategy: 'guillotine_2stage_mixed',
      substrateKind: effectiveSubstrateKind,
      pricingMode: effectiveRollPricingMode,
      layoutMode: advancedCalcResult.layoutMode,
      pieceWidthCm: wizard.width,
      pieceHeightCm: wizard.height,
      bleedCm: wizard.geometryBleedCm,
      gapCm: wizard.geometryGapCm,
      gripperCm: effectiveGripper,
      wastePct: mermaPercent,
      allowRotation: wizard.geometryAllowRotation,
      piecesPerSheetOrRun: finalCabidas,
      utilizationPct: advancedCalcResult.utilizationPct,
      usedAreaCm2: advancedCalcResult.usedAreaCm2,
      wasteAreaCm2: advancedCalcResult.wasteAreaCm2,
      materialConsumption,
      materialCost,
      cutPlan: advancedCalcResult.cutPlan,
    };

    updateField('geometrySnapshot', snapshot);
  }, [
    wizard.useAdvancedGeometry,
    legacyCalcResult,
    advancedCalcResult,
    paper,
    overrideCabidas,
    quantity,
    mermaPercent,
    effectiveSubstrateKind,
    effectiveRollPricingMode,
    effectiveRollWidth,
    effectiveGripper,
    wizard.width,
    wizard.height,
    wizard.geometryBleedCm,
    wizard.geometryGapCm,
    wizard.geometryAllowRotation,
    updateField,
  ]);

  const renderLegacyPaperGraph = () => {
    if (!legacyCalcResult || !paper) {
      return null;
    }

    const maxDrawWidth = 420;
    const maxDrawHeight = 300;

    const horizontal = paper.formatWidth >= paper.formatHeight;
    const scale = horizontal ? maxDrawWidth / paper.formatWidth : maxDrawHeight / paper.formatHeight;

    const drawnWidth = paper.formatWidth * scale;
    const drawnHeight = paper.formatHeight * scale;
    const pinzaDrawn = machineGripperMargin * scale;

    const cabidaWidthCm = legacyCalcResult.modo === 'Normal' ? wizard.width : wizard.height;
    const cabidaHeightCm = legacyCalcResult.modo === 'Normal' ? wizard.height : wizard.width;
    const cabDrawnWidth = cabidaWidthCm * scale;
    const cabDrawnHeight = cabidaHeightCm * scale;

    return (
      <div
        style={{
          marginTop: '1.5rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Mapa Geometrico Base ({paper.formatWidth}x{paper.formatHeight}cm)
        </h4>

        <div
          style={{
            width: `${drawnWidth}px`,
            height: `${drawnHeight}px`,
            background: '#fff',
            border: '2px solid #cbd5e1',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${pinzaDrawn}px`,
              background: 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
              borderBottom: '1px dashed #94a3b8',
              fontSize: '0.6rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Pinza ({machineGripperMargin.toFixed(2)} cm)
          </div>

          <div
            style={{
              position: 'absolute',
              top: `${pinzaDrawn}px`,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '2px',
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'flex-start',
              gap: '1px',
            }}
          >
            {Array.from({ length: legacyCalcResult.totalCabidas }).map((_, index) => (
              <div
                key={`legacy-piece-${index}`}
                style={{
                  width: `${Math.max(1, cabDrawnWidth - 1)}px`,
                  height: `${Math.max(1, cabDrawnHeight - 1)}px`,
                  background: 'var(--color-primary)',
                  opacity: 0.25,
                  border: '1px solid var(--color-primary)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedGeometryMap = () => {
    if (!advancedCalcResult || !paper) {
      return null;
    }

    if (effectiveSubstrateKind === 'roll') {
      const rollWidth = effectiveRollWidth;
      const maxWidth = 420;
      const scale = maxWidth / rollWidth;
      const barWidth = rollWidth * scale;
      const barHeight = 160;
      const stripeCount = Math.max(
        1,
        advancedCalcResult.cutPlan.find((step) => step.stage === 1)?.count || 1,
      );

      return (
        <div style={{ marginTop: '1rem', background: '#f8fafc', borderRadius: '8px', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Mapa Geometrico Rollo ({rollWidth.toFixed(2)} cm ancho)
          </h4>
          <div
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              margin: '0 auto',
              border: '2px solid #94a3b8',
              background: '#ffffff',
              display: 'grid',
              gridTemplateColumns: `repeat(${stripeCount}, 1fr)`,
              gap: '1px',
            }}
          >
            {Array.from({ length: stripeCount }).map((_, index) => (
              <div key={`roll-stripe-${index}`} style={{ background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.4)' }} />
            ))}
          </div>
        </div>
      );
    }

    const maxDrawWidth = 420;
    const maxDrawHeight = 300;
    const horizontal = paper.formatWidth >= paper.formatHeight;
    const scale = horizontal ? maxDrawWidth / paper.formatWidth : maxDrawHeight / paper.formatHeight;
    const drawnWidth = paper.formatWidth * scale;
    const drawnHeight = paper.formatHeight * scale;
    const pinzaDrawn = effectiveGripper * scale;

    return (
      <div style={{ marginTop: '1rem', background: '#f8fafc', borderRadius: '8px', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Mapa Geometrico Avanzado ({advancedCalcResult.layoutMode})
        </h4>

        <div
          style={{
            width: `${drawnWidth}px`,
            height: `${drawnHeight}px`,
            margin: '0 auto',
            border: '2px solid #cbd5e1',
            position: 'relative',
            background: '#fff',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${pinzaDrawn}px`,
              background: 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
              borderBottom: '1px dashed #94a3b8',
              fontSize: '0.6rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Pinza ({effectiveGripper.toFixed(2)} cm)
          </div>

          {advancedCalcResult.sections.map((section, index) => (
            <div
              key={`section-${index}`}
              style={{
                position: 'absolute',
                left: `${section.originXCm * scale}px`,
                top: `${pinzaDrawn + section.originYCm * scale}px`,
                width: `${Math.max(1, section.widthCm * scale)}px`,
                height: `${Math.max(1, section.heightCm * scale)}px`,
                border: `2px solid ${section.orientation === 'normal' ? '#2563eb' : '#f97316'}`,
                background: section.orientation === 'normal' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(249, 115, 22, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                color: '#0f172a',
                textAlign: 'center',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              {section.orientation} ({section.pieceCount})
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handlePaperChange = (paperId: string) => {
    updateField('selectedPaperId', paperId);

    const selected = papers.find((entry) => entry.id === paperId);
    if (!selected) {
      return;
    }

    updateField('materialSubstrateKind', selected.substrateKind || 'sheet');
    updateField('rollPricingMode', selected.pricingMode || 'linear_meter');
    updateField('rollWidthCm', selected.rollWidthCm || selected.formatWidth || 100);
  };

  const activeCabidas = wizard.overrideCabidas ?? (wizard.useAdvancedGeometry ? advancedCalcResult?.piecesPerSheetOrRun : legacyCalcResult?.totalCabidas) ?? 0;
  const activeAprovechamiento = wizard.useAdvancedGeometry ? advancedCalcResult?.utilizationPct : legacyCalcResult?.porcentajeAprovechamiento;
  const activeMaterialCost = wizard.useAdvancedGeometry ? wizard.geometryMaterialCost : paper ? paper.costPerSheet * wizard.pliegosTotales : 0;
  const requiredLinearMeters = wizard.geometrySnapshot?.materialConsumption.requiredLinearMeters;
  const requiredSheets = wizard.geometrySnapshot?.materialConsumption.requiredSheets;

  return (
    <div className="animate-fade-in">
      <h2>Paso 2: Materiales y Geometria de Corte</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Selecciona el sustrato y define si usaras el motor base o el modo avanzado para montajes irregulares (pliego/rollo).
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <strong>Modo avanzado de cortes</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wizard.useAdvancedGeometry}
            onChange={(event) => updateField('useAdvancedGeometry', event.target.checked)}
          />
          Activar
        </label>
      </div>

      <div className="input-group">
        <label className="input-label">Sustrato</label>
        <select className="input-field" value={wizard.selectedPaperId || ''} onChange={(event) => handlePaperChange(event.target.value)}>
          <option value="" disabled>
            Seleccione un sustrato
          </option>
          {papers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} - {entry.formatWidth}x{entry.formatHeight}cm
              {entry.substrateKind === 'roll' ? ` (Rollo ${entry.rollWidthCm || entry.formatWidth}cm)` : ` ($${entry.costPerSheet}/pliego)`}
            </option>
          ))}
        </select>
      </div>

      {wizard.useAdvancedGeometry ? (
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Tipo de sustrato</label>
            <select
              className="input-field"
              value={effectiveSubstrateKind}
              onChange={(event) => updateField('materialSubstrateKind', event.target.value as 'sheet' | 'roll')}
            >
              <option value="sheet">Pliego</option>
              <option value="roll">Rollo (Vinilo/Plastico)</option>
            </select>
          </div>

          {effectiveSubstrateKind === 'roll' && (
            <>
              <div className="input-group">
                <label className="input-label">Ancho de rollo (cm)</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  step="0.01"
                  value={wizard.rollWidthCm}
                  onChange={(event) => updateField('rollWidthCm', Number(event.target.value) || 1)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Tarifa de rollo</label>
                <select
                  className="input-field"
                  value={effectiveRollPricingMode}
                  onChange={(event) =>
                    updateField('rollPricingMode', event.target.value as 'linear_meter' | 'square_meter')
                  }
                >
                  <option value="linear_meter">Metro lineal (ML)</option>
                  <option value="square_meter">Metro cuadrado (m2)</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Sangrado (cm)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={wizard.geometryBleedCm}
              onChange={(event) => updateField('geometryBleedCm', Number(event.target.value) || 0)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Calle (cm)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={wizard.geometryGapCm}
              onChange={(event) => updateField('geometryGapCm', Number(event.target.value) || 0)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Pinza (cm)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={wizard.geometryGripperCm}
              onChange={(event) => updateField('geometryGripperCm', Number(event.target.value) || 0)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">% Merma (ej 0.05 = 5%)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={wizard.mermaPercent}
              onChange={(event) => updateField('mermaPercent', Number(event.target.value) || 0)}
            />
          </div>

          <div className="input-group" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                checked={wizard.geometryAllowRotation}
                onChange={(event) => updateField('geometryAllowRotation', event.target.checked)}
              />
              Permitir rotacion
            </label>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">% de Merma (Ej. 0.05 para 5%)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={wizard.mermaPercent}
              onChange={(event) => updateField('mermaPercent', Number(event.target.value) || 0)}
            />
          </div>
        </div>
      )}

      {(legacyCalcResult || advancedCalcResult) && (
        <div style={{ marginTop: '1.5rem', background: 'var(--bg-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{wizard.useAdvancedGeometry ? 'Resultado Motor Geometrico Avanzado' : 'Resultado Motor de Cabidas'}</span>
            <label style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={wizard.overrideCabidas !== null}
                onChange={(event) => {
                  if (event.target.checked) {
                    updateField('overrideCabidas', Math.max(1, Math.floor(activeCabidas || 1)));
                    return;
                  }

                  updateField('overrideCabidas', null);
                }}
              />
              Ajuste Geometrico Manual
            </label>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cabidas utiles</div>
              {wizard.overrideCabidas === null ? (
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{Math.floor(activeCabidas)} pzs</div>
              ) : (
                <input
                  type="number"
                  className="input-field"
                  style={{ fontSize: '1.2rem', padding: '0.2rem 0.5rem', width: '90px', fontWeight: 'bold' }}
                  value={wizard.overrideCabidas}
                  onChange={(event) => updateField('overrideCabidas', Number(event.target.value) || 1)}
                />
              )}
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aprovechamiento</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: wizard.overrideCabidas === null ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                {wizard.overrideCabidas === null ? `${(activeAprovechamiento || 0).toFixed(1)}%` : 'Manual'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {effectiveSubstrateKind === 'roll' ? 'Consumo base' : 'Pliegos a comprar'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {effectiveSubstrateKind === 'roll'
                  ? `${(requiredLinearMeters || wizard.pliegosTotales || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ML`
                  : `${requiredSheets || wizard.pliegosTotales} pliegos`}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Costo material</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                ${Math.round(activeMaterialCost || 0).toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {wizard.useAdvancedGeometry && advancedCalcResult?.cutPlan.length ? (
            <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.8rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Plan de cortes (guillotina 2 etapas)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#334155' }}>
                {advancedCalcResult.cutPlan.map((step, index) => (
                  <div key={`cut-step-${index}`}>
                    {`Etapa ${step.stage} | ${step.axis} | ${step.description} | tamano ${step.sizeCm.toLocaleString('es-CO', { maximumFractionDigits: 3 })} cm | repeticiones ${step.count}`}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {wizard.useAdvancedGeometry ? renderAdvancedGeometryMap() : renderLegacyPaperGraph()}

          {wizard.overrideCabidas !== null && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong>Modo Manual Activo:</strong> Se fuerza cabidas para recalcular consumo y costo del material.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
