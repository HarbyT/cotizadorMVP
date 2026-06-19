import type {
  ClientType,
  CompanyConfig,
  FinishType,
  InkType,
  MachineType,
  PaperType,
  PlateType,
  POPItemType,
  QuoteItem,
  QuoteType,
} from '../types/database';
import { remoteSyncEnabled } from '../lib/env';
import { getSupabaseClient } from '../lib/supabaseClient';

type CatalogKey = 'clients' | 'papers' | 'machines' | 'finishes' | 'inks' | 'plates' | 'popItems';

type CatalogEntityMap = {
  clients: ClientType;
  papers: PaperType;
  machines: MachineType;
  finishes: FinishType;
  inks: InkType;
  plates: PlateType;
  popItems: POPItemType;
};

const CATALOG_TABLE_MAP: Record<CatalogKey, string> = {
  clients: 'clients',
  papers: 'papers',
  machines: 'machines',
  finishes: 'finishes',
  inks: 'inks',
  plates: 'plates',
  popItems: 'pop_items',
};

interface DbClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  document_id: string | null;
}

interface DbPaperRow {
  id: string;
  name: string;
  weight_grams: number | string | null;
  format_width: number | string;
  format_height: number | string;
  cost_per_sheet: number | string;
  substrate_kind: PaperType['substrateKind'] | null;
  roll_width_cm: number | string | null;
  pricing_mode: PaperType['pricingMode'] | null;
  cost_per_linear_meter: number | string | null;
  cost_per_square_meter: number | string | null;
  grain_direction: PaperType['grainDirection'] | null;
  purchase_increment: number | string | null;
  provider: string | null;
}

interface DbMachineRow {
  id: string;
  name: string;
  technology: MachineType['technology'];
  charge_type: MachineType['chargeType'] | null;
  max_width: number | string;
  max_height: number | string;
  min_width: number | string;
  min_height: number | string;
  gripper_margin: number | string;
  setup_cost: number | string;
  plates_cost: number | string | null;
  variable_cost: number | string;
}

interface DbFinishRow {
  id: string;
  name: string;
  charge_type: FinishType['chargeType'];
  setup_cost: number | string;
  variable_cost: number | string;
}

interface DbInkRow {
  id: string;
  type: string;
  base_cost: number | string;
}

interface DbPlateRow {
  id: string;
  name: string;
  base_cost: number | string;
}

interface DbPopItemRow {
  id: string;
  name: string;
  description: string;
  unit_cost: number | string;
}

interface DbCompanyConfigRow {
  id: string;
  name: string;
  document_id: string;
  phone: string;
  address: string;
  email: string;
  terms_and_conditions: string | null;
  presentation_message: string | null;
}

interface DbQuoteItemRow {
  id: string;
  quote_id: string;
  reference: string;
  product_name: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  specs: QuoteItem['specs'] | null;
}

interface DbQuoteRow {
  id: string;
  date: string;
  client_name: string;
  subtotal: number | string;
  status: QuoteType['status'];
  quote_items: DbQuoteItemRow[] | null;
}

export interface RemoteBootstrapData {
  clients: ClientType[];
  papers: PaperType[];
  machines: MachineType[];
  finishes: FinishType[];
  inks: InkType[];
  plates: PlateType[];
  popItems: POPItemType[];
  companyConfig: CompanyConfig | null;
  quotes: QuoteType[];
}

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function assertClientEnabled() {
  const client = getSupabaseClient();

  if (!remoteSyncEnabled || !client) {
    throw new Error('Supabase no esta configurado o la sincronizacion remota esta deshabilitada.');
  }

  return client;
}

function toClientEntity(row: DbClientRow): ClientType {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    documentId: row.document_id ?? undefined,
  };
}

