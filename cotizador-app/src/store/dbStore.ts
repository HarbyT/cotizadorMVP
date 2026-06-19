import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ClientType,
  CompanyConfig,
  FinishType,
  InkType,
  MachineType,
  PaperType,
  PlateType,
  POPItemType,
  QuoteType,
} from '../types/database';

const initialClients: ClientType[] = [
  { id: 'C-01', name: 'Cliente de Prueba', company: 'Empresa Demo S.A.S', documentId: '900123456-7' },
];

const initialCompanyConfig: CompanyConfig = {
  name: 'HUELLAS LITOGRAFICAS',
  documentId: '900.123.456-7',
  phone: '+57 300 123 4567',
  address: 'Calle Falsa 123, Bogota D.C.',
  email: 'comercial@huellaslitograficas.com',
  termsAndConditions:
    '- Validez: 30 dias calendario.\n- Pago: 50% anticipo al aprobar, 50% contra entrega. Precios brutos, no incluyen retenciones.\n- Tiempos: Sujetos a disponibilidad tras aprobacion de artes.\n- Cambios: Modificaciones en artes y formas posterior a aprobacion causan reliquidacion.',
  presentationMessage: 'Es un placer para nuestra compania presentar a su consideracion la siguiente oferta comercial:',
};

const initialPapers: PaperType[] = [
  { id: 'P-01', name: 'Propalcote 150g', substrateKind: 'sheet', formatWidth: 100, formatHeight: 70, costPerSheet: 400, weightGrams: 150, grainDirection: 'long' },
  { id: 'P-02', name: 'Propalcote 300g', substrateKind: 'sheet', formatWidth: 100, formatHeight: 70, costPerSheet: 800, weightGrams: 300, grainDirection: 'long' },
  { id: 'P-03', name: 'Bond 75g', substrateKind: 'sheet', formatWidth: 70, formatHeight: 50, costPerSheet: 120, weightGrams: 75, grainDirection: 'long' },
  { id: 'P-04', name: 'Adhesivo', substrateKind: 'sheet', formatWidth: 100, formatHeight: 70, costPerSheet: 2500, grainDirection: 'unknown' },
  { id: 'P-05', name: 'Maule C18', substrateKind: 'sheet', formatWidth: 100, formatHeight: 70, costPerSheet: 1800, grainDirection: 'long' },
  {
    id: 'P-06',
    name: 'Vinilo Adhesivo Blanco',
    substrateKind: 'roll',
    formatWidth: 160,
    formatHeight: 100,
    costPerSheet: 0,
    rollWidthCm: 160,
    pricingMode: 'linear_meter',
    costPerLinearMeter: 17500,
    costPerSquareMeter: 12000,
    grainDirection: 'unknown',
    purchaseIncrement: 0.1,
  },
];

const initialMachines: MachineType[] = [
  {
    id: 'MQ-01',
    name: 'Heidelberg Speedmaster',
    technology: 'Offset',
    chargeType: 'Color',
    maxWidth: 102,
    maxHeight: 72,
    minWidth: 35,
    minHeight: 25,
    gripperMargin: 1.5,
    setupCost: 180000,
    platesCost: 0,
    variableCost: 45000,
  },
  {
    id: 'MQ-02',
    name: 'Heidelberg GTO',
    technology: 'Offset',
    chargeType: 'Color',
    maxWidth: 52,
    maxHeight: 36,
    minWidth: 20,
    minHeight: 15,
    gripperMargin: 1.0,
    setupCost: 80000,
    platesCost: 0,
    variableCost: 30000,
  },
  {
    id: 'MQ-03',
    name: 'Ricoh Pro C7100x',
    technology: 'Digital',
    chargeType: 'Policromia',
    maxWidth: 33,
    maxHeight: 48,
    minWidth: 10,
    minHeight: 10,
    gripperMargin: 0.5,
    setupCost: 0,
    platesCost: 0,
    variableCost: 600,
  },
  {
    id: 'MQ-04',
    name: 'Plotter Stormjet',
    technology: 'Gran Formato',
    chargeType: 'Policromia',
    maxWidth: 160,
    maxHeight: 9999,
    minWidth: 10,
    minHeight: 10,
    gripperMargin: 0,
    setupCost: 0,
    platesCost: 0,
    variableCost: 25000,
  },
  {
    id: 'MQ-05',
    name: 'UV DTF',
    technology: 'Gran Formato',
    chargeType: 'Policromia',
    maxWidth: 60,
    maxHeight: 9999,
    minWidth: 5,
    minHeight: 5,
    gripperMargin: 0,
    setupCost: 0,
    platesCost: 0,
    variableCost: 55000,
  },
];

