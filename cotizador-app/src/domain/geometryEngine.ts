import type {
  GeometryAlternativeSnapshot,
  GeometryCutPlanStep,
  GeometryMaterialConsumption,
  GeometryOptimizationMode,
  GeometryPlacement,
  GeometryWasteBreakdown,
  GrainDirection,
  RollPricingMode,
  SubstrateKind,
} from '../types/database';
import { toFiniteNumber } from '../utils/financial';

type LayoutMode = 'normal' | 'rotated' | 'mixed_vertical' | 'mixed_horizontal' | 'not_feasible';
type Orientation = 'normal' | 'rotated';

interface PieceDimensions {
  widthCm: number;
  heightCm: number;
}

export interface SheetSection {
  orientation: Orientation;
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
  optimizationMode?: GeometryOptimizationMode;
  grainDirection?: GrainDirection;
  weightGrams?: number;
  purchaseIncrement?: number;
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
  containerWidthCm: number;
  containerHeightCm: number;
  cutPlan: GeometryCutPlanStep[];
  materialConsumption: GeometryMaterialConsumption;
  materialCost: number;
  wasteBreakdown: GeometryWasteBreakdown;
  placements: GeometryPlacement[];
  alternatives: GeometryAlternativeSnapshot[];
  warnings: string[];
  manualOverride: boolean;
  geometryVerified: boolean;
  sections: SheetSection[];
}

interface SheetCandidate {
  id: string;
  label: string;
  layoutMode: LayoutMode;
  total: number;
  sections: SheetSection[];
}

interface RollCandidate {
  id: string;
  label: string;
  orientation: Orientation;
  columnsAcross: number;
  rowsRequired: number;
  rowPitchCm: number;
  piecesPerLinearMeter: number;
  requiredLinearMeters: number;
  consumedAreaCm2: number;
  consumedAreaM2: number;
  materialCost: number;
  cutPlan: GeometryCutPlanStep[];
  placements: GeometryPlacement[];
  previewHeightCm: number;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sanitizePct(value: number): number {
  return Math.max(0, toFiniteNumber(value));
}

function ceilToIncrement(value: number, increment: number): number {
  const safeIncrement = increment > 0 ? increment : 0.01;
  return Math.ceil(value / safeIncrement) * safeIncrement;
}

function countAlong(availableCm: number, pieceCm: number, gapCm: number): number {
  if (availableCm <= 0 || pieceCm <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor((availableCm + gapCm) / (pieceCm + gapCm)));
}

function occupiedLength(count: number, pieceCm: number, gapCm: number): number {
  if (count <= 0) {
    return 0;
  }

  return count * pieceCm + Math.max(0, count - 1) * gapCm;
}

function orientationDimensions(
  orientation: Orientation,
  normal: PieceDimensions,
): PieceDimensions {
  return orientation === 'normal'
    ? normal
    : { widthCm: normal.heightCm, heightCm: normal.widthCm };
}

function isOrientationAllowed(
  orientation: Orientation,
  input: GeometryInput,
): boolean {
  const mode = input.optimizationMode ?? 'best_fit';

  if (orientation === 'rotated' && !input.allowRotation) {
    return false;
  }

  if (mode === 'fixed_normal' || mode === 'preserve_grain') {
    return orientation === 'normal';
  }

  if (mode === 'fixed_rotated') {
    return orientation === 'rotated';
  }

  return true;
}

function emptyBreakdown(): GeometryWasteBreakdown {
  return {
    finishedPieceAreaCm2: 0,
    printOccupiedAreaCm2: 0,
    geometricWasteAreaCm2: 0,
    nonPrintableAreaCm2: 0,
    productionWasteAreaCm2: 0,
  };
}

function createNotFeasibleResult(input: GeometryInput, warnings: string[] = []): GeometryResult {
  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: input.substrateKind,
    pricingMode: input.pricingMode ?? 'linear_meter',
    layoutMode: 'not_feasible',
    piecesPerSheetOrRun: 0,
    utilizationPct: 0,
    usedAreaCm2: 0,
    wasteAreaCm2: 0,
    containerWidthCm: input.substrateKind === 'roll' ? toFiniteNumber(input.rollWidthCm) : toFiniteNumber(input.sheetWidthCm),
    containerHeightCm: input.substrateKind === 'roll' ? 100 : toFiniteNumber(input.sheetHeightCm),
    cutPlan: [],
    materialConsumption: {},
    materialCost: 0,
    wasteBreakdown: emptyBreakdown(),
    placements: [],
    alternatives: [],
    warnings: warnings.length > 0 ? warnings : ['La pieza no cabe en el material con los parametros actuales.'],
    manualOverride: false,
    geometryVerified: false,
    sections: [],
  };
}

