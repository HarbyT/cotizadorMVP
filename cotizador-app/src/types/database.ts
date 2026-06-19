export type MachineTechnology = 'Offset' | 'Digital' | 'Gran Formato' | 'Plotter' | 'Flexo';
export type MachineChargeType = 'Policromia' | 'Color';
export type FinishChargeType = 'Pliego' | 'Millar' | 'Unidad' | 'Global';
export type QuoteStatus = 'Aprobada' | 'En Seguimiento';
export type UserRole = 'admin' | 'seller';
export type SubstrateKind = 'sheet' | 'roll';
export type RollPricingMode = 'linear_meter' | 'square_meter';
export type GrainDirection = 'long' | 'short' | 'unknown';
export type GeometryOptimizationMode = 'best_fit' | 'preserve_grain' | 'fixed_normal' | 'fixed_rotated';

export interface ClientType {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  documentId?: string;
}

export interface PaperType {
  id: string;
  name: string;
  weightGrams?: number;
  formatWidth: number;
  formatHeight: number;
  costPerSheet: number;
  provider?: string;
  substrateKind?: SubstrateKind;
  rollWidthCm?: number;
  pricingMode?: RollPricingMode;
  costPerLinearMeter?: number;
  costPerSquareMeter?: number;
  grainDirection?: GrainDirection;
  purchaseIncrement?: number;
}

export interface MachineType {
  id: string;
  name: string;
  technology: MachineTechnology;
  chargeType?: MachineChargeType;
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
  minHeight: number;
  gripperMargin: number;
  setupCost: number;
  platesCost?: number;
  variableCost: number;
}

export interface InkType {
  id: string;
  type: string;
  baseCost: number;
}

export interface PlateType {
  id: string;
  name: string;
  baseCost: number;
}

export interface CompanyConfig {
  name: string;
  documentId: string;
  phone: string;
  address: string;
  email: string;
  termsAndConditions?: string;
  presentationMessage?: string;
}

export interface QuoteItemPricingSnapshot {
  baseCost: number;
  suggestedPrice: number;
  salePriceNet: number;
  includeIva: boolean;
  ivaRate: number;
  ivaValue: number;
  salePriceWithIva: number;
  profitValue: number;
  profitOnBasePct: number;
  marginOnSalePct: number;
  targetMarkupPct: number;
  forcedPricing?: {
    machineCost?: number;
    platesCost?: number;
    inkCost?: number;
    passesOrColors?: number;
  };
}

export interface GeometryCutPlanStep {
  stage: 1 | 2;
  axis: 'vertical' | 'horizontal';
  description: string;
  sizeCm: number;
  count: number;
}

export interface GeometryMaterialConsumption {
  requiredSheets?: number;
  requiredLinearMeters?: number;
  consumedAreaM2?: number;
  productionQuantity?: number;
  estimatedWeightKg?: number;
}

export interface GeometryWasteBreakdown {
  finishedPieceAreaCm2: number;
  printOccupiedAreaCm2: number;
  geometricWasteAreaCm2: number;
  nonPrintableAreaCm2: number;
  productionWasteAreaCm2: number;
}

export interface GeometryPlacement {
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  orientation: 'normal' | 'rotated';
}

export interface GeometryAlternativeSnapshot {
  id: string;
  label: string;
  layoutMode: string;
  piecesPerSheetOrRun: number;
  utilizationPct: number;
  materialCost: number;
  cutCount: number;
}

export interface QuoteItemGeometrySnapshot {
  strategy: 'guillotine_2stage_mixed';
  substrateKind: SubstrateKind;
  pricingMode: RollPricingMode;
  layoutMode: string;
  pieceWidthCm: number;
  pieceHeightCm: number;
  bleedCm: number;
  gapCm: number;
  gripperCm: number;
  wastePct: number;
  allowRotation: boolean;
  optimizationMode?: GeometryOptimizationMode;
  grainDirection?: GrainDirection;
  manualOverride?: boolean;
  geometryVerified?: boolean;
  piecesPerSheetOrRun: number;
  utilizationPct: number;
  usedAreaCm2: number;
  wasteAreaCm2: number;
  containerWidthCm?: number;
  containerHeightCm?: number;
  wasteBreakdown?: GeometryWasteBreakdown;
  placements?: GeometryPlacement[];
  alternatives?: GeometryAlternativeSnapshot[];
  warnings?: string[];
  materialConsumption: GeometryMaterialConsumption;
  materialCost: number;
  cutPlan: GeometryCutPlanStep[];
}

export interface QuoteItemSpecs {
  width: number;
  height: number;
  paperName: string;
  printFormat: string;
  inks: number;
  inkName: string;
  finishes: string[];
  pricingSnapshot?: QuoteItemPricingSnapshot;
  geometrySnapshot?: QuoteItemGeometrySnapshot;
  includeTechnicalCutAnnex?: boolean;
}

export interface QuoteItem {
  id: string;
  reference: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specs: QuoteItemSpecs;
}

export interface QuoteType {
  id: string;
  date: string;
  clientName: string;
  items: QuoteItem[];
  subtotal: number;
  status: QuoteStatus;
  includeTechnicalCutAnnex?: boolean;
}

export interface FinishType {
  id: string;
  name: string;
  chargeType: FinishChargeType;
  setupCost: number;
  variableCost: number;
}

export interface POPItemType {
  id: string;
  name: string;
  description: string;
  unitCost: number;
}

export interface DatabaseSchema {
  clients: ClientType[];
  papers: PaperType[];
  machines: MachineType[];
  inks: InkType[];
  finishes: FinishType[];
  plates: PlateType[];
  popItems: POPItemType[];
  companyConfig: CompanyConfig;
  quotes: QuoteType[];
}
