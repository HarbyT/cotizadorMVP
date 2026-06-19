import React, { useMemo } from 'react';
import type {
  GeometryOptimizationMode,
  QuoteItemGeometrySnapshot,
  RollPricingMode,
  SubstrateKind,
} from '../../types/database';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';
import {
  applyManualGeometryOverride,
  calculateGeometry,
  type GeometryInput,
} from '../../domain/geometryEngine';
import { calcularCabidas, calcularPliegosTotales } from '../../utils/paperCalculator';
import { CutLayoutViewer } from './CutLayoutViewer';

const LAYOUT_LABELS: Record<string, string> = {
  normal: 'Orientacion original',
  rotated: 'Pieza girada 90 grados',
  mixed_vertical: 'Montaje mixto vertical',
  mixed_horizontal: 'Montaje mixto horizontal',
  not_feasible: 'No factible',
};

const OPTIMIZATION_LABELS: Record<GeometryOptimizationMode, string> = {
  best_fit: 'Maximo rendimiento',
  preserve_grain: 'Respetar fibra',
  fixed_normal: 'Orientacion original',
  fixed_rotated: 'Girar 90 grados',
};

export const StepMaterials: React.FC = () => {
  const wizard = useWizardStore();
  const { papers, machines } = useDBStore();
  const { overrideCabidas, quantity, mermaPercent, updateField } = wizard;

  const paper = papers.find((entry) => entry.id === wizard.selectedPaperId) ?? null;
  const machine = machines.find((entry) => entry.id === wizard.selectedMachineId) ?? null;
  const machineGripperMargin = machine?.gripperMargin ?? 1.5;
  const substrateKind: SubstrateKind = wizard.materialSubstrateKind || paper?.substrateKind || 'sheet';
  const pricingMode: RollPricingMode = wizard.rollPricingMode || paper?.pricingMode || 'linear_meter';
  const rollWidthCm = Math.max(1, wizard.rollWidthCm || paper?.rollWidthCm || paper?.formatWidth || 100);
  const gripperCm = Math.max(0, Number.isFinite(wizard.geometryGripperCm)
    ? wizard.geometryGripperCm
    : machineGripperMargin);

  const legacyResult = useMemo(() => {
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

  const geometryInput = useMemo<GeometryInput | null>(() => {
    if (!wizard.useAdvancedGeometry || !paper) {
      return null;
    }

    return {
      strategy: 'guillotine_2stage_mixed',
      pieceWidthCm: wizard.width,
      pieceHeightCm: wizard.height,
      quantity: wizard.quantity,
      bleedCm: wizard.geometryBleedCm,
      gapCm: wizard.geometryGapCm,
      gripperCm,
      wastePct: wizard.mermaPercent,
      allowRotation: wizard.geometryAllowRotation,
      optimizationMode: wizard.geometryOptimizationMode,
      grainDirection: paper.grainDirection || 'unknown',
      weightGrams: paper.weightGrams,
      purchaseIncrement: paper.purchaseIncrement,
      substrateKind,
      sheetWidthCm: paper.formatWidth,
      sheetHeightCm: paper.formatHeight,
      rollWidthCm,
      pricingMode,
      unitCostSheet: paper.costPerSheet,
      unitCostLinearMeter: paper.costPerLinearMeter,
      unitCostSquareMeter: paper.costPerSquareMeter,
    };
  }, [
    wizard.useAdvancedGeometry,
    wizard.width,
    wizard.height,
    wizard.quantity,
    wizard.geometryBleedCm,
    wizard.geometryGapCm,
    wizard.mermaPercent,
    wizard.geometryAllowRotation,
    wizard.geometryOptimizationMode,
    paper,
    gripperCm,
    substrateKind,
    rollWidthCm,
    pricingMode,
  ]);

  const automaticGeometryResult = useMemo(
    () => (geometryInput ? calculateGeometry(geometryInput) : null),
    [geometryInput],
  );

  const geometryResult = useMemo(() => {
    if (!automaticGeometryResult || !geometryInput || overrideCabidas === null) {
      return automaticGeometryResult;
    }

    return applyManualGeometryOverride(automaticGeometryResult, geometryInput, overrideCabidas);
  }, [automaticGeometryResult, geometryInput, overrideCabidas]);

  React.useEffect(() => {
    if (!wizard.useAdvancedGeometry) {
      if (!legacyResult) {
        updateField('cabidas', 0);
        updateField('pliegosTotales', 0);
        updateField('geometryMaterialCost', null);
        updateField('geometrySnapshot', null);
        return;
      }

      const finalYield = overrideCabidas ?? legacyResult.totalCabidas;
      updateField('cabidas', finalYield);
      updateField('pliegosTotales', calcularPliegosTotales(quantity, finalYield, mermaPercent));
      updateField('geometryMaterialCost', null);
      updateField('geometrySnapshot', null);
      return;
    }

    if (!geometryResult || !geometryInput || geometryResult.layoutMode === 'not_feasible') {
      updateField('cabidas', 0);
      updateField('pliegosTotales', 0);
      updateField('geometryMaterialCost', null);
      updateField('geometrySnapshot', null);
      return;
    }

    const workflowConsumption = substrateKind === 'sheet'
      ? geometryResult.materialConsumption.requiredSheets || 0
      : geometryResult.materialConsumption.requiredLinearMeters || 0;

    updateField('cabidas', geometryResult.piecesPerSheetOrRun);
    updateField('pliegosTotales', workflowConsumption);
    updateField('geometryMaterialCost', geometryResult.materialCost);

    const snapshot: QuoteItemGeometrySnapshot = {
      strategy: geometryResult.strategy,
      substrateKind,
      pricingMode,
      layoutMode: geometryResult.layoutMode,
      pieceWidthCm: wizard.width,
      pieceHeightCm: wizard.height,
      bleedCm: wizard.geometryBleedCm,
      gapCm: wizard.geometryGapCm,
      gripperCm,
      wastePct: wizard.mermaPercent,
      allowRotation: wizard.geometryAllowRotation,
      optimizationMode: wizard.geometryOptimizationMode,
      grainDirection: paper?.grainDirection || 'unknown',
      manualOverride: geometryResult.manualOverride,
      geometryVerified: geometryResult.geometryVerified,
      piecesPerSheetOrRun: geometryResult.piecesPerSheetOrRun,
      utilizationPct: geometryResult.utilizationPct,
      usedAreaCm2: geometryResult.usedAreaCm2,
      wasteAreaCm2: geometryResult.wasteAreaCm2,
      containerWidthCm: geometryResult.containerWidthCm,
      containerHeightCm: geometryResult.containerHeightCm,
      wasteBreakdown: geometryResult.wasteBreakdown,
      placements: geometryResult.placements,
      alternatives: geometryResult.alternatives,
      warnings: geometryResult.warnings,
      materialConsumption: geometryResult.materialConsumption,
      materialCost: geometryResult.materialCost,
      cutPlan: geometryResult.cutPlan,
    };

    updateField('geometrySnapshot', snapshot);
  }, [
    wizard.useAdvancedGeometry,
    wizard.width,
    wizard.height,
    wizard.geometryBleedCm,
    wizard.geometryGapCm,
    wizard.geometryAllowRotation,
    wizard.geometryOptimizationMode,
    wizard.mermaPercent,
    legacyResult,
    geometryResult,
    geometryInput,
    overrideCabidas,
    quantity,
    mermaPercent,
    substrateKind,
    pricingMode,
    gripperCm,
    paper?.grainDirection,
    updateField,
  ]);

  const handlePaperChange = (paperId: string) => {
    updateField('selectedPaperId', paperId);
    updateField('overrideCabidas', null);

    const selected = papers.find((entry) => entry.id === paperId);
    if (!selected) {
      return;
    }

    updateField('materialSubstrateKind', selected.substrateKind || 'sheet');
    updateField('rollPricingMode', selected.pricingMode || 'linear_meter');
    updateField('rollWidthCm', selected.rollWidthCm || selected.formatWidth || 100);
  };

  const currentYield = wizard.useAdvancedGeometry
    ? geometryResult?.piecesPerSheetOrRun || 0
    : overrideCabidas ?? legacyResult?.totalCabidas ?? 0;
  const materialCost = wizard.useAdvancedGeometry
    ? geometryResult?.materialCost || 0
    : (paper?.costPerSheet || 0) * wizard.pliegosTotales;

  const resultExplanation = useMemo(() => {
    if (!geometryResult || geometryResult.layoutMode === 'not_feasible') {
      return '';
    }

    const recommended = geometryResult.alternatives[0];
    const second = geometryResult.alternatives[1];

    if (!recommended || !second) {
      return `Se eligio ${LAYOUT_LABELS[geometryResult.layoutMode] || geometryResult.layoutMode} por ser la alternativa valida de menor consumo.`;
    }

    const yieldDifference = recommended.piecesPerSheetOrRun - second.piecesPerSheetOrRun;
    const saving = second.materialCost - recommended.materialCost;

    if (geometryResult.substrateKind === 'roll' && saving > 0) {
      return `Recomendamos ${recommended.label}: reduce el costo estimado de material en $${Math.round(saving).toLocaleString('es-CO')}.`;
    }

    if (yieldDifference > 0) {
      return `Recomendamos ${recommended.label}: obtiene ${yieldDifference.toLocaleString('es-CO', { maximumFractionDigits: 2 })} piezas adicionales por unidad de material.`;
    }

    if (saving > 0) {
      return `Recomendamos ${recommended.label}: reduce el costo estimado de material en $${Math.round(saving).toLocaleString('es-CO')}.`;
    }

    return `Recomendamos ${recommended.label}: logra el mismo rendimiento con una secuencia de corte mas simple.`;
  }, [geometryResult]);

  return (
    <div className="animate-fade-in">
      <h2>Paso 2: Materiales y geometria de corte</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Calcula cuanto material necesitas, compara orientaciones y valida visualmente el montaje antes de cotizar.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '0.9rem 1rem',
          background: 'var(--bg-surface-hover)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <strong>Optimizador geometrico</strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Mantiene disponible el calculo clasico como respaldo.
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wizard.useAdvancedGeometry}
            onChange={(event) => {
              updateField('useAdvancedGeometry', event.target.checked);
              updateField('overrideCabidas', null);
            }}
          />
          {wizard.useAdvancedGeometry ? 'Avanzado' : 'Clasico'}
        </label>
      </div>

      <div className="input-group">
        <label className="input-label">Sustrato</label>
        <select
          className="input-field"
          value={wizard.selectedPaperId || ''}
          onChange={(event) => handlePaperChange(event.target.value)}
        >
          <option value="" disabled>Selecciona un sustrato</option>
          {papers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} - {entry.substrateKind === 'roll'
                ? `Rollo ${entry.rollWidthCm || entry.formatWidth} cm`
                : `${entry.formatWidth} x ${entry.formatHeight} cm`}
            </option>
          ))}
        </select>
      </div>

      {wizard.useAdvancedGeometry ? (
        <div className="geometry-input-grid">
          <div className="input-group">
            <label className="input-label">Objetivo del montaje</label>
            <select
              className="input-field"
              value={wizard.geometryOptimizationMode}
              onChange={(event) => {
                const mode = event.target.value as GeometryOptimizationMode;
                updateField('geometryOptimizationMode', mode);
                updateField('geometryAllowRotation', mode === 'best_fit' || mode === 'fixed_rotated');
                updateField('overrideCabidas', null);
              }}
            >
              {Object.entries(OPTIMIZATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Tipo de material</label>
            <select
              className="input-field"
              value={substrateKind}
              onChange={(event) => {
                updateField('materialSubstrateKind', event.target.value as SubstrateKind);
                updateField('overrideCabidas', null);
              }}
            >
              <option value="sheet">Pliego</option>
              <option value="roll">Rollo (vinilo/plastico)</option>
            </select>
          </div>

          {substrateKind === 'roll' && (
            <>
              <div className="input-group">
                <label className="input-label">Ancho del rollo (cm)</label>
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
                <label className="input-label">Unidad de cobro</label>
                <select
                  className="input-field"
                  value={pricingMode}
                  onChange={(event) => updateField('rollPricingMode', event.target.value as RollPricingMode)}
                >
                  <option value="linear_meter">Metro lineal (ML)</option>
                  <option value="square_meter">Metro cuadrado (m2)</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Sangrado por lado (cm)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={wizard.geometryBleedCm}
              onChange={(event) => updateField('geometryBleedCm', Math.max(0, Number(event.target.value) || 0))}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Separacion entre piezas (cm)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={wizard.geometryGapCm}
              onChange={(event) => updateField('geometryGapCm', Math.max(0, Number(event.target.value) || 0))}
            />
          </div>

          {substrateKind === 'sheet' && (
            <div className="input-group">
              <label className="input-label">Pinza no imprimible (cm)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={wizard.geometryGripperCm}
                onChange={(event) => updateField('geometryGripperCm', Math.max(0, Number(event.target.value) || 0))}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Merma de produccion (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              className="input-field"
              value={wizard.mermaPercent * 100}
              onChange={(event) => updateField('mermaPercent', Math.max(0, Number(event.target.value) || 0) / 100)}
            />
          </div>
        </div>
      ) : (
        <div className="input-group" style={{ maxWidth: '320px' }}>
          <label className="input-label">Merma de produccion (%)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            className="input-field"
            value={wizard.mermaPercent * 100}
            onChange={(event) => updateField('mermaPercent', Math.max(0, Number(event.target.value) || 0) / 100)}
          />
        </div>
      )}

      {wizard.useAdvancedGeometry && geometryResult?.layoutMode === 'not_feasible' && (
        <div className="alert-danger" style={{ marginTop: '1rem' }}>
          {geometryResult.warnings[0] || 'La pieza no cabe en este material.'}
        </div>
      )}

      {(wizard.useAdvancedGeometry ? geometryResult?.layoutMode !== 'not_feasible' : Boolean(legacyResult)) && (
        <section
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: 'var(--bg-surface-hover)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>
                {wizard.useAdvancedGeometry ? 'Montaje recomendado' : 'Resultado clasico'}
              </h3>
              {wizard.useAdvancedGeometry && geometryResult && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                  {resultExplanation}
                </p>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={overrideCabidas !== null}
                onChange={(event) =>
                  updateField('overrideCabidas', event.target.checked ? Math.max(1, Math.floor(currentYield || 1)) : null)
                }
              />
              Forzar rendimiento manual
            </label>
          </div>

          <div className="geometry-result-grid">
            <div className="geometry-metric">
              <div className="geometry-metric-label">
                {substrateKind === 'roll' ? 'Piezas estimadas / ML' : 'Piezas / pliego'}
              </div>
              {overrideCabidas === null ? (
                <div className="geometry-metric-value">
                  {currentYield.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                </div>
              ) : (
                <input
                  type="number"
                  min="1"
                  step={substrateKind === 'roll' ? '0.01' : '1'}
                  className="input-field"
                  value={overrideCabidas}
                  onChange={(event) => updateField('overrideCabidas', Math.max(1, Number(event.target.value) || 1))}
                />
              )}
            </div>

            <div className="geometry-metric">
              <div className="geometry-metric-label">Aprovechamiento neto</div>
              <div className="geometry-metric-value">
                {overrideCabidas === null
                  ? `${(wizard.useAdvancedGeometry ? geometryResult?.utilizationPct || 0 : legacyResult?.porcentajeAprovechamiento || 0).toFixed(1)}%`
                  : 'No verificado'}
              </div>
            </div>

            <div className="geometry-metric">
              <div className="geometry-metric-label">
                {substrateKind === 'roll' ? 'Material a comprar' : 'Pliegos a comprar'}
              </div>
              <div className="geometry-metric-value">
                {substrateKind === 'roll'
                  ? `${(geometryResult?.materialConsumption.requiredLinearMeters || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ML`
                  : `${wizard.useAdvancedGeometry
                    ? geometryResult?.materialConsumption.requiredSheets || 0
                    : wizard.pliegosTotales}`}
              </div>
            </div>

            <div className="geometry-metric">
              <div className="geometry-metric-label">Costo de material</div>
              <div className="geometry-metric-value" style={{ color: 'var(--color-primary)' }}>
                ${Math.round(materialCost).toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {wizard.useAdvancedGeometry && geometryResult && (
            <>
              {geometryResult.warnings.map((warning) => (
                <div
                  key={warning}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.7rem 0.8rem',
                    borderRadius: 'var(--radius-md)',
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    color: '#92400e',
                    fontSize: '0.82rem',
                  }}
                >
                  {warning}
                </div>
              ))}

              <div className="geometry-workspace" style={{ marginTop: '1rem' }}>
                <CutLayoutViewer
                  result={geometryResult}
                  bleedCm={wizard.geometryBleedCm}
                  gripperCm={substrateKind === 'sheet' ? gripperCm : 0}
                  grainDirection={paper?.grainDirection}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="geometry-metric">
                    <div className="geometry-metric-label">Lectura del montaje</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      {LAYOUT_LABELS[geometryResult.layoutMode] || geometryResult.layoutMode}
                    </div>
                    <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      Azul: orientacion original. Naranja: pieza girada. La linea interior punteada representa el corte final sin sangrado.
                    </div>
                  </div>

                  <div className="geometry-metric">
                    <div className="geometry-metric-label">Desglose de area</div>
                    <div style={{ marginTop: '0.4rem', display: 'grid', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <span>Impresion: {(geometryResult.wasteBreakdown.printOccupiedAreaCm2 / 10000).toFixed(3)} m2</span>
                      <span>Sobrante geometrico: {(geometryResult.wasteBreakdown.geometricWasteAreaCm2 / 10000).toFixed(3)} m2</span>
                      {geometryResult.wasteBreakdown.nonPrintableAreaCm2 > 0 && (
                        <span>Zona no imprimible: {(geometryResult.wasteBreakdown.nonPrintableAreaCm2 / 10000).toFixed(3)} m2</span>
                      )}
                      {geometryResult.materialConsumption.estimatedWeightKg !== undefined && (
                        <span>Peso de compra estimado: {geometryResult.materialConsumption.estimatedWeightKg.toFixed(2)} kg</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {geometryResult.alternatives.length > 1 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ marginBottom: '0.6rem', fontSize: '0.95rem' }}>Alternativas comparadas</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {geometryResult.alternatives.map((alternative, index) => (
                      <div
                        key={alternative.id}
                        className={`geometry-alternative ${index === 0 ? 'recommended' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                          <strong>{index === 0 ? 'Recomendada: ' : ''}{alternative.label}</strong>
                          <span>{alternative.piecesPerSheetOrRun.toLocaleString('es-CO', { maximumFractionDigits: 2 })} pzs</span>
                        </div>
                        <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                          Aprovechamiento {alternative.utilizationPct.toFixed(1)}% | Costo ${Math.round(alternative.materialCost).toLocaleString('es-CO')} | {alternative.cutCount} cortes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ver secuencia tecnica de cortes</summary>
                <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {geometryResult.cutPlan.length > 0 ? geometryResult.cutPlan.map((step, index) => (
                    <div key={`${step.description}-${index}`}>
                      Etapa {step.stage}: {step.description}. Paso {step.sizeCm.toLocaleString('es-CO', { maximumFractionDigits: 3 })} cm, {step.count} cortes.
                    </div>
                  )) : (
                    <div>Sin secuencia verificada por ajuste manual.</div>
                  )}
                </div>
              </details>
            </>
          )}

          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Calculo orientativo. Antes de producir valida fibra, formato real del proveedor, tolerancias de maquina y disponibilidad del material.
          </p>
        </section>
      )}
    </div>
  );
};
