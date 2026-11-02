export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function helper(v: unknown): unknown {
    if (v === null || typeof v !== 'object') return v;

    if (Array.isArray(v)) return v.map(helper);

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error('Cannot stableStringify circular structure');
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = helper(obj[key]);
    }
    return out;
  }

  return JSON.stringify(helper(value));
}
