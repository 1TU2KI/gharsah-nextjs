import { normalizeArabic } from "./arabic";
import { FAMILY_NAMES, FIRST_NAMES, KINSHIP, OWN_KINSHIP, transliterateGuess } from "./names";

/**
 * Rule-based Arabic → English for the two short, formulaic campaign fields:
 *
 *   title:     «صدقة جارية عن|لـ [المرحوم] <subject> [رحمه/رحمها/رحمهم الله [تعالى]]»
 *   subtitle:  «[عن|لـ] <subject>»  (e.g. «عن جدة أنس», «جد وجدة غيداء», «عن ابن علا (فهيد الشمري)»)
 *
 * <subject> is one or more people joined by «و»: kinship + owner name
 * («والد محمد» → "Mohammed's father"), a kunya («أم لينا» → "Umm Lina"),
 * an honorific + name («الشيخ سعد» → "Sheikh Saad"), or a full name
 * («فاطمة العبادي» → "Fatima Al-Abadi").
 *
 * Output follows Gharsah's existing English style ("Ongoing Charity for
 * Badr's Father" / "For Turki's grandmother"). A title's memorial phrase is
 * left to the card's memorial line ONLY when the campaign has one selected
 * (`keepMemorial: false`); otherwise it is translated, never dropped.
 *
 * Every word must be accounted for. Ordinary words («في», «الطالبة», …) are
 * never treated as names; text the rules can't fully account for returns
 * null and goes to the machine engine (with the people protected — see
 * findPersonPhrases) instead of being silently cut.
 *
 * Result: exact — everything understood, every name from the dictionary;
 *         guess — complete, but at least one proper name was transliterated
 *                 (published, flagged "Review recommended");
 *         null  — not this formula.
 */
export type RuleResult = { kind: "exact" | "guess"; english: string } | null;

type Person = { english: string; guessed: boolean };

const MEMORIAL_SUFFIX =
  /\s*[,،]?\s*(?:(?:ي)?رحم(?:ه|ها|هم|هما)\s+الله|الله\s+يرحم(?:ه|ها|هم|هما)|غفر\s+الله\s+ل(?:ه|ها|هم|هما))(?:\s+تعالي)?\s*$/u;
const MEMORIAL_EN: Record<string, string> = {
  ه: "may God have mercy on him",
  ها: "may God have mercy on her",
  هم: "may God have mercy on them",
  هما: "may God have mercy on them",
};

export function memorialEnglish(match: string): string {
  const pronoun = match.match(/(?:رحم|يرحم|ل)(هما|هم|ها|ه)(?:\s|$)/u)?.[1] ?? "ه";
  return MEMORIAL_EN[pronoun];
}

const norm = (list: string[]) => new Set(list.map((w) => normalizeArabic(w)));

/** Ordinary words — never a name. Anything containing one goes to the engine. */
const STOPWORDS = norm([
  "في", "من", "إلى", "الى", "على", "عن", "مع", "أو", "او", "ثم", "حتى", "منذ", "التي", "الذي", "الذين", "اللذين", "هذه", "هذا",
  "ذلك", "تلك", "هؤلاء", "كل", "بعض", "جميع", "لكل", "لجميع", "روح", "أرواح", "ارواح", "موتى", "أموات", "المسلمين", "المسلمات",
  "المؤمنين", "والمؤمنات", "مرضى", "مريض", "مريضة", "أهل", "اهل",
  "عائلة", "أسرة", "اسرة", "مكة", "المدينة", "الرياض", "قرية", "حي", "مسجد", "بئر", "ماء", "سقيا", "وقف", "صدقة", "جارية",
  "حملة", "تبرع", "الخير", "خير", "الله", "رحمة", "تعالى", "المرحوم", "المرحومة", "الفقيد", "الفقيدة", "يرحمه", "يرحمها",
]);

/** Honorifics placed before a name. */
const HONORIFICS = new Map(
  Object.entries({
    الشيخ: "Sheikh", الشيخة: "Sheikha", الدكتور: "Dr.", الدكتورة: "Dr.", المهندس: "Eng.", المهندسة: "Eng.",
    الحاج: "Hajj", الحاجة: "Hajjah", الأستاذ: "Ustadh", الأستاذة: "Ustadha", الاستاذ: "Ustadh", الاستاذة: "Ustadha",
  }).map(([k, v]) => [normalizeArabic(k), v]),
);
const LATE = norm(["المرحوم", "المرحومة", "الفقيد", "الفقيدة"]);

