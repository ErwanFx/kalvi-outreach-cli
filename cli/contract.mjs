import { readFileSync } from 'node:fs';

export const CONTRACT_V1 = JSON.parse(readFileSync(new URL('../contracts/v1.json', import.meta.url), 'utf8'));
export const REQUEST_METADATA_FIXTURE = CONTRACT_V1.fixtures.requestMetadata;

/**
 * @typedef {{ schemaVersion: string, correlationId: string, idempotencyKey: string }} RequestMetadata
 */

/**
 * @param {unknown} value
 * @returns {RequestMetadata}
 */
export function validateRequestMetadata(value) {
  const metadata = CONTRACT_V1.requestMetadata;
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
    Object.keys(value).some(key => !['schemaVersion', 'correlationId', 'idempotencyKey'].includes(key)) ||
    value.schemaVersion !== metadata.schemaVersion ||
    typeof value.correlationId !== 'string' || value.correlationId.trim().length < metadata.correlationId.minimum || value.correlationId.length > metadata.correlationId.maximum ||
    typeof value.idempotencyKey !== 'string' || value.idempotencyKey.trim().length < metadata.idempotencyKey.minimum || value.idempotencyKey.length > metadata.idempotencyKey.maximum) {
    throw new Error('INVALID_REQUEST_METADATA');
  }
  return { schemaVersion: value.schemaVersion, correlationId: value.correlationId.trim(), idempotencyKey: value.idempotencyKey.trim() };
}