function buildSection(
  orientation: Orientation,
  originXCm: number,
  originYCm: number,
  availableWidthCm: number,
  availableHeightCm: number,
  normalPiece: PieceDimensions,
  gapCm: number,
): SheetSection | null {
  const piece = orientationDimensions(orientation, normalPiece);
  const countX = countAlong(availableWidthCm, piece.widthCm, gapCm);
  const countY = countAlong(availableHeightCm, piece.heightCm, gapCm);
  const pieceCount = countX * countY;

  if (pieceCount <= 0) {
    return null;
  }

  return {
    orientation,
    originXCm,
    originYCm,
    widthCm: occupiedLength(countX, piece.widthCm, gapCm),
    heightCm: occupiedLength(countY, piece.heightCm, gapCm),
    countX,
    countY,
    pieceCount,
  };
}

function buildSheetPlacements(
  sections: SheetSection[],
  normalPiece: PieceDimensions,
  gapCm: number,
  gripperCm: number,
): GeometryPlacement[] {
  const placements: GeometryPlacement[] = [];

  sections.forEach((section) => {
    const piece = orientationDimensions(section.orientation, normalPiece);

    for (let row = 0; row < section.countY; row += 1) {
      for (let column = 0; column < section.countX; column += 1) {
        placements.push({
          xCm: section.originXCm + column * (piece.widthCm + gapCm),
          yCm: gripperCm + section.originYCm + row * (piece.heightCm + gapCm),
          widthCm: piece.widthCm,
          heightCm: piece.heightCm,
          orientation: section.orientation,
        });
      }
    }
  });

  return placements;
}

function buildSheetCutPlan(
  layoutMode: LayoutMode,
  sections: SheetSection[],
  normalPiece: PieceDimensions,
  gapCm: number,
): GeometryCutPlanStep[] {
  const steps: GeometryCutPlanStep[] = [];

  if (layoutMode === 'mixed_vertical' && sections.length === 2) {
    steps.push({
      stage: 1,
      axis: 'vertical',
      description: 'Separar las dos zonas de orientacion',
      sizeCm: round(sections[0].widthCm, 3),
      count: 1,
    });
  } else if (layoutMode === 'mixed_horizontal' && sections.length === 2) {
    steps.push({
      stage: 1,
      axis: 'horizontal',
      description: 'Separar las dos zonas de orientacion',
      sizeCm: round(sections[0].heightCm, 3),
      count: 1,
    });
  }

  sections.forEach((section, index) => {
    const piece = orientationDimensions(section.orientation, normalPiece);

    if (section.countX > 1) {
      steps.push({
        stage: 2,
        axis: 'vertical',
        description: `Zona ${index + 1}: formar ${section.countX} columnas (${section.orientation})`,
        sizeCm: round(piece.widthCm + gapCm, 3),
        count: section.countX - 1,
      });
    }

    if (section.countY > 1) {
      steps.push({
        stage: 2,
        axis: 'horizontal',
        description: `Zona ${index + 1}: formar ${section.countY} filas (${section.orientation})`,
        sizeCm: round(piece.heightCm + gapCm, 3),
        count: section.countY - 1,
      });
    }
  });

  return steps;
}

