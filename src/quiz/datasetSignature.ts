import { stableStringify } from '../util/stableStringify';

// Non-cryptographic 32-bit FNV-1a hash (good enough for dataset compatibility checks).
function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // unsigned hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeDatasetSignature(dataset: unknown): string {
  return fnv1a32(stableStringify(dataset));
}