function toPaperEntity(row: DbPaperRow): PaperType {
  return {
    id: row.id,
    name: row.name,
    weightGrams: row.weight_grams !== null ? toNumber(row.weight_grams) : undefined,
    formatWidth: toNumber(row.format_width),
    formatHeight: toNumber(row.format_height),
    costPerSheet: toNumber(row.cost_per_sheet),
    substrateKind: row.substrate_kind ?? 'sheet',
    rollWidthCm: row.roll_width_cm !== null ? toNumber(row.roll_width_cm) : undefined,
    pricingMode: row.pricing_mode ?? undefined,
    costPerLinearMeter: row.cost_per_linear_meter !== null ? toNumber(row.cost_per_linear_meter) : undefined,
    costPerSquareMeter: row.cost_per_square_meter !== null ? toNumber(row.cost_per_square_meter) : undefined,
    grainDirection: row.grain_direction ?? 'unknown',
    purchaseIncrement: row.purchase_increment !== null ? toNumber(row.purchase_increment) : undefined,
    provider: row.provider ?? undefined,
  };
}

function toMachineEntity(row: DbMachineRow): MachineType {
  return {
    id: row.id,
    name: row.name,
    technology: row.technology,
    chargeType: row.charge_type ?? undefined,
    maxWidth: toNumber(row.max_width),
    maxHeight: toNumber(row.max_height),
    minWidth: toNumber(row.min_width),
    minHeight: toNumber(row.min_height),
    gripperMargin: toNumber(row.gripper_margin),
    setupCost: toNumber(row.setup_cost),
    platesCost: row.plates_cost !== null ? toNumber(row.plates_cost) : undefined,
    variableCost: toNumber(row.variable_cost),
  };
}

function toFinishEntity(row: DbFinishRow): FinishType {
  return {
    id: row.id,
    name: row.name,
    chargeType: row.charge_type,
    setupCost: toNumber(row.setup_cost),
    variableCost: toNumber(row.variable_cost),
  };
}

function toInkEntity(row: DbInkRow): InkType {
  return {
    id: row.id,
    type: row.type,
    baseCost: toNumber(row.base_cost),
  };
}

function toPlateEntity(row: DbPlateRow): PlateType {
  return {
    id: row.id,
    name: row.name,
    baseCost: toNumber(row.base_cost),
  };
}

function toPopItemEntity(row: DbPopItemRow): POPItemType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unitCost: toNumber(row.unit_cost),
  };
}

function toCompanyConfigEntity(row: DbCompanyConfigRow): CompanyConfig {
  return {
    name: row.name,
    documentId: row.document_id,
    phone: row.phone,
    address: row.address,
    email: row.email,
    termsAndConditions: row.terms_and_conditions ?? undefined,
    presentationMessage: row.presentation_message ?? undefined,
  };
}

function toQuoteEntity(row: DbQuoteRow): QuoteType {
  const items = (row.quote_items ?? []).map((item) => ({
    id: item.id,
    reference: item.reference,
    productName: item.product_name,
    description: item.description,
    quantity: Math.floor(toNumber(item.quantity)),
    unitPrice: toNumber(item.unit_price),
    subtotal: toNumber(item.subtotal),
    specs:
      item.specs ??
      ({
        width: 0,
        height: 0,
        paperName: '',
        printFormat: 'Manual',
        inks: 0,
        inkName: '',
        finishes: [],
      } as QuoteItem['specs']),
  }));

  return {
    id: row.id,
    date: row.date,
    clientName: row.client_name,
    subtotal: toNumber(row.subtotal),
    status: row.status,
    includeTechnicalCutAnnex: items.some((item) => item.specs.includeTechnicalCutAnnex),
    items,
  };
}