function addPureCandidate(
  candidates: SheetCandidate[],
  orientation: Orientation,
  usableWidthCm: number,
  usableHeightCm: number,
  piece: PieceDimensions,
  gapCm: number,
): void {
  const section = buildSection(orientation, 0, 0, usableWidthCm, usableHeightCm, piece, gapCm);

  if (!section) {
    return;
  }

  candidates.push({
    id: orientation,
    label: orientation === 'normal' ? 'Orientacion original' : 'Pieza girada 90 grados',
    layoutMode: orientation,
    total: section.pieceCount,
    sections: [section],
  });
}

function addVerticalMixedCandidates(
  candidates: SheetCandidate[],
  firstOrientation: Orientation,
  secondOrientation: Orientation,
  usableWidthCm: number,
  usableHeightCm: number,
  normalPiece: PieceDimensions,
  gapCm: number,
): void {
  const firstPiece = orientationDimensions(firstOrientation, normalPiece);
  const maxFirstColumns = countAlong(usableWidthCm, firstPiece.widthCm, gapCm);

  for (let firstColumns = 1; firstColumns <= maxFirstColumns; firstColumns += 1) {
    const firstWidth = occupiedLength(firstColumns, firstPiece.widthCm, gapCm);
    const remainingWidth = usableWidthCm - firstWidth - gapCm;

    if (remainingWidth <= 0) {
      continue;
    }

    const first = buildSection(
      firstOrientation,
      0,
      0,
      firstWidth,
      usableHeightCm,
      normalPiece,
      gapCm,
    );
    const second = buildSection(
      secondOrientation,
      firstWidth + gapCm,
      0,
      remainingWidth,
      usableHeightCm,
      normalPiece,
      gapCm,
    );

    if (!first || !second) {
      continue;
    }

    candidates.push({
      id: `mixed-v-${firstOrientation}-${firstColumns}`,
      label: `Mixto vertical (${firstOrientation} + ${secondOrientation})`,
      layoutMode: 'mixed_vertical',
      total: first.pieceCount + second.pieceCount,
      sections: [first, second],
    });
  }
}

function addHorizontalMixedCandidates(
  candidates: SheetCandidate[],
  firstOrientation: Orientation,
  secondOrientation: Orientation,
  usableWidthCm: number,
  usableHeightCm: number,
  normalPiece: PieceDimensions,
  gapCm: number,
): void {
  const firstPiece = orientationDimensions(firstOrientation, normalPiece);
  const maxFirstRows = countAlong(usableHeightCm, firstPiece.heightCm, gapCm);

  for (let firstRows = 1; firstRows <= maxFirstRows; firstRows += 1) {
    const firstHeight = occupiedLength(firstRows, firstPiece.heightCm, gapCm);
    const remainingHeight = usableHeightCm - firstHeight - gapCm;

    if (remainingHeight <= 0) {
      continue;
    }

    const first = buildSection(
      firstOrientation,
      0,
      0,
      usableWidthCm,
      firstHeight,
      normalPiece,
      gapCm,
    );
    const second = buildSection(
      secondOrientation,
      0,
      firstHeight + gapCm,
      usableWidthCm,
      remainingHeight,
      normalPiece,
      gapCm,
    );

    if (!first || !second) {
      continue;
    }

    candidates.push({
      id: `mixed-h-${firstOrientation}-${firstRows}`,
      label: `Mixto horizontal (${firstOrientation} + ${secondOrientation})`,
      layoutMode: 'mixed_horizontal',
      total: first.pieceCount + second.pieceCount,
      sections: [first, second],
    });
  }
}

