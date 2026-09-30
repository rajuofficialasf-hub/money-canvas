/**
 * Collision-safe ID generation (STEP-8).
 *
 * Historically IDs were built as `${prefix}-${Date.now()}`, which collides when
 * multiple entities are created within the same millisecond (e.g. SMS/CSV batch
 * imports) — voiding one transaction could void several. All new IDs use
 * crypto.randomUUID() with the same human-readable prefix; existing stored IDs
 * remain valid because nothing parses the ID format.
 */
export function newId(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
}
