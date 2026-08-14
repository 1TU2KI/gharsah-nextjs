/**
 * `node:sqlite`'s `.get()`/`.all()` return rows as null-prototype objects
 * (`Object.create(null)`, confirmed directly against this project's Node
 * version) — React's Server→Client serialization boundary rejects them
 * ("Only plain objects... Classes or null prototypes are not supported")
 * the moment one is passed as a prop into a "use client" component. Every
 * repo function whose result might reach a client component runs its rows
 * through one of these first — a cheap shallow copy into a real object
 * literal, which always has a normal `Object.prototype`. Hand-built rows
 * (e.g. the object literals `createCampaignRow` etc. construct themselves)
 * don't need this — only values that came straight out of a `.get()`/
 * `.all()` call do.
 */
export function toPlain<T extends object>(row: T): T {
  return { ...row };
}

export function toPlainArray<T extends object>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }));
}