const initialFinishes: FinishType[] = [
  { id: 'T-01', name: 'Troquelado (ZDM)', chargeType: 'Millar', setupCost: 50000, variableCost: 25000 },
  { id: 'T-02', name: 'Plastificado Mate', chargeType: 'Pliego', setupCost: 0, variableCost: 450 },
  { id: 'T-03', name: 'Plegado Auto', chargeType: 'Millar', setupCost: 30000, variableCost: 10000 },
  { id: 'T-04', name: 'Refile / Corte', chargeType: 'Global', setupCost: 15000, variableCost: 0 },
  { id: 'T-05', name: 'Pegue a Mano', chargeType: 'Unidad', setupCost: 0, variableCost: 80 },
  { id: 'T-06', name: 'Diseno / Arte', chargeType: 'Global', setupCost: 50000, variableCost: 0 },
];

const initialInks: InkType[] = [
  { id: 'I-01', type: 'CMYK', baseCost: 15000 },
  { id: 'I-02', type: 'Pantone', baseCost: 35000 },
  { id: 'I-03', type: 'Metalizada', baseCost: 50000 },
];

const initialPopItems: POPItemType[] = [
  { id: 'POP-01', name: 'Esfero Plastico Basico', description: 'Esfero retractil color solido.', unitCost: 800 },
  { id: 'POP-02', name: 'Mug Blanco 11oz', description: 'Mug en ceramica para sublimacion.', unitCost: 3500 },
  {
    id: 'POP-03',
    name: 'Camiseta Algodon Cuello Redondo',
    description: 'Camiseta manga corta 180g.',
    unitCost: 12000,
  },
  { id: 'POP-04', name: 'Bolsa Ecologica', description: 'Bolsa en cambrel 30x40cm.', unitCost: 1500 },
];

interface DBState {
  clients: ClientType[];
  papers: PaperType[];
  machines: MachineType[];
  finishes: FinishType[];
  inks: InkType[];
  plates: PlateType[];
  popItems: POPItemType[];
  companyConfig: CompanyConfig;
  quotes: QuoteType[];

  updateCompanyConfig: (config: Partial<CompanyConfig>) => void;
  setCompanyConfig: (config: CompanyConfig) => void;

  saveQuote: (quote: QuoteType) => void;
  setQuotes: (quotes: QuoteType[]) => void;
  updateQuoteStatus: (id: string, status: QuoteType['status']) => void;
  deleteQuote: (id: string) => void;

  setClients: (clients: ClientType[]) => void;
  addClient: (client: ClientType) => void;
  updateClient: (id: string, client: Partial<ClientType>) => void;
  deleteClient: (id: string) => void;

  setPapers: (papers: PaperType[]) => void;
  addPaper: (paper: PaperType) => void;
  updatePaper: (id: string, paper: Partial<PaperType>) => void;
  deletePaper: (id: string) => void;

  setMachines: (machines: MachineType[]) => void;
  addMachine: (machine: MachineType) => void;
  updateMachine: (id: string, machine: Partial<MachineType>) => void;
  deleteMachine: (id: string) => void;

  setFinishes: (finishes: FinishType[]) => void;
  addFinish: (finish: FinishType) => void;
  updateFinish: (id: string, finish: Partial<FinishType>) => void;
  deleteFinish: (id: string) => void;

  setInks: (inks: InkType[]) => void;
  addInk: (ink: InkType) => void;
  updateInk: (id: string, ink: Partial<InkType>) => void;
  deleteInk: (id: string) => void;

  setPlates: (plates: PlateType[]) => void;
  addPlate: (plate: PlateType) => void;
  updatePlate: (id: string, plate: Partial<PlateType>) => void;
  deletePlate: (id: string) => void;

  setPopItems: (popItems: POPItemType[]) => void;
  addPopItem: (popItem: POPItemType) => void;
  updatePopItem: (id: string, popItem: Partial<POPItemType>) => void;
  deletePopItem: (id: string) => void;
}

