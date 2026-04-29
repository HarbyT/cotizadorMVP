import type {
  GeometryCutPlanStep,
  GeometryMaterialConsumption,
  RollPricingMode,
  SubstrateKind,
} from '../types/database';
import { toFiniteNumber } from '../utils/financial';

type LayoutMode = 'normal' | 'rotated' | 'mixed_vertical' | 'mixed_horizontal' | 'not_feasible';

interface SheetSection {
  orientation: 'normal' | 'rotated';
  originXCm: number;
  originYCm: number;
  widthCm: number;
  heightCm: number;
  countX: number;
  countY: number;
  pieceCount: number;
}

export interface GeometryInput {
  strategy?: 'guillotine_2stage_mixed';
  pieceWidthCm: number;
  pieceHeightCm: number;
  quantity: number;
  bleedCm: number;
  gapCm: number;
  gripperCm: number;
  wastePct: number;
  allowRotation: boolean;
  substrateKind: SubstrateKind;
  sheetWidthCm?: number;
  sheetHeightCm?: number;
  rollWidthCm?: number;
  pricingMode?: RollPricingMode;
  unitCostSheet?: number;
  unitCostLinearMeter?: number;
  unitCostSquareMeter?: number;
}

export interface GeometryResult {
  strategy: 'guillotine_2stage_mixed';
  substrateKind: SubstrateKind;
  pricingMode: RollPricingMode;
  layoutMode: LayoutMode;
  piecesPerSheetOrRun: number;
  utilizationPct: number;
  usedAreaCm2: number;
  wasteAreaCm2: number;
  cutPlan: GeometryCutPlanStep[];
  materialConsumption: GeometryMaterialConsumption;
  materialCost: number;
  sections: SheetSection[];
}

interface SheetCandidate {
  layoutMode: LayoutMode;
  total: number;
  sections: SheetSection[];
}

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function sanitizePct(value: number): number {
  return Math.max(0, toFiniteNumber(value));
}

function createNotFeasibleResult(input: GeometryInput): GeometryResult {
  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: input.substrateKind,
    pricingMode: input.pricingMode ?? 'linear_meter',
    layoutMode: 'not_feasible',
    piecesPerSheetOrRun: 0,
    utilizationPct: 0,
    usedAreaCm2: 0,
    wasteAreaCm2: 0,
    cutPlan: [],
    materialConsumption: {},
    materialCost: 0,
    sections: [],
  };
}

function buildSheetCutPlan(layoutMode: LayoutMode, sections: SheetSection[]): GeometryCutPlanStep[] {
  const steps: GeometryCutPlanStep[] = [];

  if (layoutMode === 'mixed_vertical' && sections.length === 2) {
    steps.push({
      stage: 1,
      axis: 'vertical',
      description: 'Corte primario para separar zonas de orientacion',
      sizeCm: round(sections[0].widthCm, 3),
      count: 1,
    });
  } else if (layoutMode === 'mixed_horizontal' && sections.length === 2) {
    steps.push({
      stage: 1,
      axis: 'horizontal',
      description: 'Corte primario para separar zonas de orientacion',
      sizeCm: round(sections[0].heightCm, 3),
      count: 1,
    });
  }

  sections.forEach((section, index) => {
    const pieceWidth = section.countX > 0 ? section.widthCm / section.countX : 0;
    const pieceHeight = section.countY > 0 ? section.heightCm / section.countY : 0;

    if (section.countX > 0 && pieceWidth > 0) {
      steps.push({
        stage: 2,
        axis: 'vertical',
        description: `Zona ${index + 1} (${section.orientation}): cortes verticales`,
        sizeCm: round(pieceWidth, 3),
        count: section.countX,
      });
    }

    if (section.countY > 0 && pieceHeight > 0) {
      steps.push({
        stage: 2,
        axis: 'horizontal',
        description: `Zona ${index + 1} (${section.orientation}): cortes horizontales`,
        sizeCm: round(pieceHeight, 3),
        count: section.countY,
      });
    }
  });

  return steps;
}