function evaluateSheetCandidates(
  input: GeometryInput,
  usableWidthCm: number,
  usableHeightCm: number,
  normalPiece: PieceDimensions,
  gapCm: number,
): SheetCandidate[] {
  const candidates: SheetCandidate[] = [];
  const normalAllowed = isOrientationAllowed('normal', input);
  const rotatedAllowed = isOrientationAllowed('rotated', input);

  if (normalAllowed) {
    addPureCandidate(candidates, 'normal', usableWidthCm, usableHeightCm, normalPiece, gapCm);
  }

  if (rotatedAllowed) {
    addPureCandidate(candidates, 'rotated', usableWidthCm, usableHeightCm, normalPiece, gapCm);
  }

  if (normalAllowed && rotatedAllowed && (input.optimizationMode ?? 'best_fit') === 'best_fit') {
    addVerticalMixedCandidates(candidates, 'normal', 'rotated', usableWidthCm, usableHeightCm, normalPiece, gapCm);
    addVerticalMixedCandidates(candidates, 'rotated', 'normal', usableWidthCm, usableHeightCm, normalPiece, gapCm);
    addHorizontalMixedCandidates(candidates, 'normal', 'rotated', usableWidthCm, usableHeightCm, normalPiece, gapCm);
    addHorizontalMixedCandidates(candidates, 'rotated', 'normal', usableWidthCm, usableHeightCm, normalPiece, gapCm);
  }

  return candidates;
}

function sheetCandidateCutCount(
  candidate: SheetCandidate,
  normalPiece: PieceDimensions,
  gapCm: number,
): number {
  return buildSheetCutPlan(candidate.layoutMode, candidate.sections, normalPiece, gapCm)
    .reduce((total, step) => total + step.count, 0);
}

function selectBestSheetCandidate(
  candidates: SheetCandidate[],
  normalPiece: PieceDimensions,
  gapCm: number,
): SheetCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    const cutDifference =
      sheetCandidateCutCount(left, normalPiece, gapCm) -
      sheetCandidateCutCount(right, normalPiece, gapCm);

    if (cutDifference !== 0) {
      return cutDifference;
    }

    return left.sections.length - right.sections.length;
  })[0];
}

function buildSheetAlternative(
  candidate: SheetCandidate,
  input: GeometryInput,
  sheetAreaCm2: number,
  normalPrintPiece: PieceDimensions,
  gapCm: number,
): GeometryAlternativeSnapshot {
  const productionQuantity = Math.ceil(input.quantity * (1 + input.wastePct));
  const requiredSheets = Math.ceil(productionQuantity / candidate.total);
  const materialCost = requiredSheets * Math.max(0, toFiniteNumber(input.unitCostSheet));
  const finishedArea = input.pieceWidthCm * input.pieceHeightCm * candidate.total;

  return {
    id: candidate.id,
    label: candidate.label,
    layoutMode: candidate.layoutMode,
    piecesPerSheetOrRun: candidate.total,
    utilizationPct: sheetAreaCm2 > 0 ? round((finishedArea / sheetAreaCm2) * 100, 2) : 0,
    materialCost: round(materialCost, 2),
    cutCount: sheetCandidateCutCount(candidate, normalPrintPiece, gapCm),
  };
}

