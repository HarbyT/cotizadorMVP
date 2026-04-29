import { v4 as uuidv4 } from 'uuid';

function getShortUuid(): string {
  return uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function createEntityId(prefix: string): string {
  return `${prefix}-${getShortUuid()}`;
}

export function createQuoteId(): string {
  const timestampSuffix = Date.now().toString().slice(-5);
  return `COT-${timestampSuffix}-${getShortUuid()}`;
}

export function createItemId(): string {
  return createEntityId('ITM');
}