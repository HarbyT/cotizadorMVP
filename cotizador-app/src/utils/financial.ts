export const COP_LOCALE = 'es-CO';
export const IVA_RATE = 0.19;

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

export function roundCop(value: number): number {
  return Math.round(toFiniteNumber(value));
}

export function formatCop(value: number): string {
  return roundCop(value).toLocaleString(COP_LOCALE);
}

export function calculateTax(subtotal: number, taxRate = IVA_RATE): number {
  return toFiniteNumber(subtotal) * toFiniteNumber(taxRate);
}

export function calculateTotalWithTax(subtotal: number, taxRate = IVA_RATE): number {
  return toFiniteNumber(subtotal) + calculateTax(subtotal, taxRate);
}

export function safeSuggestedPrice(baseCost: number, targetMargin: number): number {
  const normalizedBaseCost = toFiniteNumber(baseCost);
  const normalizedMargin = Math.max(-0.99, toFiniteNumber(targetMargin));
  return normalizedBaseCost * (1 + normalizedMargin);
}

export function safeMarginPercentage(finalPrice: number, baseCost: number): number {
  const normalizedFinalPrice = toFiniteNumber(finalPrice);
  const normalizedBaseCost = toFiniteNumber(baseCost);

  if (normalizedFinalPrice <= 0) {
    return 0;
  }

  return ((normalizedFinalPrice - normalizedBaseCost) / normalizedFinalPrice) * 100;
}

export function safeProfitOnBasePercentage(finalPrice: number, baseCost: number): number {
  const normalizedFinalPrice = toFiniteNumber(finalPrice);
  const normalizedBaseCost = toFiniteNumber(baseCost);

  if (normalizedBaseCost <= 0) {
    return 0;
  }

  return ((normalizedFinalPrice - normalizedBaseCost) / normalizedBaseCost) * 100;
}