function calculateSheetGeometry(input: GeometryInput): GeometryResult {
  const sheetWidthCm = Math.max(0, toFiniteNumber(input.sheetWidthCm));
  const sheetHeightCm = Math.max(0, toFiniteNumber(input.sheetHeightCm));
  const gripperCm = Math.min(sheetHeightCm, Math.max(0, toFiniteNumber(input.gripperCm)));
  const bleedCm = Math.max(0, toFiniteNumber(input.bleedCm));
  const gapCm = Math.max(0, toFiniteNumber(input.gapCm));
  const usableWidthCm = sheetWidthCm;
  const usableHeightCm = Math.max(0, sheetHeightCm - gripperCm);
  const normalPrintPiece = {
    widthCm: Math.max(0.01, input.pieceWidthCm + bleedCm * 2),
    heightCm: Math.max(0.01, input.pieceHeightCm + bleedCm * 2),
  };
  const candidates = evaluateSheetCandidates(input, usableWidthCm, usableHeightCm, normalPrintPiece, gapCm);
  const best = selectBestSheetCandidate(candidates, normalPrintPiece, gapCm);

  if (!best || best.total <= 0) {
    return createNotFeasibleResult(input);
  }

  const physicalAreaCm2 = sheetWidthCm * sheetHeightCm;
  const usableAreaCm2 = usableWidthCm * usableHeightCm;
  const finishedAreaPerLayout = input.pieceWidthCm * input.pieceHeightCm * best.total;
  const printAreaPerLayout = normalPrintPiece.widthCm * normalPrintPiece.heightCm * best.total;
  const nonPrintableAreaCm2 = sheetWidthCm * gripperCm;
  const geometricWasteAreaCm2 = Math.max(0, usableAreaCm2 - printAreaPerLayout);
  const utilizationPct = physicalAreaCm2 > 0 ? (finishedAreaPerLayout / physicalAreaCm2) * 100 : 0;
  const productionQuantity = Math.ceil(input.quantity * (1 + input.wastePct));
  const requiredSheets = Math.ceil(productionQuantity / best.total);
  const baseSheets = Math.ceil(input.quantity / best.total);
  const productionWasteAreaCm2 = Math.max(0, requiredSheets - baseSheets) * physicalAreaCm2;
  const materialCost = requiredSheets * Math.max(0, toFiniteNumber(input.unitCostSheet));
  const purchasedAreaM2 = (requiredSheets * physicalAreaCm2) / 10000;
  const estimatedWeightKg = input.weightGrams
    ? (purchasedAreaM2 * Math.max(0, input.weightGrams)) / 1000
    : undefined;
  const warnings: string[] = [];

  if (
    input.grainDirection &&
    input.grainDirection !== 'unknown' &&
    (input.optimizationMode ?? 'best_fit') === 'best_fit' &&
    best.sections.some((section) => section.orientation === 'rotated')
  ) {
    warnings.push('El montaje recomendado gira parte de las piezas; valida el sentido de fibra antes de producir.');
  }

  const alternatives = candidates
    .map((candidate) => buildSheetAlternative(candidate, input, physicalAreaCm2, normalPrintPiece, gapCm))
    .sort((left, right) => {
      if (right.piecesPerSheetOrRun !== left.piecesPerSheetOrRun) {
        return right.piecesPerSheetOrRun - left.piecesPerSheetOrRun;
      }
      if (left.materialCost !== right.materialCost) {
        return left.materialCost - right.materialCost;
      }
      return left.cutCount - right.cutCount;
    })
    .filter((alternative, index, list) =>
      index === list.findIndex((item) =>
        item.layoutMode === alternative.layoutMode &&
        item.piecesPerSheetOrRun === alternative.piecesPerSheetOrRun))
    .slice(0, 4);

  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: 'sheet',
    pricingMode: input.pricingMode ?? 'linear_meter',
    layoutMode: best.layoutMode,
    piecesPerSheetOrRun: best.total,
    utilizationPct: round(utilizationPct, 4),
    usedAreaCm2: round(finishedAreaPerLayout, 4),
    wasteAreaCm2: round(geometricWasteAreaCm2 + nonPrintableAreaCm2, 4),
    containerWidthCm: sheetWidthCm,
    containerHeightCm: sheetHeightCm,
    cutPlan: buildSheetCutPlan(best.layoutMode, best.sections, normalPrintPiece, gapCm),
    materialConsumption: {
      requiredSheets,
      productionQuantity,
      estimatedWeightKg: estimatedWeightKg !== undefined ? round(estimatedWeightKg, 3) : undefined,
      consumedAreaM2: round(purchasedAreaM2, 4),
    },
    materialCost: round(materialCost, 4),
    wasteBreakdown: {
      finishedPieceAreaCm2: round(finishedAreaPerLayout, 4),
      printOccupiedAreaCm2: round(printAreaPerLayout, 4),
      geometricWasteAreaCm2: round(geometricWasteAreaCm2, 4),
      nonPrintableAreaCm2: round(nonPrintableAreaCm2, 4),
      productionWasteAreaCm2: round(productionWasteAreaCm2, 4),
    },
    placements: buildSheetPlacements(best.sections, normalPrintPiece, gapCm, gripperCm),
    alternatives,
    warnings,
    manualOverride: false,
    geometryVerified: true,
    sections: best.sections,
  };
}

