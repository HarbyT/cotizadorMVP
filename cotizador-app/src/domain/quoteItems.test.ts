import { describe, expect, it } from 'vitest';
import { buildDraftQuoteItem, mergeQuoteItems, shouldBuildDraftItem, sumQuoteItemsSubtotal } from './quoteItems';

describe('quoteItems helpers', () => {
  it('detecta cuando hay borrador activo', () => {
    expect(shouldBuildDraftItem('')).toBe(false);
    expect(shouldBuildDraftItem('  ')).toBe(false);
    expect(shouldBuildDraftItem('Tarjeta')).toBe(true);
  });

  it('construye item borrador con precio unitario correcto', () => {
    const draft = buildDraftQuoteItem({
      reference: 'REF-01',
      productName: 'Tarjetas',
      description: '300gr',
      quantity: 500,
      subtotal: 250000,
      width: 9,
      height: 5,
      paperName: 'Propalcote',
      printFormat: '4x4',
      numberOfInks: 4,
      inkName: 'CMYK',
      finishNames: ['Plastificado'],
    });

    expect(draft.id).toBe('ITM-DRAFT');
    expect(draft.unitPrice).toBe(500);
    expect(draft.specs.finishes).toContain('Plastificado');
  });

  it('fusiona items y suma subtotales', () => {
    const merged = mergeQuoteItems(
      [
        {
          id: 'ITM-1',
          reference: 'A',
          productName: 'Producto A',
          description: '',
          quantity: 1,
          unitPrice: 100,
          subtotal: 100,
          specs: {
            width: 1,
            height: 1,
            paperName: 'Papel',
            printFormat: '1x0',
            inks: 1,
            inkName: 'CMYK',
            finishes: [],
          },
        },
      ],
      {
        id: 'ITM-DRAFT',
        reference: 'B',
        productName: 'Producto B',
        description: '',
        quantity: 2,
        unitPrice: 75,
        subtotal: 150,
        specs: {
          width: 1,
          height: 1,
          paperName: 'Papel',
          printFormat: '1x1',
          inks: 2,
          inkName: 'CMYK',
          finishes: [],
        },
      },
    );

    expect(merged).toHaveLength(2);
    expect(sumQuoteItemsSubtotal(merged)).toBe(250);
  });
});