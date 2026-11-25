import { normalizeArabic } from "./arabic";

/**
 * Hand-checked English for recurring Arabic texts — mainly Ehsan's standard
 * per-category campaign descriptions, which many campaigns share word for
 * word. Matched on the normalized Arabic (spelling variants and diacritics
 * don't matter), and used before the machine engine, whose output for these
 * is noticeably weaker (e.g. «السقيا والمياه العذبة» → "water and water").
 * Add new templates here as they appear.
 */
const KNOWN_DESCRIPTIONS_RAW: [string, string][] = [
  [
    "كن عونا في توفير السقيا والمياه العذبة في المناطق والقرى الأشد احتياجا للماء في مختلف مناطق المملكة",
    "Help provide drinking water and fresh water to the areas and villages most in need of water across the regions of the Kingdom.",
  ],
  [
    "ساهم في دعم مشاريع الأيتام وتوفير حياة كريمة لهم تبعث في نفوسهم الطمأنينة والاستقرار في مختلف مناطق المملكة",
    "Contribute to supporting orphan projects and providing orphans with a dignified life that brings them reassurance and stability, across the regions of the Kingdom.",
  ],
];

const strip = (text: string) => normalizeArabic(text).replace(/[.،,!؟?]+$/u, "").trim();
const KNOWN_DESCRIPTIONS = new Map(KNOWN_DESCRIPTIONS_RAW.map(([ar, en]) => [strip(ar), en]));

export function knownDescriptionEnglish(arabic: string): string | null {
  return KNOWN_DESCRIPTIONS.get(strip(arabic)) ?? null;
}