function buildRollPlacements(
  orientation: Orientation,
  columnsAcross: number,
  rowsRequired: number,
  piece: PieceDimensions,
  gapCm: number,
): { placements: GeometryPlacement[]; previewHeightCm: number } {
  const previewRows = Math.min(rowsRequired, 8);
  const placements: GeometryPlacement[] = [];

  for (let row = 0; row < previewRows; row += 1) {
    for (let column = 0; column < columnsAcross; column += 1) {
      placements.push({
        xCm: column * (piece.widthCm + gapCm),
        yCm: row * (piece.heightCm + gapCm),
        widthCm: piece.widthCm,
        heightCm: piece.heightCm,
        orientation,
      });
    }
  }

  return {
    placements,
    previewHeightCm: occupiedLength(previewRows, piece.heightCm, gapCm),
  };
}

function evaluateRollCandidate(
  input: GeometryInput,
  orientation: Orientation,
  normalPrintPiece: PieceDimensions,
  rollWidthCm: number,
  gapCm: number,
  productionQuantity: number,
): RollCandidate | null {
  const piece = orientationDimensions(orientation, normalPrintPiece);
  const columnsAcross = countAlong(rollWidthCm, piece.widthCm, gapCm);

  if (columnsAcross <= 0) {
    return null;
  }

  const rowsRequired = Math.ceil(productionQuantity / columnsAcross);
  const exactLengthCm = occupiedLength(rowsRequired, piece.heightCm, gapCm);
  const exactLinearMeters = exactLengthCm / 100;
  const purchaseIncrement = Math.max(0.01, toFiniteNumber(input.purchaseIncrement, 0.01));
  const requiredLinearMeters = ceilToIncrement(exactLinearMeters, purchaseIncrement);
  const consumedAreaM2 = (rollWidthCm / 100) * requiredLinearMeters;
  const consumedAreaCm2 = consumedAreaM2 * 10000;
  const pricingMode = input.pricingMode ?? 'linear_meter';
  const materialCost =
    pricingMode === 'square_meter'
      ? consumedAreaM2 * Math.max(0, toFiniteNumber(input.unitCostSquareMeter))
      : requiredLinearMeters * Math.max(0, toFiniteNumber(input.unitCostLinearMeter));
  const piecesPerLinearMeter = (columnsAcross * 100) / (piece.heightCm + gapCm);
  const preview = buildRollPlacements(orientation, columnsAcross, rowsRequired, piece, gapCm);

  return {
    id: orientation,
    label: orientation === 'normal' ? 'Orientacion original' : 'Pieza girada 90 grados',
    orientation,
    columnsAcross,
    rowsRequired,
    rowPitchCm: piece.heightCm + gapCm,
    piecesPerLinearMeter,
    requiredLinearMeters,
    consumedAreaCm2,
    consumedAreaM2,
    materialCost,
    cutPlan: [
      {
        stage: 1,
        axis: 'vertical',
        description: `Formar ${columnsAcross} columnas en el ancho del rollo`,
        sizeCm: round(piece.widthCm + gapCm, 3),
        count: Math.max(0, columnsAcross - 1),
      },
      {
        stage: 2,
        axis: 'horizontal',
        description: `Realizar ${rowsRequired} pasos transversales`,
        sizeCm: round(piece.heightCm + gapCm, 3),
        count: Math.max(0, rowsRequired - 1),
      },
    ],
    placements: preview.placements,
    previewHeightCm: preview.previewHeightCm,
  };
}

function selectBestRollCandidate(candidates: RollCandidate[]): RollCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (left.materialCost !== right.materialCost) {
      return left.materialCost - right.materialCost;
    }
    if (left.requiredLinearMeters !== right.requiredLinearMeters) {
      return left.requiredLinearMeters - right.requiredLinearMeters;
    }
    return left.cutPlan.reduce((total, step) => total + step.count, 0) -
      right.cutPlan.reduce((total, step) => total + step.count, 0);
  })[0];
}

