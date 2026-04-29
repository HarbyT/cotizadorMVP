import { describe, expect, it } from 'vitest';
import { calculateGeometry } from './geometryEngine';

describe('geometryEngine', () => {
  it('calcula montaje en pliego con consumo y costo', () => {
    const result = calculateGeometry({
      pieceWidthCm: 20,
      pieceHeightCm: 20,
      quantity: 1000,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0.05,
      allowRotation: true,
      substrateKind: 'sheet',
      sheetWidthCm: 100,
      sheetHeightCm: 70,
      unitCostSheet: 800,
    });

    expect(result.substrateKind).toBe('sheet');
    expect(result.piecesPerSheetOrRun).toBe(15);
    expect(result.materialConsumption.requiredSheets).toBe(71);
    expect(result.materialCost).toBe(56800);
    expect(result.cutPlan.length).toBeGreaterThan(0);
  });

  it('no rinde peor que una orientacion pura basica', () => {
    const result = calculateGeometry({
      pieceWidthCm: 55,
      pieceHeightCm: 35,
      quantity: 300,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0,
      allowRotation: true,
      substrateKind: 'sheet',
      sheetWidthCm: 100,
      sheetHeightCm: 70,
      unitCostSheet: 1000,
    });

    const pureNormal = Math.floor(100 / 55) * Math.floor(70 / 35);
    const pureRotated = Math.floor(100 / 35) * Math.floor(70 / 55);

    expect(result.layoutMode).not.toBe('not_feasible');
    expect(result.piecesPerSheetOrRun).toBeGreaterThanOrEqual(Math.max(pureNormal, pureRotated));
  });

  it('calcula consumo de rollo con tarifa por metro lineal', () => {
    const result = calculateGeometry({
      pieceWidthCm: 30,
      pieceHeightCm: 20,
      quantity: 1000,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0.1,
      allowRotation: true,
      substrateKind: 'roll',
      rollWidthCm: 100,
      pricingMode: 'linear_meter',
      unitCostLinearMeter: 12000,
      unitCostSquareMeter: 5000,
    });

    expect(result.substrateKind).toBe('roll');
    expect(result.piecesPerSheetOrRun).toBe(15);
    expect(result.materialConsumption.requiredLinearMeters).toBeCloseTo(73.3333, 3);
    expect(result.materialCost).toBeCloseTo(880000, 0);
  });

  it('reporta no factible cuando la pieza no cabe en rollo', () => {
    const result = calculateGeometry({
      pieceWidthCm: 220,
      pieceHeightCm: 30,
      quantity: 100,
      bleedCm: 0,
      gapCm: 0,
      gripperCm: 0,
      wastePct: 0.05,
      allowRotation: false,
      substrateKind: 'roll',
      rollWidthCm: 100,
      pricingMode: 'square_meter',
      unitCostSquareMeter: 10000,
    });

    expect(result.layoutMode).toBe('not_feasible');
    expect(result.piecesPerSheetOrRun).toBe(0);
    expect(result.materialCost).toBe(0);
  });
});
