import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  QuoteItem,
  QuoteItemGeometrySnapshot,
  QuoteItemPricingSnapshot,
  RollPricingMode,
  SubstrateKind,
} from '../types/database';
import { createItemId } from '../utils/id';

type ProjectMode = 'Papel' | 'POP';
type PrintFormat = '1x0' | '1x1' | '2x0' | '2x2' | '4x0' | '4x1' | '4x4' | 'Manual';

interface WizardFields {
  selectedClientId: string | null;
  companyLogo: string | null;
  quoteNumber: string;
  reference: string;
  description: string;
  productName: string;
  quantity: number;
  width: number;
  height: number;
  projectMode: ProjectMode;
  selectedPopItemId: string | null;

  selectedPaperId: string | null;
  cabidas: number;
  overrideCabidas: number | null;
  pliegosTotales: number;
  mermaPercent: number;
  useAdvancedGeometry: boolean;
  materialSubstrateKind: SubstrateKind;
  rollWidthCm: number;
  rollPricingMode: RollPricingMode;
  geometryBleedCm: number;
  geometryGapCm: number;
  geometryGripperCm: number;
  geometryAllowRotation: boolean;
  geometryMaterialCost: number | null;
  geometrySnapshot: QuoteItemGeometrySnapshot | null;

  sellMachineProcess: boolean;
  sellInkProcess: boolean;
  selectedMachineId: string | null;
  strategicMachinePrice: number | null;
  forceMachineCost: number | null;
  forcePassesOrColors: number | null;
  selectedPlateId: string | null;
  strategicPlatePrice: number | null;
  forcePlatesCost: number | null;
  selectedInkId: string | null;
  strategicInkPrice: number | null;
  forceInkCost: number | null;
  printFormat: PrintFormat;
  numberOfInks: number;

  selectedFinishIds: string[];
  strategicFinishPrices: Record<string, number | null>;

  targetMargin: number;
  customSalePrice: number | null;
  includeIva: boolean;
  manualPriceIncludesIva: boolean;
  includeTechnicalCutAnnex: boolean;

  elaboratedBy: string;
  includeSignature: boolean;

  quoteItems: QuoteItem[];
}

interface WizardActions {
  updateField: <K extends keyof WizardFields>(field: K, value: WizardFields[K]) => void;
  addCurrentProductToItems: (
    subtotalCalc: number,
    paperName: string,
    inkName: string,
    finishNames: string[],
    pricingSnapshot?: QuoteItemPricingSnapshot,
    geometrySnapshot?: QuoteItemGeometrySnapshot,
    includeTechnicalCutAnnex?: boolean,
  ) => void;
  removeItem: (index: number) => void;
  updateItemPrice: (index: number, newSubtotal: number) => void;
  resetForm: () => void;
}

export type WizardState = WizardFields & WizardActions;

const initialWizardFields: WizardFields = {
  selectedClientId: null,
  companyLogo: null,
  quoteNumber: '',
  reference: '',
  description: '',
  productName: '',
  quantity: 5000,
  width: 15,
  height: 25,
  projectMode: 'Papel',
  selectedPopItemId: null,

  selectedPaperId: null,
  cabidas: 0,
  overrideCabidas: null,
  pliegosTotales: 0,
  mermaPercent: 0.05,
  useAdvancedGeometry: false,
  materialSubstrateKind: 'sheet',
  rollWidthCm: 100,
  rollPricingMode: 'linear_meter',
  geometryBleedCm: 0,
  geometryGapCm: 0.5,
  geometryGripperCm: 1.5,
  geometryAllowRotation: true,
  geometryMaterialCost: null,
  geometrySnapshot: null,

  sellMachineProcess: true,
  sellInkProcess: true,
  selectedMachineId: null,
  strategicMachinePrice: null,
  forceMachineCost: null,
  forcePassesOrColors: null,
  selectedPlateId: null,
  strategicPlatePrice: null,
  forcePlatesCost: null,
  selectedInkId: null,
  strategicInkPrice: null,
  forceInkCost: null,
  printFormat: 'Manual',
  numberOfInks: 1,

  selectedFinishIds: [],
  strategicFinishPrices: {},

  targetMargin: 0.25,
  customSalePrice: null,
  includeIva: true,
  manualPriceIncludesIva: false,
  includeTechnicalCutAnnex: false,

  elaboratedBy: '',
  includeSignature: true,

  quoteItems: [],
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialWizardFields,

      updateField: (field, value) =>
        set((state) => ({
          ...state,
          [field]: value,
        })),

      addCurrentProductToItems: (
        subtotalCalc,
        paperName,
        inkName,
        finishNames,
        pricingSnapshot,
        geometrySnapshot,
        includeTechnicalCutAnnex,
      ) =>
        set((state) => {
          const quantity = Math.max(1, Math.floor(state.quantity));

          const newItem: QuoteItem = {
            id: createItemId(),
            reference: state.reference || `Item ${state.quoteItems.length + 1}`,
            productName: state.productName || 'Impresion Comercial',
            description: state.description,
            quantity,
            unitPrice: subtotalCalc / quantity,
            subtotal: subtotalCalc,
            specs: {
              width: state.width,
              height: state.height,
              paperName,
              printFormat: state.printFormat,
              inks: state.numberOfInks,
              inkName,
              finishes: finishNames,
              pricingSnapshot,
              geometrySnapshot,
              includeTechnicalCutAnnex,
            },
          };

          return {
            ...state,
            quoteItems: [...state.quoteItems, newItem],
            reference: '',
            description: '',
            productName: '',
            quantity: 5000,
            width: 15,
            height: 25,
            selectedPaperId: null,
            cabidas: 0,
            overrideCabidas: null,
            pliegosTotales: 0,
            geometryMaterialCost: null,
            geometrySnapshot: null,
            selectedMachineId: null,
            strategicMachinePrice: null,
            forceMachineCost: null,
            forcePassesOrColors: null,
            selectedPlateId: null,
            strategicPlatePrice: null,
            forcePlatesCost: null,
            selectedInkId: null,
            strategicInkPrice: null,
            forceInkCost: null,
            numberOfInks: 1,
            selectedFinishIds: [],
            strategicFinishPrices: {},
            customSalePrice: null,
            projectMode: 'Papel',
            selectedPopItemId: null,
          };
        }),

      removeItem: (index) =>
        set((state) => ({
          quoteItems: state.quoteItems.filter((_, itemIndex) => itemIndex !== index),
        })),

      updateItemPrice: (index, newSubtotal) =>
        set((state) => {
          const updatedItems = [...state.quoteItems];

          if (!updatedItems[index]) {
            return { quoteItems: state.quoteItems };
          }

          updatedItems[index] = {
            ...updatedItems[index],
            subtotal: newSubtotal,
            unitPrice: newSubtotal / Math.max(1, updatedItems[index].quantity),
          };

          return { quoteItems: updatedItems };
        }),

      resetForm: () =>
        set(() => ({
          ...initialWizardFields,
        })),
    }),
    {
      name: 'cotihuellxs-wizard-draft',
    },
  ),
);
