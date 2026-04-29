import { describe, expect, it } from 'vitest';
import { calculateQuote, type QuoteEngineInput } from './quoteEngine';

const baseInput: QuoteEngineInput = {
  projectMode: 'Papel',
  quantity: 5000,
  pliegosTotales: 329,
  printFormat: '4x4',
  numberOfInks: 8,
  sellMachineProcess: true,
  sellInkProcess: true,
  targetMargin: 0.25,
  customSalePrice: null,
  materialCostOverride: null,
  strategicMachinePrice: null,
  forceMachineCost: null,
  forcePassesOrColors: null,
  strategicPlatePrice: null,
  forcePlatesCost: null,
  strategicInkPrice: null,
  forceInkCost: null,
  strategicFinishPrices: {},
  selectedFinishIds: ['T-PLIEGO'],
  paper: {
    id: 'P-01',
    name: 'Propalcote 300g',
    formatWidth: 100,
    formatHeight: 70,
    costPerSheet: 800,
  },
  machine: {
    id: 'MQ-01',
    name: 'Plotter Stormjet',
    technology: 'Gran Formato',
    chargeType: 'Policromia',
    maxWidth: 160,
    maxHeight: 9999,
    minWidth: 10,
    minHeight: 10,
    gripperMargin: 0,
    setupCost: 0,
    variableCost: 25000,
  },
  plate: {
    id: 'PL-1',
    name: 'Plancha 70x100',
    baseCost: 40000,
  },
  ink: {
    id: 'I-1',
    type: 'CMYK',
    baseCost: 15000,
  },
  popItem: null,
  finishes: [
    {
      id: 'T-PLIEGO',
      name: 'Plastificado',
      chargeType: 'Pliego',
      setupCost: 0,
      variableCost: 450,
    },
  ],
};

describe('calculateQuote', () => {
  it('calcula costos en modo Papel con consistencia de margenes', () => {
    const result = calculateQuote(baseInput);

    expect(result.isPopMode).toBe(false);
    expect(result.costPaper).toBe(263200);
    expect(result.paperCostOverridden).toBe(false);
    expect(result.costMachine).toBe(16450000);
    expect(result.costPlates).toBe(320000);
    expect(result.costInk).toBeCloseTo(39480, 2);
    expect(result.costFinishes).toBe(148050);
    expect(result.baseCost).toBeCloseTo(17220730, 2);
    expect(result.suggestedPrice).toBeCloseTo(21525912.5, 4);
    expect(result.profitOnBasePct).toBeCloseTo(25, 4);
    expect(result.marginOnSalePct).toBeCloseTo(20, 4);
    expect(result.isDanger).toBe(false);
  });

  it('calcula modo POP y detecta margen negativo con precio forzado', () => {
    const result = calculateQuote({
      ...baseInput,
      projectMode: 'POP',
      quantity: 100,
      pliegosTotales: 0,
      selectedFinishIds: ['T-GLOBAL'],
      customSalePrice: 100000,
      popItem: {
        id: 'POP-1',
        name: 'Mug',
        description: 'Mug blanco',
        unitCost: 1200,
      },
      finishes: [
        {
          id: 'T-GLOBAL',
          name: 'Diseno',
          chargeType: 'Global',
          setupCost: 5000,
          variableCost: 0,
        },
      ],
    });

    expect(result.isPopMode).toBe(true);
    expect(result.popCost).toBe(120000);
    expect(result.baseCost).toBe(125000);
    expect(result.finalPrice).toBe(100000);
    expect(result.isDanger).toBe(true);
    expect(result.displayMarginPct).toBeLessThan(0);
  });

  it('respeta logica por color cuando la maquina cobra por tinta', () => {
    const result = calculateQuote({
      ...baseInput,
      machine: {
        ...baseInput.machine!,
        technology: 'Offset',
        chargeType: 'Color',
        setupCost: 180000,
        variableCost: 45000,
      },
      numberOfInks: 5,
      printFormat: 'Manual',
    });

    expect(result.passesOrColors).toBe(5);
    expect(result.facesLogicPrint).toContain('5 Colores');
    expect(result.machineMetricLabel).toBe('Millares');
    expect(result.costMachine).toBeCloseTo(254025, 2);
  });

  it('permite forzar costos de impresion de forma manual', () => {
    const result = calculateQuote({
      ...baseInput,
      forceMachineCost: 999999,
      forcePlatesCost: 123456,
      forceInkCost: 654321,
      forcePassesOrColors: 3,
    });

    expect(result.machineCostForced).toBe(true);
    expect(result.platesCostForced).toBe(true);
    expect(result.inkCostForced).toBe(true);
    expect(result.passesForced).toBe(true);
    expect(result.costMachine).toBe(999999);
    expect(result.costPlates).toBe(123456);
    expect(result.costInk).toBe(654321);
  });

  it('permite inyectar costo de material calculado por motor geometrico', () => {
    const result = calculateQuote({
      ...baseInput,
      materialCostOverride: 777777,
    });

    expect(result.costPaper).toBe(777777);
    expect(result.paperCostOverridden).toBe(true);
  });
});
