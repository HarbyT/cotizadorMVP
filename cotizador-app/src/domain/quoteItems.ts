import type { QuoteItem, QuoteItemGeometrySnapshot, QuoteItemPricingSnapshot } from '../types/database';
import { toFiniteNumber } from '../utils/financial';

export interface DraftQuoteItemInput {
  reference: string;
  productName: string;
  description: string;
  quantity: number;
  subtotal: number;
  width: number;
  height: number;
  paperName: string;
  printFormat: string;
  numberOfInks: number;
  inkName: string;
  finishNames: string[];
  pricingSnapshot?: QuoteItemPricingSnapshot;
  geometrySnapshot?: QuoteItemGeometrySnapshot;
  includeTechnicalCutAnnex?: boolean;
}

export function shouldBuildDraftItem(productName: string): boolean {
  return productName.trim().length > 0;
}

export function buildDraftQuoteItem(input: DraftQuoteItemInput): QuoteItem {
  const quantity = Math.max(1, Math.floor(toFiniteNumber(input.quantity, 1)));
  const subtotal = toFiniteNumber(input.subtotal);

  return {
    id: 'ITM-DRAFT',
    reference: input.reference,
    productName: input.productName,
    description: input.description,
    quantity,
    unitPrice: subtotal / quantity,
    subtotal,
    specs: {
      width: toFiniteNumber(input.width),
      height: toFiniteNumber(input.height),
      paperName: input.paperName,
      printFormat: input.printFormat,
      inks: Math.max(0, Math.floor(toFiniteNumber(input.numberOfInks))),
      inkName: input.inkName,
      finishes: input.finishNames,
      pricingSnapshot: input.pricingSnapshot,
      geometrySnapshot: input.geometrySnapshot,
      includeTechnicalCutAnnex: input.includeTechnicalCutAnnex,
    },
  };
}

export function mergeQuoteItems(existingItems: QuoteItem[], draftItem: QuoteItem | null): QuoteItem[] {
  if (!draftItem) {
    return existingItems;
  }

  return [...existingItems, draftItem];
}

export function sumQuoteItemsSubtotal(items: QuoteItem[]): number {
  return items.reduce((total, item) => total + toFiniteNumber(item.subtotal), 0);
}