function calculateRollGeometry(input: GeometryInput): GeometryResult {
  const rollWidthCm = Math.max(0, toFiniteNumber(input.rollWidthCm));
  const bleedCm = Math.max(0, toFiniteNumber(input.bleedCm));
  const gapCm = Math.max(0, toFiniteNumber(input.gapCm));
  const productionQuantity = Math.ceil(input.quantity * (1 + input.wastePct));
  const normalPrintPiece = {
    widthCm: Math.max(0.01, input.pieceWidthCm + bleedCm * 2),
    heightCm: Math.max(0.01, input.pieceHeightCm + bleedCm * 2),
  };
  const candidates: RollCandidate[] = [];

  if (isOrientationAllowed('normal', input)) {
    const normal = evaluateRollCandidate(input, 'normal', normalPrintPiece, rollWidthCm, gapCm, productionQuantity);
    if (normal) candidates.push(normal);
  }

  if (isOrientationAllowed('rotated', input)) {
    const rotated = evaluateRollCandidate(input, 'rotated', normalPrintPiece, rollWidthCm, gapCm, productionQuantity);
    if (rotated) candidates.push(rotated);
  }

  const best = selectBestRollCandidate(candidates);

  if (!best) {
    return createNotFeasibleResult(input);
  }

  const finishedAreaCm2 = input.pieceWidthCm * input.pieceHeightCm * input.quantity;
  const printOccupiedAreaCm2 = normalPrintPiece.widthCm * normalPrintPiece.heightCm * productionQuantity;
  const geometricWasteAreaCm2 = Math.max(0, best.consumedAreaCm2 - printOccupiedAreaCm2);
  const productionWasteAreaCm2 =
    Math.max(0, productionQuantity - input.quantity) * normalPrintPiece.widthCm * normalPrintPiece.heightCm;
  const utilizationPct = best.consumedAreaCm2 > 0 ? (finishedAreaCm2 / best.consumedAreaCm2) * 100 : 0;
  const estimatedWeightKg = input.weightGrams
    ? (best.consumedAreaM2 * Math.max(0, input.weightGrams)) / 1000
    : undefined;
  const warnings: string[] = [];

  if (
    input.grainDirection &&
    input.grainDirection !== 'unknown' &&
    (input.optimizationMode ?? 'best_fit') === 'best_fit' &&
    best.orientation === 'rotated'
  ) {
    warnings.push('La opcion mas economica gira la pieza; valida la direccion del material.');
  }

  const alternatives = candidates
    .map<GeometryAlternativeSnapshot>((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      layoutMode: candidate.orientation,
      piecesPerSheetOrRun: round(candidate.piecesPerLinearMeter, 3),
      utilizationPct: candidate.consumedAreaCm2 > 0
        ? round((finishedAreaCm2 / candidate.consumedAreaCm2) * 100, 2)
        : 0,
      materialCost: round(candidate.materialCost, 2),
      cutCount: candidate.cutPlan.reduce((total, step) => total + step.count, 0),
    }))
    .sort((left, right) => left.materialCost - right.materialCost);

  return {
    strategy: 'guillotine_2stage_mixed',
    substrateKind: 'roll',
    pricingMode: input.pricingMode ?? 'linear_meter',
    layoutMode: best.orientation,
    piecesPerSheetOrRun: round(best.piecesPerLinearMeter, 4),
    utilizationPct: round(utilizationPct, 4),
    usedAreaCm2: round(finishedAreaCm2, 4),
    wasteAreaCm2: round(geometricWasteAreaCm2, 4),
    containerWidthCm: rollWidthCm,
    containerHeightCm: Math.max(1, best.previewHeightCm),
    cutPlan: best.cutPlan,
    materialConsumption: {
      requiredLinearMeters: round(best.requiredLinearMeters, 4),
      consumedAreaM2: round(best.consumedAreaM2, 4),
      productionQuantity,
      estimatedWeightKg: estimatedWeightKg !== undefined ? round(estimatedWeightKg, 3) : undefined,
    },
    materialCost: round(best.materialCost, 4),
    wasteBreakdown: {
      finishedPieceAreaCm2: round(finishedAreaCm2, 4),
      printOccupiedAreaCm2: round(printOccupiedAreaCm2, 4),
      geometricWasteAreaCm2: round(geometricWasteAreaCm2, 4),
      nonPrintableAreaCm2: 0,
      productionWasteAreaCm2: round(productionWasteAreaCm2, 4),
    },
    placements: best.placements,
    alternatives,
    warnings,
    manualOverride: false,
    geometryVerified: true,
    sections: [],
  };
}