export const useDBStore = create<DBState>()(
  persist(
    (set) => ({
      clients: initialClients,
      papers: initialPapers,
      machines: initialMachines,
      finishes: initialFinishes,
      inks: initialInks,
      plates: [],
      popItems: initialPopItems,
      companyConfig: initialCompanyConfig,
      quotes: [],

      updateCompanyConfig: (updated) =>
        set((state) => ({
          companyConfig: { ...state.companyConfig, ...updated },
        })),
      setCompanyConfig: (config) => set({ companyConfig: config }),

      saveQuote: (quote) =>
        set((state) => {
          const existing = state.quotes.find((entry) => entry.id === quote.id);
          if (existing) {
            return {
              quotes: state.quotes.map((entry) => (entry.id === quote.id ? quote : entry)),
            };
          }

          return {
            quotes: [quote, ...state.quotes],
          };
        }),
      setQuotes: (quotes) => set({ quotes }),
      updateQuoteStatus: (id, status) =>
        set((state) => ({
          quotes: state.quotes.map((quote) => (quote.id === id ? { ...quote, status } : quote)),
        })),
      deleteQuote: (id) =>
        set((state) => ({
          quotes: state.quotes.filter((quote) => quote.id !== id),
        })),

      setClients: (clients) => set({ clients }),
      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
      updateClient: (id, client) =>
        set((state) => ({
          clients: state.clients.map((entry) => (entry.id === id ? { ...entry, ...client } : entry)),
        })),
      deleteClient: (id) => set((state) => ({ clients: state.clients.filter((entry) => entry.id !== id) })),

      setPapers: (papers) => set({ papers }),
      addPaper: (paper) => set((state) => ({ papers: [...state.papers, paper] })),
      updatePaper: (id, paper) =>
        set((state) => ({
          papers: state.papers.map((entry) => (entry.id === id ? { ...entry, ...paper } : entry)),
        })),
      deletePaper: (id) => set((state) => ({ papers: state.papers.filter((entry) => entry.id !== id) })),

      setMachines: (machines) => set({ machines }),
      addMachine: (machine) => set((state) => ({ machines: [...state.machines, machine] })),
      updateMachine: (id, machine) =>
        set((state) => ({
          machines: state.machines.map((entry) => (entry.id === id ? { ...entry, ...machine } : entry)),
        })),
      deleteMachine: (id) =>
        set((state) => ({
          machines: state.machines.filter((entry) => entry.id !== id),
        })),

      setFinishes: (finishes) => set({ finishes }),
      addFinish: (finish) => set((state) => ({ finishes: [...state.finishes, finish] })),
      updateFinish: (id, finish) =>
        set((state) => ({
          finishes: state.finishes.map((entry) => (entry.id === id ? { ...entry, ...finish } : entry)),
        })),
      deleteFinish: (id) =>
        set((state) => ({
          finishes: state.finishes.filter((entry) => entry.id !== id),
        })),

      setInks: (inks) => set({ inks }),
      addInk: (ink) => set((state) => ({ inks: [...state.inks, ink] })),
      updateInk: (id, ink) =>
        set((state) => ({
          inks: state.inks.map((entry) => (entry.id === id ? { ...entry, ...ink } : entry)),
        })),
      deleteInk: (id) => set((state) => ({ inks: state.inks.filter((entry) => entry.id !== id) })),

      setPlates: (plates) => set({ plates }),
      addPlate: (plate) => set((state) => ({ plates: [...state.plates, plate] })),
      updatePlate: (id, plate) =>
        set((state) => ({
          plates: state.plates.map((entry) => (entry.id === id ? { ...entry, ...plate } : entry)),
        })),
      deletePlate: (id) => set((state) => ({ plates: state.plates.filter((entry) => entry.id !== id) })),

      setPopItems: (popItems) => set({ popItems }),
      addPopItem: (popItem) => set((state) => ({ popItems: [...state.popItems, popItem] })),
      updatePopItem: (id, popItem) =>
        set((state) => ({
          popItems: state.popItems.map((entry) => (entry.id === id ? { ...entry, ...popItem } : entry)),
        })),
      deletePopItem: (id) =>
        set((state) => ({
          popItems: state.popItems.filter((entry) => entry.id !== id),
        })),
    }),
    {
      name: 'cotihuellxs-db-storage',
    },
  ),
);