function evaluateSheetCandidates(
  usableWidthCm: number,
  usableHeightCm: number,
  effectiveWidthCm: number,
  effectiveHeightCm: number,
  allowRotation: boolean,
): SheetCandidate[] {
  const candidates: SheetCandidate[] = [];
  const normalCols = Math.floor(usableWidthCm / effectiveWidthCm);
  const normalRows = Math.floor(usableHeightCm / effectiveHeightCm);
  const normalTotal = Math.max(0, normalCols * normalRows);

  if (normalTotal > 0) {
    candidates.push({
      layoutMode: 'normal',
      total: normalTotal,
      sections: [
        {
          orientation: 'normal',
          originXCm: 0,
          originYCm: 0,
          widthCm: normalCols * effectiveWidthCm,
          heightCm: normalRows * effectiveHeightCm,
          countX: normalCols,
          countY: normalRows,
          pieceCount: normalTotal,
        },
      ],
    });
  }

  if (!allowRotation) {
    return candidates;
  }

  const rotatedCols = Math.floor(usableWidthCm / effectiveHeightCm);
  const rotatedRows = Math.floor(usableHeightCm / effectiveWidthCm);
  const rotatedTotal = Math.max(0, rotatedCols * rotatedRows);

  if (rotatedTotal > 0) {
    candidates.push({
      layoutMode: 'rotated',
      total: rotatedTotal,
      sections: [
        {
          orientation: 'rotated',
          originXCm: 0,
          originYCm: 0,
          widthCm: rotatedCols * effectiveHeightCm,
          heightCm: rotatedRows * effectiveWidthCm,
          countX: rotatedCols,
          countY: rotatedRows,
          pieceCount: rotatedTotal,
        },
      ],
    });
  }

  for (let leftNormalCols = 1; leftNormalCols < normalCols; leftNormalCols += 1) {
    const leftPieceCount = leftNormalCols * normalRows;
    const usedLeftWidth = leftNormalCols * effectiveWidthCm;
    const rightWidth = usableWidthCm - usedLeftWidth;
    const rightRotatedCols = Math.floor(rightWidth / effectiveHeightCm);
    const rightRotatedRows = Math.floor(usableHeightCm / effectiveWidthCm);
    const rightPieceCount = rightRotatedCols * rightRotatedRows;
    const total = leftPieceCount + rightPieceCount;

    if (total <= 0 || rightPieceCount <= 0) {
      continue;
    }

    candidates.push({
      layoutMode: 'mixed_vertical',
      total,
      sections: [
        {
          orientation: 'normal',
          originXCm: 0,
          originYCm: 0,
          widthCm: leftNormalCols * effectiveWidthCm,
          heightCm: normalRows * effectiveHeightCm,
          countX: leftNormalCols,
          countY: normalRows,
          pieceCount: leftPieceCount,
        },
        {
          orientation: 'rotated',
          originXCm: usedLeftWidth,
          originYCm: 0,
          widthCm: rightRotatedCols * effectiveHeightCm,
          heightCm: rightRotatedRows * effectiveWidthCm,
          countX: rightRotatedCols,
          countY: rightRotatedRows,
          pieceCount: rightPieceCount,
        },
      ],
    });
  }

  for (let topNormalRows = 1; topNormalRows < normalRows; topNormalRows += 1) {
    const topPieceCount = topNormalRows * normalCols;
    const usedTopHeight = topNormalRows * effectiveHeightCm;
    const bottomHeight = usableHeightCm - usedTopHeight;
    const bottomRotatedRows = Math.floor(bottomHeight / effectiveWidthCm);
    const bottomRotatedCols = Math.floor(usableWidthCm / effectiveHeightCm);
    const bottomPieceCount = bottomRotatedCols * bottomRotatedRows;
    const total = topPieceCount + bottomPieceCount;

    if (total <= 0 || bottomPieceCount <= 0) {
      continue;
    }

    candidates.push({
      layoutMode: 'mixed_horizontal',
      total,
      sections: [
        {
          orientation: 'normal',
          originXCm: 0,
          originYCm: 0,
          widthCm: normalCols * effectiveWidthCm,
          heightCm: topNormalRows * effectiveHeightCm,
          countX: normalCols,
          countY: topNormalRows,
          pieceCount: topPieceCount,
        },
        {
          orientation: 'rotated',
          originXCm: 0,
          originYCm: usedTopHeight,
          widthCm: bottomRotatedCols * effectiveHeightCm,
          heightCm: bottomRotatedRows * effectiveWidthCm,
          countX: bottomRotatedCols,
          countY: bottomRotatedRows,
          pieceCount: bottomPieceCount,
        },
      ],
    });
  }

  return candidates;
}

function selectBestCandidate(candidates: SheetCandidate[]): SheetCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => {
    if (current.total > best.total) {
      return current;
    }

    if (current.total === best.total && current.sections.length < best.sections.length) {
      return current;
    }

    return best;
  });
}