export function applyManualGeometryOverride(
  result: GeometryResult,
  input: GeometryInput,
  forcedYield: number,
): GeometryResult {
  const safeYield = Math.max(1, toFiniteNumber(forcedYield, 1));
  const productionQuantity = Math.ceil(input.quantity * (1 + input.wastePct));
  const warning = 'El rendimiento fue forzado manualmente; el mapa y la secuencia de cortes no estan verificados.';

  if (input.substrateKind === 'roll') {
    const purchaseIncrement = Math.max(0.01, toFiniteNumber(input.purchaseIncrement, 0.01));
    const requiredLinearMeters = ceilToIncrement(productionQuantity / safeYield, purchaseIncrement);
    const rollWidthCm = Math.max(0, toFiniteNumber(input.rollWidthCm));
    const consumedAreaM2 = (rollWidthCm / 100) * requiredLinearMeters;
    const materialCost =
      (input.pricingMode ?? 'linear_meter') === 'square_meter'
        ? consumedAreaM2 * Math.max(0, toFiniteNumber(input.unitCostSquareMeter))
        : requiredLinearMeters * Math.max(0, toFiniteNumber(input.unitCostLinearMeter));

    return {
      ...result,
      piecesPerSheetOrRun: safeYield,
      utilizationPct: 0,
      materialConsumption: {
        ...result.materialConsumption,
        productionQuantity,
        requiredLinearMeters: round(requiredLinearMeters, 4),
        consumedAreaM2: round(consumedAreaM2, 4),
      },
      materialCost: round(materialCost, 4),
      cutPlan: [],
      placements: [],
      warnings: [...result.warnings, warning],
      manualOverride: true,
      geometryVerified: false,
    };
  }

  const requiredSheets = Math.ceil(productionQuantity / safeYield);
  const sheetAreaCm2 = Math.max(0, toFiniteNumber(input.sheetWidthCm) * toFiniteNumber(input.sheetHeightCm));
  const consumedAreaM2 = (requiredSheets * sheetAreaCm2) / 10000;
  const materialCost = requiredSheets * Math.max(0, toFiniteNumber(input.unitCostSheet));
  const estimatedWeightKg = input.weightGrams
    ? (consumedAreaM2 * Math.max(0, input.weightGrams)) / 1000
    : undefined;

  return {
    ...result,
    piecesPerSheetOrRun: safeYield,
    utilizationPct: 0,
    materialConsumption: {
      ...result.materialConsumption,
      productionQuantity,
      requiredSheets,
      consumedAreaM2: round(consumedAreaM2, 4),
      estimatedWeightKg: estimatedWeightKg !== undefined ? round(estimatedWeightKg, 3) : undefined,
    },
    materialCost: round(materialCost, 4),
    cutPlan: [],
    placements: [],
    warnings: [...result.warnings, warning],
    manualOverride: true,
    geometryVerified: false,
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
    optimizationMode: input.optimizationMode ?? 'best_fit',
    grainDirection: input.grainDirection ?? 'unknown',
    pricingMode: input.pricingMode ?? 'linear_meter',
  };

  if (sanitizedInput.pieceWidthCm <= 0 || sanitizedInput.pieceHeightCm <= 0 || sanitizedInput.quantity <= 0) {
    return createNotFeasibleResult(sanitizedInput, ['Ingresa medidas y cantidad mayores que cero.']);
  }

  if (sanitizedInput.substrateKind === 'roll') {
    return calculateRollGeometry(sanitizedInput);
  }

  return calculateSheetGeometry(sanitizedInput);
}
