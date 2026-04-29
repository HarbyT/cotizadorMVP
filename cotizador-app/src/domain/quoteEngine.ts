import type { FinishType, InkType, MachineType, PaperType, PlateType, POPItemType } from '../types/database';
import { safeMarginPercentage, safeProfitOnBasePercentage, safeSuggestedPrice, toFiniteNumber } from '../utils/financial';

const DOUBLE_SIDED_FORMATS = new Set(['1x1', '2x2', '4x1', '4x4']);

type PrintFormat = '1x0' | '1x1' | '2x0' | '2x2' | '4x0' | '4x1' | '4x4' | 'Manual';

type ProjectMode = 'Papel' | 'POP';

type MachineMetricLabel = 'Unidades' | 'Millares';

export interface QuoteEngineInput {
  projectMode: ProjectMode;
  quantity: number;
  pliegosTotales: number;
  printFormat: PrintFormat;
  numberOfInks: number;
  sellMachineProcess: boolean;
  sellInkProcess: boolean;
  targetMargin: number;
  customSalePrice: number | null;
  materialCostOverride: number | null;
  strategicMachinePrice: number | null;
  forceMachineCost: number | null;
  forcePassesOrColors: number | null;
  strategicPlatePrice: number | null;
  forcePlatesCost: number | null;
  strategicInkPrice: number | null;
  forceInkCost: number | null;
  strategicFinishPrices: Record<string, number | null>;
  selectedFinishIds: string[];
  paper: PaperType | null;
  machine: MachineType | null;
  plate: PlateType | null;
  ink: InkType | null;
  popItem: POPItemType | null;
  finishes: FinishType[];
}

export interface QuoteFinishDetail {
  id: string;
  name: string;
  cost: number;
}

export interface QuoteEngineResult {
  isPopMode: boolean;
  popCost: number;
  costPaper: number;
  paperCostOverridden: boolean;
  costMachine: number;
  costPlates: number;
  costInk: number;
  costFinishes: number;
  baseCost: number;
  suggestedPrice: number;
  finalPrice: number;
  profitValue: number;
  profitOnBasePct: number;
  marginOnSalePct: number;
  targetMarkupPct: number;
  actualMarginPct: number;
  displayMarginPct: number;
  isDanger: boolean;
  passesOrColors: number;
  facesLogicPrint: string;
  passesForced: boolean;
  operativeUnitsDisplay: number;
  machineMetricLabel: MachineMetricLabel;
  machineVariableCost: number;
  machineSetupCostApplied: number;
  machineVariableCostApplied: number;
  machineCostForced: boolean;
  platesCount: number;
  baseValInk: number;
  baseValPlate: number;
  platesCostForced: boolean;
  inkCostForced: boolean;
  finishDetails: QuoteFinishDetail[];
}

interface PrintContext {
  passesOrColors: number;
  facesLogicPrint: string;
  isForced: boolean;
}

function resolvePrintContext(
  machine: MachineType | null,
  numberOfInks: number,
  printFormat: PrintFormat,
  forcedPasses: number | null,
): PrintContext {
  const safeInks = Math.max(1, Math.floor(toFiniteNumber(numberOfInks, 1)));
  const forcedValue = Math.max(0, Math.floor(toFiniteNumber(forcedPasses, 0)));

  if (forcedValue > 0) {
    return {
      passesOrColors: forcedValue,
      facesLogicPrint: `Forzado manual (${forcedValue} pases/colores)`,
      isForced: true,
    };
  }

  if (!machine) {
    return {
      passesOrColors: 1,
      facesLogicPrint: '1 Cara',
      isForced: false,
    };
  }

  if (machine.chargeType === 'Color') {
    return {
      passesOrColors: safeInks,
      facesLogicPrint: `${safeInks} Colores (Pases)`,
      isForced: false,
    };
  }

  if (DOUBLE_SIDED_FORMATS.has(printFormat)) {
    return {
      passesOrColors: 2,
      facesLogicPrint: 'Tiro y Retiro (2 Pases)',
      isForced: false,
    };
  }

  return {
    passesOrColors: 1,
    facesLogicPrint: 'Tiro (1 Pase)',
    isForced: false,
  };
}

