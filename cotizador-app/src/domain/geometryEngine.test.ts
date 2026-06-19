import { describe, expect, it } from 'vitest';
import { applyManualGeometryOverride, calculateGeometry, type GeometryInput } from './geometryEngine';

const sheetInput: GeometryInput = {
  pieceWidthCm: 20,
  pieceHeightCm: 20,
  quantity: 1000,
  bleedCm: 0,
  gapCm: 0,
  gripperCm: 0,
  wastePct: 0.05,
  allowRotation: true,
  optimizationMode: 'best_fit',
  substrateKind: 'sheet',
  sheetWidthCm: 100,
  sheetHeightCm: 70,
  unitCostSheet: 800,
  weightGrams: 300,
};

describe('geometryEngine', () => {
  it('calcula montaje, compra, costo y peso de un pliego', () => {
    const result = calculateGeometry(sheetInput);

    expect(result.substrateKind).toBe('sheet');
    expect(result.piecesPerSheetOrRun).toBe(15);
    expect(result.materialConsumption.productionQuantity).toBe(1050);
    expect(result.materialConsumption.requiredSheets).toBe(70);
    expect(result.materialConsumption.estimatedWeightKg).toBeCloseTo(14.7, 2);
    expect(result.materialCost).toBe(56000);
    expect(result.geometryVerified).toBe(true);
    expect(result.placements).toHaveLength(15);
  });

  it('no cobra una calle adicional en el borde exterior', () => {
    const result = calculateGeometry({
      ...sheetInput,
      pieceWidthCm: 24.1,
      pieceHeightCm: 20,
      quantity: 1,
      wastePct: 0,
      gapCm: 1,
      allowRotation: false,
      optimizationMode: 'fixed_normal',
    });

    expect(result.piecesPerSheetOrRun).toBe(12);
  });

  it('encuentra un montaje mixto que supera orientaciones puras', () => {
    const result = calculateGeometry({
      ...sheetInput,
      pieceWidthCm: 10,
      pieceHeightCm: 13,
      quantity: 1000,
      wastePct: 0,
    });

    expect(result.layoutMode === 'mixed_vertical' || result.layoutMode === 'mixed_horizontal').toBe(true);
    expect(result.piecesPerSheetOrRun).toBeGreaterThan(50);
    expect(result.alternatives.length).toBeGreaterThan(1);
  });

  it('calcula rollo por filas completas y nunca fracciona la altura de una fila', () => {
    const result = calculateGeometry({
      pieceWidthCm: 30,
      pieceHeightCm: 20,
      quantity: 1,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0,
      allowRotation: false,
      optimizationMode: 'fixed_normal',
      substrateKind: 'roll',
      rollWidthCm: 100,
      pricingMode: 'linear_meter',
      unitCostLinearMeter: 12000,
      purchaseIncrement: 0.01,
    });

    expect(result.materialConsumption.requiredLinearMeters).toBe(0.2);
    expect(result.materialCost).toBe(2400);
  });

  it('respeta el incremento minimo de compra del rollo', () => {
    const result = calculateGeometry({
      pieceWidthCm: 30,
      pieceHeightCm: 20,
      quantity: 1,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0,
      allowRotation: false,
      optimizationMode: 'fixed_normal',
      substrateKind: 'roll',
      rollWidthCm: 100,
      pricingMode: 'linear_meter',
      unitCostLinearMeter: 12000,
      purchaseIncrement: 0.5,
    });

    expect(result.materialConsumption.requiredLinearMeters).toBe(0.5);
    expect(result.materialCost).toBe(6000);
  });

  it('marca el ajuste manual como geometria no verificada', () => {
    const automatic = calculateGeometry(sheetInput);
    const manual = applyManualGeometryOverride(automatic, sheetInput, 20);

    expect(manual.piecesPerSheetOrRun).toBe(20);
    expect(manual.geometryVerified).toBe(false);
    expect(manual.manualOverride).toBe(true);
    expect(manual.cutPlan).toHaveLength(0);
    expect(manual.placements).toHaveLength(0);
  });

  it('reporta no factible cuando la pieza no cabe', () => {
    const result = calculateGeometry({
      ...sheetInput,
      pieceWidthCm: 220,
      allowRotation: false,
      optimizationMode: 'fixed_normal',
    });

    expect(result.layoutMode).toBe('not_feasible');
    expect(result.piecesPerSheetOrRun).toBe(0);
    expect(result.geometryVerified).toBe(false);
  });

  it('mantiene invariantes de area y costo', () => {
    const result = calculateGeometry(sheetInput);

    expect(result.utilizationPct).toBeGreaterThanOrEqual(0);
    expect(result.utilizationPct).toBeLessThanOrEqual(100);
    expect(result.materialCost).toBeGreaterThanOrEqual(0);
    expect(result.placements.every((piece) =>
      piece.xCm >= 0 &&
      piece.yCm >= 0 &&
      piece.xCm + piece.widthCm <= result.containerWidthCm + 0.001 &&
      piece.yCm + piece.heightCm <= result.containerHeightCm + 0.001
    )).toBe(true);
  });
});