function calculateSheetGeometry(input: GeometryInput): GeometryResult {
  const sheetWidthCm = Math.max(0, toFiniteNumber(input.sheetWidthCm));
  const sheetHeightCm = Math.max(0, toFiniteNumber(input.sheetHeightCm));
  const gripperCm = Math.max(0, toFiniteNumber(input.gripperCm));
  const wastePct = sanitizePct(input.wastePct);
  const usableWidthCm = sheetWidthCm;
  const usableHeightCm = Math.max(0, sheetHeightCm - gripperCm);

  const effectiveWidthCm = Math.max(0.01, toFiniteNumber(input.pieceWidthCm) + Math.max(0, input.bleedCm) * 2 + Math.max(0, input.gapCm));
  const effectiveHeightCm = Math.max(0.01, toFiniteNumber(input.pieceHeightCm) + Math.max(0, input.bleedCm) * 2 + Math.max(0, input.gapCm));
  const candidates = evaluateSheetCandidates(usableWidthCm, usableHeightCm, effectiveWidthCm, effectiveHeightCm, input.allowRotation);
  const best = selectBestCandidate(candidates);

  if (!best || best.total <= 0) {
    return createNotFeasibleResult({ ...input, substrateKind: 'sheet' });
  }

  const pieceAreaCm2 = Math.max(0, toFiniteNumber(input.pieceWidthCm) * toFiniteNumber(input.pieceHeightCm));
  const usedAreaCm2 = pieceAreaCm2 * best.total;
  const totalAreaCm2 = Math.max(0, usableWidthCm * usableHeightCm);
  const wasteAreaCm2 = Math.max(0, totalAreaCm2 - usedAreaCm2);
  const utilizationPct = totalAreaCm2 > 0 ? (usedAreaCm2 / totalAreaCm2) * 100 : 0;

  const quantity = Math.max(0, Math.floor(toFiniteNumber(input.quantity)));
  const requiredSheets = best.total > 0 ? Math.ceil((quantity / best.total) * (1 + wastePct)) : 0;
  const unitCostSheet = Math.max(0, toFiniteNumber(input.unitCostSheet));
  const materialCost = requiredSheets * unitCostSheet;

  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: 'sheet',
    pricingMode: input.pricingMode ?? 'linear_meter',
    layoutMode: best.layoutMode,
    piecesPerSheetOrRun: best.total,
    utilizationPct: round(utilizationPct, 4),
    usedAreaCm2: round(usedAreaCm2, 4),
    wasteAreaCm2: round(wasteAreaCm2, 4),
    cutPlan: buildSheetCutPlan(best.layoutMode, best.sections),
    materialConsumption: {
      requiredSheets,
    },
    materialCost: round(materialCost, 4),
    sections: best.sections,
  };
}

interface RollCandidate {
  orientation: 'normal' | 'rotated';
  piecesPerLinearMeter: number;
  requiredLinearMeters: number;
  consumedAreaCm2: number;
  consumedAreaM2: number;
  materialCost: number;
  cutPlan: GeometryCutPlanStep[];
}

function evaluateRollCandidate(
  orientation: 'normal' | 'rotated',
  rollWidthCm: number,
  quantity: number,
  effectiveWidthCm: number,
  effectiveHeightCm: number,
  wastePct: number,
  pricingMode: RollPricingMode,
  unitCostLinearMeter: number,
  unitCostSquareMeter: number,
): RollCandidate | null {
  if (effectiveWidthCm > rollWidthCm) {
    return null;
  }

  const columnsAcross = Math.floor(rollWidthCm / effectiveWidthCm);
  const rowsPerMeter = Math.floor(100 / effectiveHeightCm);
  const piecesPerLinearMeter = columnsAcross * rowsPerMeter;

  if (columnsAcross <= 0 || rowsPerMeter <= 0 || piecesPerLinearMeter <= 0) {
    return null;
  }

  const rawLinearMeters = quantity / piecesPerLinearMeter;
  const requiredLinearMeters = rawLinearMeters * (1 + wastePct);
  const consumedLengthCm = requiredLinearMeters * 100;
  const consumedAreaCm2 = rollWidthCm * consumedLengthCm;
  const consumedAreaM2 = consumedAreaCm2 / 10000;

  const materialCost =
    pricingMode === 'square_meter'
      ? consumedAreaM2 * Math.max(0, unitCostSquareMeter)
      : requiredLinearMeters * Math.max(0, unitCostLinearMeter);

  return {
    orientation,
    piecesPerLinearMeter,
    requiredLinearMeters,
    consumedAreaCm2,
    consumedAreaM2,
    materialCost,
    cutPlan: [
      {
        stage: 1,
        axis: 'vertical',
        description: `Rollo (${orientation}): corte en franjas`,
        sizeCm: round(effectiveWidthCm, 3),
        count: columnsAcross,
      },
      {
        stage: 2,
        axis: 'horizontal',
        description: `Rollo (${orientation}): corte transversal por paso`,
        sizeCm: round(effectiveHeightCm, 3),
        count: Math.max(1, Math.ceil(quantity / columnsAcross)),
      },
    ],
  };
}