export function calculateQuote(input: QuoteEngineInput): QuoteEngineResult {
  const isPopMode = input.projectMode === 'POP';
  const quantity = Math.max(0, toFiniteNumber(input.quantity));
  const pliegosTotales = Math.max(0, toFiniteNumber(input.pliegosTotales));
  const numberOfInks = Math.max(1, Math.floor(toFiniteNumber(input.numberOfInks, 1)));

  const popCost = isPopMode && input.popItem ? input.popItem.unitCost * quantity : 0;
  const fallbackPaperCost = !isPopMode && input.paper ? input.paper.costPerSheet * pliegosTotales : 0;
  const paperCostOverridden = !isPopMode && input.materialCostOverride !== null;
  const costPaper = paperCostOverridden ? Math.max(0, toFiniteNumber(input.materialCostOverride)) : fallbackPaperCost;

  const printContext = resolvePrintContext(input.machine, numberOfInks, input.printFormat, input.forcePassesOrColors);

  const machineVariableCost =
    input.strategicMachinePrice !== null ? input.strategicMachinePrice : input.machine?.variableCost ?? 0;

  let operativeUnitsDisplay = 0;
  let machineMetricLabel: MachineMetricLabel = 'Millares';
  let machineSetupCostApplied = 0;
  let machineVariableCostApplied = 0;
  let costMachine = 0;
  let machineCostForced = false;

  if (!isPopMode && input.machine) {
    if (input.machine.technology === 'Gran Formato') {
      operativeUnitsDisplay = pliegosTotales * printContext.passesOrColors;
      machineMetricLabel = 'Unidades';
    } else {
      operativeUnitsDisplay = (pliegosTotales / 1000) * printContext.passesOrColors;
      machineMetricLabel = 'Millares';
    }

    machineSetupCostApplied = input.machine.setupCost;
    machineVariableCostApplied = operativeUnitsDisplay * machineVariableCost;
    costMachine = input.sellMachineProcess ? machineSetupCostApplied + machineVariableCostApplied : 0;
  }

  if (!isPopMode && input.sellMachineProcess && input.forceMachineCost !== null) {
    costMachine = Math.max(0, toFiniteNumber(input.forceMachineCost));
    machineCostForced = true;
  }

  const platesCount = numberOfInks;
  const baseValPlate = input.strategicPlatePrice !== null ? input.strategicPlatePrice : input.plate?.baseCost ?? 0;

  let costPlates = 0;
  let platesCostForced = false;
  if (!isPopMode && (input.plate || input.strategicPlatePrice !== null)) {
    costPlates = baseValPlate * platesCount;
  }
  if (!isPopMode && input.forcePlatesCost !== null) {
    costPlates = Math.max(0, toFiniteNumber(input.forcePlatesCost));
    platesCostForced = true;
  }

  const baseValInk = input.strategicInkPrice !== null ? input.strategicInkPrice : input.ink?.baseCost ?? 0;
  let costInk = !isPopMode && input.sellInkProcess ? baseValInk * (pliegosTotales / 1000) * numberOfInks : 0;
  let inkCostForced = false;
  if (!isPopMode && input.sellInkProcess && input.forceInkCost !== null) {
    costInk = Math.max(0, toFiniteNumber(input.forceInkCost));
    inkCostForced = true;
  }

  let costFinishes = 0;
  const finishDetails: QuoteFinishDetail[] = [];

  input.selectedFinishIds.forEach((finishId) => {
    const finish = input.finishes.find((item) => item.id === finishId);

    if (!finish) {
      return;
    }

    const strategicCost = input.strategicFinishPrices[finish.id];
    let itemCost = 0;

    if (strategicCost !== undefined && strategicCost !== null) {
      itemCost = strategicCost;
    } else if (finish.chargeType === 'Unidad') {
      itemCost = quantity * finish.variableCost + finish.setupCost;
    } else if (finish.chargeType === 'Millar') {
      itemCost = (quantity / 1000) * finish.variableCost + finish.setupCost;
    } else if (finish.chargeType === 'Pliego') {
      itemCost = pliegosTotales * finish.variableCost + finish.setupCost;
    } else {
      itemCost = finish.setupCost;
    }

    costFinishes += itemCost;
    finishDetails.push({
      id: finish.id,
      name: finish.name,
      cost: itemCost,
    });
  });

  const baseCost = isPopMode
    ? popCost + costFinishes
    : costPaper + costPlates + costMachine + costInk + costFinishes;

  const suggestedPrice = safeSuggestedPrice(baseCost, input.targetMargin);
  const finalPrice = input.customSalePrice !== null ? input.customSalePrice : suggestedPrice;
  const profitValue = finalPrice - baseCost;
  const profitOnBasePct = safeProfitOnBasePercentage(finalPrice, baseCost);
  const marginOnSalePct = safeMarginPercentage(finalPrice, baseCost);
  const displayMarginPct = Number.isFinite(profitOnBasePct) ? profitOnBasePct : 0;
  const actualMarginPct = Number.isFinite(marginOnSalePct) ? marginOnSalePct : 0;
  const isDanger = baseCost > 0 && (!Number.isFinite(profitOnBasePct) || profitOnBasePct < 0);

  return {
    isPopMode,
    popCost,
    costPaper,
    paperCostOverridden,
    costMachine,
    costPlates,
    costInk,
    costFinishes,
    baseCost,
    suggestedPrice,
    finalPrice,
    profitValue,
    profitOnBasePct,
    marginOnSalePct,
    targetMarkupPct: input.targetMargin * 100,
    actualMarginPct,
    displayMarginPct,
    isDanger,
    passesOrColors: printContext.passesOrColors,
    facesLogicPrint: printContext.facesLogicPrint,
    passesForced: printContext.isForced,
    operativeUnitsDisplay,
    machineMetricLabel,
    machineVariableCost,
    machineSetupCostApplied,
    machineVariableCostApplied,
    machineCostForced,
    platesCount,
    baseValInk,
    baseValPlate,
    platesCostForced,
    inkCostForced,
    finishDetails,
  };
}