function mapCatalogEntityToDbRow<K extends CatalogKey>(catalog: K, item: CatalogEntityMap[K]): Record<string, unknown> {
  if (catalog === 'clients') {
    const value = item as CatalogEntityMap['clients'];
    return {
      id: value.id,
      name: value.name,
      company: value.company ?? null,
      email: value.email ?? null,
      phone: value.phone ?? null,
      document_id: value.documentId ?? null,
    };
  }

  if (catalog === 'papers') {
    const value = item as CatalogEntityMap['papers'];
    return {
      id: value.id,
      name: value.name,
      weight_grams: value.weightGrams ?? null,
      format_width: value.formatWidth,
      format_height: value.formatHeight,
      cost_per_sheet: value.costPerSheet,
      substrate_kind: value.substrateKind ?? 'sheet',
      roll_width_cm: value.rollWidthCm ?? null,
      pricing_mode: value.pricingMode ?? null,
      cost_per_linear_meter: value.costPerLinearMeter ?? null,
      cost_per_square_meter: value.costPerSquareMeter ?? null,
      grain_direction: value.grainDirection ?? 'unknown',
      purchase_increment: value.purchaseIncrement ?? null,
      provider: value.provider ?? null,
    };
  }

  if (catalog === 'machines') {
    const value = item as CatalogEntityMap['machines'];
    return {
      id: value.id,
      name: value.name,
      technology: value.technology,
      charge_type: value.chargeType ?? null,
      max_width: value.maxWidth,
      max_height: value.maxHeight,
      min_width: value.minWidth,
      min_height: value.minHeight,
      gripper_margin: value.gripperMargin,
      setup_cost: value.setupCost,
      plates_cost: value.platesCost ?? null,
      variable_cost: value.variableCost,
    };
  }

  if (catalog === 'finishes') {
    const value = item as CatalogEntityMap['finishes'];
    return {
      id: value.id,
      name: value.name,
      charge_type: value.chargeType,
      setup_cost: value.setupCost,
      variable_cost: value.variableCost,
    };
  }

  if (catalog === 'inks') {
    const value = item as CatalogEntityMap['inks'];
    return {
      id: value.id,
      type: value.type,
      base_cost: value.baseCost,
    };
  }

  if (catalog === 'plates') {
    const value = item as CatalogEntityMap['plates'];
    return {
      id: value.id,
      name: value.name,
      base_cost: value.baseCost,
    };
  }

  const value = item as CatalogEntityMap['popItems'];
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    unit_cost: value.unitCost,
  };
}

async function logAuditEvent(eventType: string, entityType: string, entityId: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();

  if (!remoteSyncEnabled || !client) {
    return;
  }

  await client.from('audit_events').insert({
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });
}