function chooseBestRollCandidate(candidates: RollCandidate[]): RollCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => {
    if (current.materialCost < best.materialCost) {
      return current;
    }

    if (current.materialCost === best.materialCost && current.requiredLinearMeters < best.requiredLinearMeters) {
      return current;
    }

    return best;
  });
}

function calculateRollGeometry(input: GeometryInput): GeometryResult {
  const rollWidthCm = Math.max(0, toFiniteNumber(input.rollWidthCm));
  const quantity = Math.max(0, Math.floor(toFiniteNumber(input.quantity)));
  const wastePct = sanitizePct(input.wastePct);
  const pricingMode: RollPricingMode = input.pricingMode ?? 'linear_meter';
  const unitCostLinearMeter = Math.max(0, toFiniteNumber(input.unitCostLinearMeter));
  const unitCostSquareMeter = Math.max(0, toFiniteNumber(input.unitCostSquareMeter));

  const normalWidth = Math.max(0.01, toFiniteNumber(input.pieceWidthCm) + Math.max(0, input.bleedCm) * 2 + Math.max(0, input.gapCm));
  const normalHeight = Math.max(0.01, toFiniteNumber(input.pieceHeightCm) + Math.max(0, input.bleedCm) * 2 + Math.max(0, input.gapCm));

  const candidates: RollCandidate[] = [];
  const normal = evaluateRollCandidate(
    'normal',
    rollWidthCm,
    quantity,
    normalWidth,
    normalHeight,
    wastePct,
    pricingMode,
    unitCostLinearMeter,
    unitCostSquareMeter,
  );

  if (normal) {
    candidates.push(normal);
  }

  if (input.allowRotation) {
    const rotated = evaluateRollCandidate(
      'rotated',
      rollWidthCm,
      quantity,
      normalHeight,
      normalWidth,
      wastePct,
      pricingMode,
      unitCostLinearMeter,
      unitCostSquareMeter,
    );

    if (rotated) {
      candidates.push(rotated);
    }
  }

  const best = chooseBestRollCandidate(candidates);

  if (!best || best.piecesPerLinearMeter <= 0) {
    return createNotFeasibleResult({ ...input, substrateKind: 'roll', pricingMode });
  }

  const usedAreaCm2 = Math.max(0, toFiniteNumber(input.pieceWidthCm) * toFiniteNumber(input.pieceHeightCm) * quantity);
  const wasteAreaCm2 = Math.max(0, best.consumedAreaCm2 - usedAreaCm2);
  const utilizationPct = best.consumedAreaCm2 > 0 ? (usedAreaCm2 / best.consumedAreaCm2) * 100 : 0;

  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: 'roll',
    pricingMode,
    layoutMode: best.orientation === 'normal' ? 'normal' : 'rotated',
    piecesPerSheetOrRun: best.piecesPerLinearMeter,
    utilizationPct: round(utilizationPct, 4),
    usedAreaCm2: round(usedAreaCm2, 4),
    wasteAreaCm2: round(wasteAreaCm2, 4),
    cutPlan: best.cutPlan,
    materialConsumption: {
      requiredLinearMeters: round(best.requiredLinearMeters, 4),
      consumedAreaM2: round(best.consumedAreaM2, 4),
    },
    materialCost: round(best.materialCost, 4),
    sections: [],
  };
}

export function calculateGeometry(input: GeometryInput): GeometryResult {
  const sanitizedInput: GeometryInput = {
    ...input,
    strategy: 'guillotine_2stage_mixed',
    pieceWidthCm: Math.max(0, toFiniteNumber(input.pieceWidthCm)),
    pieceHeightCm: Math.max(0, toFiniteNumber(input.pieceHeightCm)),
    quantity: Math.max(0, Math.floor(toFiniteNumber(input.quantity))),
    bleedCm: Math.max(0, toFiniteNumber(input.bleedCm)),
    gapCm: Math.max(0, toFiniteNumber(input.gapCm)),
    gripperCm: Math.max(0, toFiniteNumber(input.gripperCm)),
    wastePct: sanitizePct(input.wastePct),
    allowRotation: input.allowRotation !== false,
    pricingMode: input.pricingMode ?? 'linear_meter',
  };

  if (sanitizedInput.pieceWidthCm <= 0 || sanitizedInput.pieceHeightCm <= 0 || sanitizedInput.quantity <= 0) {
    return createNotFeasibleResult(sanitizedInput);
  }

  if (sanitizedInput.substrateKind === 'roll') {
    return calculateRollGeometry(sanitizedInput);
  }

  return calculateSheetGeometry(sanitizedInput);
}