/** Descriptive nouns that can precede a name («جدة الطالبة ريم» → "student Reem's grandmother"). */
const DESCRIPTORS = new Map(
  Object.entries({
    الطالب: "student", الطالبة: "student", الطفل: "child", الطفلة: "child", المعلم: "teacher", المعلمة: "teacher",
    الشاب: "young", الشابة: "young", الزميل: "colleague", الزميلة: "colleague", الصديق: "friend", الصديقة: "friend",
  }).map(([k, v]) => [normalizeArabic(k), v]),
);

const titleCase = (s: string) => s.replace(/(^|\s)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
const possessive = (name: string) => `${name.replace(/'+$/, "")}'s`;

const isKinWord = (t: string) => KINSHIP.has(t) || OWN_KINSHIP.has(t);
const isConnector = (t: string) => t === "و" || t === "بن" || t === "بنت" || t === "ابن";

/** A token that may be a proper name in this position (never an ordinary word). */
function nameCandidate(token: string, position: "first" | "later"): boolean {
  if (!token || token.length < 2 || STOPWORDS.has(token) || isKinWord(token) || isConnector(token)) return false;
  if (HONORIFICS.has(token) || LATE.has(token) || DESCRIPTORS.has(token) || token === "ابو" || token === "ام") return false;
  if (!/^[ء-ي]+$/u.test(token)) return false;
  if (FIRST_NAMES.has(token) || FAMILY_NAMES.has(token)) return true;
  // An unknown "ال…" word only ever counts as a FAMILY name (after a first
  // name) — as the first word it's an ordinary noun («الطالبة»).
  if (token.startsWith("ال")) return position === "later";
  return true;
}

/** A name token (or "عبد X" pair) → English, consuming tokens from `i`. */
function readName(tokens: string[], i: number, position: "first" | "later"): { english: string; guessed: boolean; next: number } | null {
  const token = tokens[i];
  if (!token) return null;
  if (token === "عبد" && tokens[i + 1]) {
    const joined = FIRST_NAMES.get("عبد" + tokens[i + 1]);
    if (joined) return { english: joined, guessed: false, next: i + 2 };
    if (nameCandidate(tokens[i + 1], "later")) {
      return { english: transliterateGuess("عبد" + tokens[i + 1]), guessed: true, next: i + 2 };
    }
    return null;
  }
  if (!nameCandidate(token, position)) return null;
  const first = FIRST_NAMES.get(token);
  if (first) return { english: first, guessed: false, next: i + 1 };
  const family = FAMILY_NAMES.get(token);
  if (family) return { english: family, guessed: false, next: i + 1 };
  if (position === "later") {
    if (token.startsWith("ال") && FIRST_NAMES.get(token.slice(2))) {
      return { english: "Al-" + FIRST_NAMES.get(token.slice(2)), guessed: false, next: i + 1 };
    }
  }
  return { english: transliterateGuess(token), guessed: true, next: i + 1 };
}

/**
 * A full name starting at `start`. `whole` = every remaining token must be
 * part of it (rule parsing); otherwise it stops at the first non-name word
 * (scanning free text). Returns the tokens consumed.
 */
function readFullNameAt(tokens: string[], start: number, whole: boolean): (Person & { next: number }) | null {
  const parts: string[] = [];
  let guessed = false;
  let i = start;
  while (i < tokens.length && parts.length < 6) {
    const t = tokens[i];
    if (parts.length > 0 && (t === "بن" || t === "ابن" || t === "بنت") && tokens[i + 1]) {
      const after = readName(tokens, i + 1, "first");
      if (!after) break;
      parts.push(t === "بنت" ? "bint" : "bin", after.english);
      guessed ||= after.guessed;
      i = after.next;
      continue;
    }
    const name = readName(tokens, i, parts.length === 0 ? "first" : "later");
    if (!name) break;
    parts.push(name.english);
    guessed ||= name.guessed;
    i = name.next;
  }
  if (parts.length === 0 || (whole && i !== tokens.length)) return null;
  return { english: parts.join(" "), guessed, next: i };
}

function readFullName(tokens: string[]): Person | null {
  const result = readFullNameAt(tokens, 0, true);
  return result ? { english: result.english, guessed: result.guessed } : null;
}

/** A family-name token (never a new first name): dictionary family name or an unknown «ال…» word after a name. */
function isFamilyToken(token: string | undefined): boolean {
  if (!token) return false;
  if (FAMILY_NAMES.has(token)) return true;
  if (FIRST_NAMES.has(token)) return false;
  return token.startsWith("ال") && nameCandidate(token, "later");
}

/**
 * The owner after a kinship word: [descriptor] name [family names | بن/بنت X …].
 * A following FIRST name is not absorbed (it starts an appositive:
 * «ابن علا فهيد الشمري» → "Ola's son, Fuhaid Al-Shammari").
 */
function readOwner(tokens: string[], i: number): { english: string; guessed: boolean; next: number } | null {
  const descriptor = DESCRIPTORS.get(tokens[i]);
  const start = descriptor ? i + 1 : i;
  const first = readName(tokens, start, "first");
  if (!first) return null;
  const parts = [first.english];
  let guessed = first.guessed;
  let j = first.next;
  while (j < tokens.length && parts.length < 6) {
    if ((tokens[j] === "بن" || tokens[j] === "بنت") && tokens[j + 1]) {
      const next = readName(tokens, j + 1, "first");
      if (!next) break;
      parts.push(tokens[j] === "بنت" ? "bint" : "bin", next.english);
      guessed ||= next.guessed;
      j = next.next;
      continue;
    }
    if (!isFamilyToken(tokens[j])) break;
    const family = readName(tokens, j, "later");
    if (!family) break;
    parts.push(family.english);
    guessed ||= family.guessed;
    j = family.next;
  }
  return { english: (descriptor ? descriptor + " " : "") + parts.join(" "), guessed, next: j };
}

function readKinship(tokens: string[], i = 0): { english: string; next: number } | null {
  const two = tokens.length > i + 1 ? KINSHIP.get(`${tokens[i]} ${tokens[i + 1]}`) : undefined;
  if (two) return { english: two, next: i + 2 };
  const one = KINSHIP.get(tokens[i]);
  return one ? { english: one, next: i + 1 } : null;
}

type ReadPerson = Person & { kinOnly?: string; owner?: string };

/** One person phrase (all tokens must be used). `capitalizeKin` = title style ("Badr's Father"). */
function readPerson(tokens: string[], appositive: string[] | null, capitalizeKin: boolean): ReadPerson | null {
  if (tokens.length === 0) return null;
  let late = "";
  if (LATE.has(tokens[0])) {
    late = capitalizeKin ? "the Late " : "the late ";
    tokens = tokens.slice(1);
    if (tokens.length === 0) return null;
  }
  let person: ReadPerson | null = null;

  const own = tokens.length === 1 ? OWN_KINSHIP.get(tokens[0]) : undefined;
  if (own) person = { english: capitalizeKin ? titleCase(own) : own, guessed: false };

  if (!person && HONORIFICS.has(tokens[0]) && tokens.length >= 2) {
    const rest = readFullName(tokens.slice(1));
    if (rest) person = { english: `${HONORIFICS.get(tokens[0])} ${rest.english}`, guessed: rest.guessed };
  }

  if (!person && (tokens[0] === "ابو" || tokens[0] === "ام") && tokens.length >= 2) {
    const rest = readFullName(tokens.slice(1));
    if (rest) person = { english: `${tokens[0] === "ابو" ? "Abu" : "Umm"} ${rest.english}`, guessed: rest.guessed };
  }

  if (!person) {
    const kin = readKinship(tokens);
    if (kin) {
      const kinWord = capitalizeKin ? titleCase(kin.english) : kin.english;
      const rest = tokens.slice(kin.next);
      if (rest.length === 0) {
        person = { english: kinWord, guessed: false, kinOnly: kinWord };
      } else {
        const owner = readOwner(rest, 0);
        if (owner) {
          const after = rest.slice(owner.next);
          const named = after.length > 0 ? readFullName(after) : null;
          if (after.length === 0 || named) {
            person = {
              english: `${possessive(owner.english)} ${kinWord}${named ? `, ${named.english}` : ""}`,
              guessed: owner.guessed || Boolean(named?.guessed),
              owner: after.length === 0 ? owner.english : undefined,
              kinOnly: after.length === 0 ? kinWord : undefined,
            };
          }
        }
      }
    }
  }

  if (!person) person = readFullName(tokens);
  if (!person) return null;

  if (appositive) {
    const named = readFullName(appositive);
    if (!named) return null;
    person = { english: `${person.english}, ${named.english}`, guessed: person.guessed || named.guessed };
  }
  return late ? { english: late + person.english, guessed: person.guessed } : person;
}

const knownStart = (w: string) =>
  FIRST_NAMES.has(w) || FAMILY_NAMES.has(w) || isKinWord(w) || HONORIFICS.has(w) || LATE.has(w) || w === "ابو" || w === "ام";

/** Splits on the connector «و» — standalone, or attached when the rest of the word clearly starts a new person. */
function splitPeople(tokens: string[]): string[][] {
  const groups: string[][] = [[]];
  for (const token of tokens) {
    if (token === "و") {
      groups.push([]);
      continue;
    }
    if (token.startsWith("و") && token.length > 2 && !knownStart(token) && knownStart(token.slice(1)) && groups[groups.length - 1].length > 0) {
      groups.push([token.slice(1)]);
      continue;
    }
    groups[groups.length - 1].push(token);
  }
  return groups;
}

function joinPeople(people: string[]): string {
  if (people.length <= 1) return people[0] ?? "";
  return `${people.slice(0, -1).join(", ")} and ${people[people.length - 1]}`;
}

function readSubject(text: string, capitalizeKin: boolean): Person | null {
  let appositive: string[] | null = null;
  const paren = text.match(/^(.*?)\s*\(([^()]+)\)\s*$/u);
  if (paren) {
    text = paren[1];
    appositive = paren[2].trim().split(" ");
  }
  const tokens = text.replace(/[,،]/g, " ").split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const groups = splitPeople(tokens);
  if (groups.some((g) => g.length === 0)) return null;
  const people: ReadPerson[] = [];
  for (const [index, group] of groups.entries()) {
    const person = readPerson(group, index === groups.length - 1 ? appositive : null, capitalizeKin);
    if (!person) return null;
    people.push(person);
  }
  // «جد وجدة غيداء» — bare kinship words sharing the last person's owner:
  // "Ghaida's grandfather and grandmother".
  const last = people[people.length - 1];
  if (people.length > 1 && last.owner && last.kinOnly && people.slice(0, -1).every((p) => p.kinOnly && !p.owner)) {
    const kins = [...people.slice(0, -1).map((p) => p.kinOnly!), last.kinOnly];
    return { english: `${possessive(last.owner)} ${joinPeople(kins)}`, guessed: last.guessed };
  }
  return { english: joinPeople(people.map((p) => p.english)), guessed: people.some((p) => p.guessed) };
}

/** Leading «عن / لـ / لروح / على روح …» (also attached: «لوالدة», «للمرحوم»). Returns the remaining text, or null. */
function stripLead(text: string): string | null {
  const separate = text.match(/^(?:عن(?:\s+روح)?|ل|لروح|علي\s+روح|الي\s+روح)\s+/u);
  if (separate) return text.slice(separate[0].length);
  const [first, ...rest] = text.split(" ");
  if (first.startsWith("لل") && knownStart("ال" + first.slice(2))) return ["ال" + first.slice(2), ...rest].join(" ");
  if (first.startsWith("ل") && first.length > 2 && knownStart(first.slice(1))) return [first.slice(1), ...rest].join(" ");
  return null;
}

/**
 * The person phrases a campaign is about, from its title and subtitle, with
 * their English — so free text (descriptions) repeating them keeps the same
 * names instead of the machine engine mistranslating them.
 */
export function campaignSubjects(titleAr: string, relationAr: string): { arabic: string; english: string; guessed: boolean }[] {
  const out: { arabic: string; english: string; guessed: boolean }[] = [];
  const add = (text: string | null) => {
    if (!text) return;
    const subject = text.replace(MEMORIAL_SUFFIX, "").replace(/\s*\([^()]*\)\s*$/u, "").trim();
    if (!subject || out.some((s) => s.arabic === subject)) return;
    const result = readSubject(subject, false);
    if (result) out.push({ arabic: subject, english: result.english, guessed: result.guessed });
  };
  const title = normalizeArabic(titleAr).replace(/[.!]+$/u, "").trim();
  const head = title.match(/^صدقه(\s+جاريه)?\s+/u);
  if (head) add(stripLead(title.slice(head[0].length)));
  const relation = normalizeArabic(relationAr).replace(/[.!]+$/u, "").trim();
  add(stripLead(relation) ?? relation);
  return out.sort((a, b) => b.arabic.length - a.arabic.length);
}

/**
 * People mentioned inside free text (for the machine-engine path): kinship +
 * name («والد زمزمي»), kunya («أم لينا»), honorific + name («الشيخ سعد») or
 * «المرحوم» + name. Each comes back with its English so it can be protected
 * from the engine, which otherwise translates names as words. Normalized
 * Arabic, longest first.
 */
export function findPersonPhrases(text: string): { arabic: string; english: string; guessed: boolean }[] {
  const tokens = normalizeArabic(text).replace(/[.,،؛!?؟()"«»:]/g, " ").split(" ").filter(Boolean);
  const out: { arabic: string; english: string; guessed: boolean }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let start = i;
    // Strip an attached «ل»/«و» from the first word (handled by the caller's replacement).
    const bare = (t: string) => (/^[لو]/.test(t) && t.length > 2 && !knownStart(t) && knownStart(t.slice(1)) ? t.slice(1) : t);
    const view = [...tokens];
    view[i] = bare(tokens[i]);
    let prefix = "";
    let english = "";
    let guessed = false;
    let j = i;
    if (LATE.has(view[i])) {
      prefix = "the late ";
      j = i + 1;
    }
    const own = OWN_KINSHIP.get(view[j]);
    const kin = own ? null : readKinship(view, j);
    if (own) {
      // «جدي مزعل الدعيجي» → "my grandfather Maz'al Al-Da'eeji" — the name
      // after it must be protected too, or the engine translates it as words.
      english = own;
      j = j + 1;
      const named = readFullNameAt(view, j, false);
      if (named) {
        english = `${own} ${named.english}`;
        guessed = named.guessed;
        j = named.next;
      }
    } else if (kin) {
      const owner = readOwner(view, kin.next);
      if (!owner) continue;
      english = `${possessive(owner.english)} ${kin.english}`;
      guessed = owner.guessed;
      j = owner.next;
    } else if ((view[j] === "ابو" || view[j] === "ام" || HONORIFICS.has(view[j])) && view[j + 1]) {
      const name = readFullNameAt(view, j + 1, false);
      if (!name) continue;
      english = `${view[j] === "ابو" ? "Abu" : view[j] === "ام" ? "Umm" : HONORIFICS.get(view[j])} ${name.english}`;
      guessed = name.guessed;
      j = name.next;
    } else if (prefix) {
      const name = readFullNameAt(view, j, false);
      if (!name) continue;
      english = name.english;
      guessed = name.guessed;
      j = name.next;
    } else {
      continue;
    }
    const arabic = view.slice(start, j).join(" ");
    if (!out.some((p) => p.arabic === arabic)) out.push({ arabic, english: prefix + english, guessed });
    i = j - 1;
    start = j;
  }
  return out.sort((a, b) => b.arabic.length - a.arabic.length);
}

export function translateTitleByRules(arabic: string, options: { keepMemorial: boolean }): RuleResult {
  let text = normalizeArabic(arabic).replace(/[.!]+$/u, "").trim();
  const head = text.match(/^صدقه(\s+جاريه)?\s+/u);
  if (!head) return null;
  const ongoing = Boolean(head[1]);
  const afterLead = stripLead(text.slice(head[0].length));
  if (afterLead === null) return null;
  text = afterLead;
  const memorial = text.match(MEMORIAL_SUFFIX);
  if (memorial) text = text.slice(0, memorial.index).trim();
  const subject = readSubject(text, true);
  if (!subject) return null;
  let english = `${ongoing ? "Ongoing Charity" : "Charity"} for ${subject.english}`;
  if (memorial && options.keepMemorial) english += `, ${memorialEnglish(memorial[0])}`;
  return { kind: subject.guessed ? "guess" : "exact", english };
}

export function translateRelationByRules(arabic: string): RuleResult {
  let text = normalizeArabic(arabic).replace(/[.!]+$/u, "").trim();
  const afterLead = stripLead(text);
  const lead = afterLead !== null;
  if (afterLead !== null) text = afterLead;
  const memorial = text.match(MEMORIAL_SUFFIX);
  if (memorial) text = text.slice(0, memorial.index).trim();
  const subject = readSubject(text, false);
  if (!subject) return null;
  let english = lead ? `For ${subject.english}` : subject.english.charAt(0).toUpperCase() + subject.english.slice(1);
  if (memorial) english += `, ${memorialEnglish(memorial[0])}`;
  return { kind: subject.guessed ? "guess" : "exact", english };
}