export const supabaseRepository = {
  isEnabled(): boolean {
    return remoteSyncEnabled && getSupabaseClient() !== null;
  },

  async loadBootstrapData(): Promise<RemoteBootstrapData | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const client = assertClientEnabled();

    const [
      clientsResponse,
      papersResponse,
      machinesResponse,
      finishesResponse,
      inksResponse,
      platesResponse,
      popItemsResponse,
      companyConfigResponse,
      quotesResponse,
    ] = await Promise.all([
      client.from('clients').select('*').order('name', { ascending: true }),
      client.from('papers').select('*').order('name', { ascending: true }),
      client.from('machines').select('*').order('name', { ascending: true }),
      client.from('finishes').select('*').order('name', { ascending: true }),
      client.from('inks').select('*').order('type', { ascending: true }),
      client.from('plates').select('*').order('name', { ascending: true }),
      client.from('pop_items').select('*').order('name', { ascending: true }),
      client.from('company_config').select('*').eq('id', 'default').maybeSingle(),
      client
        .from('quotes')
        .select(
          `
          id,
          date,
          client_name,
          subtotal,
          status,
          quote_items (
            id,
            quote_id,
            reference,
            product_name,
            description,
            quantity,
            unit_price,
            subtotal,
            specs
          )
        `,
        )
        .order('date', { ascending: false }),
    ]);

    if (clientsResponse.error) throw clientsResponse.error;
    if (papersResponse.error) throw papersResponse.error;
    if (machinesResponse.error) throw machinesResponse.error;
    if (finishesResponse.error) throw finishesResponse.error;
    if (inksResponse.error) throw inksResponse.error;
    if (platesResponse.error) throw platesResponse.error;
    if (popItemsResponse.error) throw popItemsResponse.error;
    if (companyConfigResponse.error) throw companyConfigResponse.error;
    if (quotesResponse.error) throw quotesResponse.error;

    return {
      clients: (clientsResponse.data as DbClientRow[]).map(toClientEntity),
      papers: (papersResponse.data as DbPaperRow[]).map(toPaperEntity),
      machines: (machinesResponse.data as DbMachineRow[]).map(toMachineEntity),
      finishes: (finishesResponse.data as DbFinishRow[]).map(toFinishEntity),
      inks: (inksResponse.data as DbInkRow[]).map(toInkEntity),
      plates: (platesResponse.data as DbPlateRow[]).map(toPlateEntity),
      popItems: (popItemsResponse.data as DbPopItemRow[]).map(toPopItemEntity),
      companyConfig: companyConfigResponse.data
        ? toCompanyConfigEntity(companyConfigResponse.data as DbCompanyConfigRow)
        : null,
      quotes: (quotesResponse.data as DbQuoteRow[]).map(toQuoteEntity),
    };
  },

  async upsertCatalogItem<K extends CatalogKey>(catalog: K, item: CatalogEntityMap[K]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();
    const table = CATALOG_TABLE_MAP[catalog];
    const payload = mapCatalogEntityToDbRow(catalog, item);

    const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    await logAuditEvent('UPSERT', table, String((payload.id as string) ?? ''), payload);
  },

  async replaceCatalog<K extends CatalogKey>(catalog: K, items: CatalogEntityMap[K][]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();
    const table = CATALOG_TABLE_MAP[catalog];

    const { error: deleteError } = await client.from(table).delete().neq('id', '__NONE__');

    if (deleteError) {
      throw deleteError;
    }

    if (items.length > 0) {
      const payload = items.map((item) => mapCatalogEntityToDbRow(catalog, item));
      const { error: insertError } = await client.from(table).insert(payload);

      if (insertError) {
        throw insertError;
      }
    }

    await logAuditEvent('REPLACE_CATALOG', table, 'bulk', {
      count: items.length,
    });
  },

  async deleteCatalogItem(catalog: CatalogKey, id: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();
    const table = CATALOG_TABLE_MAP[catalog];

    const { error } = await client.from(table).delete().eq('id', id);

    if (error) {
      throw error;
    }

    await logAuditEvent('DELETE', table, id, { id });
  },

  async upsertCompanyConfig(config: CompanyConfig): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();

    const payload = {
      id: 'default',
      name: config.name,
      document_id: config.documentId,
      phone: config.phone,
      address: config.address,
      email: config.email,
      terms_and_conditions: config.termsAndConditions ?? null,
      presentation_message: config.presentationMessage ?? null,
    };

    const { error } = await client.from('company_config').upsert(payload, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    await logAuditEvent('UPSERT', 'company_config', 'default', payload);
  },

  async upsertQuote(quote: QuoteType): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();

    const quotePayload = {
      id: quote.id,
      date: quote.date,
      client_name: quote.clientName,
      subtotal: quote.subtotal,
      status: quote.status,
    };

    const { error: quoteError } = await client.from('quotes').upsert(quotePayload, { onConflict: 'id' });

    if (quoteError) {
      throw quoteError;
    }

    const { error: deleteItemsError } = await client.from('quote_items').delete().eq('quote_id', quote.id);

    if (deleteItemsError) {
      throw deleteItemsError;
    }

    if (quote.items.length > 0) {
      const quoteItemPayload = quote.items.map((item) => ({
        id: item.id,
        quote_id: quote.id,
        reference: item.reference,
        product_name: item.productName,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        specs: item.specs,
      }));

      const { error: insertItemsError } = await client.from('quote_items').insert(quoteItemPayload);

      if (insertItemsError) {
        throw insertItemsError;
      }
    }

    await logAuditEvent('UPSERT', 'quotes', quote.id, {
      items: quote.items.length,
      status: quote.status,
      subtotal: quote.subtotal,
    });
  },

  async deleteQuote(id: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = assertClientEnabled();

    const { error } = await client.from('quotes').delete().eq('id', id);

    if (error) {
      throw error;
    }

    await logAuditEvent('DELETE', 'quotes', id, { id });
  },
};
