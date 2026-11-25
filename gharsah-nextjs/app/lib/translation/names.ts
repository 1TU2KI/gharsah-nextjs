import { normalizeArabic } from "./arabic";

/**
 * Curated Arabic → English spellings for personal names, family names and
 * kinship words used in campaign titles/subtitles. A name found here is a
 * reliable translation; a name NOT found here can only be guessed by
 * transliteration, which the translator reports as "needs review" — never
 * as a successful translation. Extend these lists to cover new names.
 *
 * Spellings follow the conventions already used in Gharsah's hand-written
 * English (Mohammed, Abdullah, Yusuf, Saleh, Waleed, Al-Shammari …).
 * Keys are normalized on load (ة→ه, ى→ي, أ/إ/آ→ا), so either spelling matches.
 */

const FIRST_NAMES_RAW: Record<string, string> = {
  // Men
  محمد: "Mohammed", أحمد: "Ahmed", محمود: "Mahmoud", حامد: "Hamed", حمد: "Hamad", حمدان: "Hamdan", مصطفى: "Mustafa",
  علي: "Ali", عمر: "Omar", عثمان: "Othman", أبوبكر: "Abu Bakr", حسن: "Hassan", حسين: "Hussein", حسان: "Hassan",
  إبراهيم: "Ibrahim", إسماعيل: "Ismail", إسحاق: "Ishaq", يعقوب: "Yaqoub", يوسف: "Yusuf", يونس: "Younis", يحيى: "Yahya",
  موسى: "Musa", عيسى: "Eisa", سليمان: "Sulaiman", داود: "Dawood", زكريا: "Zakaria", آدم: "Adam", نوح: "Nouh", إلياس: "Elias",
  خالد: "Khalid", خليل: "Khalil", سعد: "Saad", سعود: "Saud", سعيد: "Saeed", مسعود: "Masoud", سالم: "Salem", سلمان: "Salman",
  سلطان: "Sultan", صالح: "Saleh", صلاح: "Salah", فهد: "Fahad", فيصل: "Faisal", فارس: "Faris", فواز: "Fawaz", فراس: "Firas",
  فهيد: "Fuhaid", فايز: "Fayez", ناصر: "Nasser", نايف: "Naif", نواف: "Nawaf", نبيل: "Nabil", نادر: "Nader",
  ماجد: "Majed", مشعل: "Mishal", مشاري: "Mishari", متعب: "Mutaib", منصور: "Mansour", مبارك: "Mubarak", مالك: "Malik",
  بدر: "Badr", بندر: "Bandar", باسل: "Basel", بسام: "Bassam", تركي: "Turki", تميم: "Tamim", ثامر: "Thamer", جابر: "Jaber",
  جاسم: "Jassim", جمال: "Jamal", حمود: "Hamoud", حمزة: "Hamza", راشد: "Rashid", رائد: "Raed", رايف: "Raif", رامي: "Rami",
  ريان: "Rayan", زياد: "Ziyad", زيد: "Zaid", سامي: "Sami", سامر: "Samer", سيف: "Saif", شادي: "Shadi", طارق: "Tariq",
  طلال: "Talal", عادل: "Adel", عاصم: "Asim", عامر: "Amer", عزيز: "Aziz", عصام: "Essam", عماد: "Emad",
  عمار: "Ammar", عوض: "Awad", عياد: "Ayyad", غازي: "Ghazi", غانم: "Ghanem", قاسم: "Qasim", كريم: "Karim", لؤي: "Louay",
  مازن: "Mazen", مهند: "Muhannad", معاذ: "Muadh", مروان: "Marwan", مساعد: "Musaed", مشعان: "Mishaan",
  مطلق: "Mutlaq", معتز: "Moataz", منير: "Munir", نجيب: "Najib", نزار: "Nizar", هاني: "Hani", هشام: "Hisham", هادي: "Hadi",
  وليد: "Waleed", وائل: "Wael", وسام: "Wesam", ياسر: "Yasser", ياسين: "Yassin", يزيد: "Yazeed", أنس: "Anas", أسامة: "Osama",
  أيمن: "Ayman", أيوب: "Ayoub", إياد: "Iyad", أمين: "Amin", أكرم: "Akram", أنور: "Anwar", بشير: "Bashir", بلال: "Bilal",
  حاتم: "Hatem", حازم: "Hazem", حمدي: "Hamdi", خلف: "Khalaf", دخيل: "Dakhil", ذياب: "Dhiyab", راكان: "Rakan", رشيد: "Rashid",
  رياض: "Riyadh", زامل: "Zamil", سطام: "Sattam", سعدون: "Saadoun", شار: "Shar", شاهر: "Shaher", ضيف: "Daif", ظافر: "Dhafer",
  عايض: "Ayed", عبود: "Abboud", عقيل: "Aqeel", عواد: "Awwad", غالب: "Ghaleb", فلاح: "Falah", فرحان: "Farhan", فالح: "Faleh",
  مفلح: "Muflih", مرزوق: "Marzouq", مقبل: "Muqbil", نهار: "Nahar", هزاع: "Hazza", هيثم: "Haitham",
  // Abd- compounds (also matched when written as two words, "عبد الله")
  عبدالله: "Abdullah", عبدالرحمن: "Abdulrahman", عبدالعزيز: "Abdulaziz", عبدالملك: "Abdulmalik", عبدالكريم: "Abdulkarim",
  عبدالمجيد: "Abdulmajeed", عبدالإله: "Abdulelah", عبدالمحسن: "Abdulmohsen", عبدالهادي: "Abdulhadi", عبدالوهاب: "Abdulwahab",
  عبدالسلام: "Abdulsalam", عبدالرزاق: "Abdulrazzaq", عبدالحميد: "Abdulhamid", عبداللطيف: "Abdullatif", عبدالقادر: "Abdulqader",
  عبدالغني: "Abdulghani", عبدالرحيم: "Abdulrahim", عبدالعليم: "Abdulaleem", عبدالخالق: "Abdulkhaliq", عبدالمنعم: "Abdulmonem",
  عبدالجبار: "Abduljabbar", عبدالباسط: "Abdulbasit", عبدالحكيم: "Abdulhakim", عبدالمطلب: "Abdulmuttalib", عبدالناصر: "Abdulnasser",
  عبدالفتاح: "Abdulfattah", عبدالودود: "Abdulwadood", عبدالصمد: "Abdulsamad", عبدالجليل: "Abduljalil", عبدالعظيم: "Abdulazim",
  // Women
  فاطمة: "Fatima", عائشة: "Aisha", خديجة: "Khadija", مريم: "Maryam", زينب: "Zainab", آمنة: "Aminah", حليمة: "Halima",
  سارة: "Sarah", هاجر: "Hajar", نورة: "Noura", نوره: "Noura", نور: "Nour", منيرة: "Munira", موضي: "Moudi", وضحى: "Wadha",
  شادن: "Shadan", لينا: "Lina", لولوة: "Lulwa", لولوه: "Lulwa", روان: "Rawan", رهف: "Rahaf", ريم: "Reem", رنا: "Rana",
  رزان: "Razan", ريما: "Rima", سلمى: "Salma", سلوى: "Salwa", سمية: "Sumaya", سعاد: "Suad", سهام: "Siham", سميرة: "Samira",
  شيخة: "Sheikha", صفية: "Safiya", طرفة: "Tarfa", عبلة: "Abla", علا: "Ola", غادة: "Ghada", غدير: "Ghadeer", فلك: "Falak",
  فوزية: "Fawzia", لطيفة: "Latifa", ليلى: "Layla", مها: "Maha", منى: "Mona", ميعاد: "Mi'ad", نجلاء: "Najla", نوال: "Nawal",
  هند: "Hind", هيا: "Haya", هدى: "Huda", وفاء: "Wafa", وعد: "Waad", ياسمين: "Yasmin", أمجاد: "Amjad", أمل: "Amal",
  أسماء: "Asma", أروى: "Arwa", بشاير: "Bashayer", بدرية: "Badriya", تهاني: "Tahani", جواهر: "Jawaher", حصة: "Hessa",
  دانة: "Dana", دنانير: "Dananeer", رقية: "Ruqayya", رهيب: "Raheeb", ريوف: "Riyouf", ساره: "Sarah", شهد: "Shahad",
  عبير: "Abeer", عفاف: "Afaf", غلا: "Ghala", فجر: "Fajr", لمى: "Lama", ملاك: "Malak", مشاعل: "Mashael", نجود: "Nujood",
  نوف: "Nouf", هنادي: "Hanadi", وجدان: "Wijdan", جميلة: "Jamila", طعمة: "Ta'mah", ضحى: "Duha", الجوهرة: "Al-Jawhara",
  العنود: "Al-Anoud", البندري: "Al-Bandari", الهنوف: "Al-Hanouf",
};

const FAMILY_NAMES_RAW: Record<string, string> = {
  الشمري: "Al-Shammari", القحطاني: "Al-Qahtani", العتيبي: "Al-Otaibi", الغامدي: "Al-Ghamdi", الزهراني: "Al-Zahrani",
  الدوسري: "Al-Dosari", الحربي: "Al-Harbi", المطيري: "Al-Mutairi", العنزي: "Al-Anazi", الشهري: "Al-Shahri",
  العسيري: "Al-Asiri", عسيري: "Asiri", القرني: "Al-Qarni", السبيعي: "Al-Subaie", الشهراني: "Al-Shahrani", المالكي: "Al-Malki",
  العمري: "Al-Omari", السهلي: "Al-Sahli", الرشيدي: "Al-Rashidi", الجهني: "Al-Juhani", البلوي: "Al-Balawi",
  الخالدي: "Al-Khalidi", الهاجري: "Al-Hajri", اليامي: "Al-Yami", الشمراني: "Al-Shamrani", الأحمدي: "Al-Ahmadi",
  السلمي: "Al-Sulami", الثبيتي: "Al-Thubaiti", الحارثي: "Al-Harthi", الجابري: "Al-Jabri", المسعودي: "Al-Masoudi",
  العبادي: "Al-Abadi", النعمي: "Al-Nu'mi", الشدي: "Al-Shadi", البطي: "Al-Butti", العفيصان: "Al-Ofaisan",
  الشريف: "Al-Sharif", الأنصاري: "Al-Ansari", التميمي: "Al-Tamimi", الرويلي: "Al-Ruwaili",
  الشراري: "Al-Sharari", الظفيري: "Al-Dhafiri", العجمي: "Al-Ajmi", المري: "Al-Marri", الكعبي: "Al-Kaabi",
  السديري: "Al-Sudairi", السويلم: "Al-Suwailem", الفيفي: "Al-Faifi", الزبيدي: "Al-Zubaidi", الصاعدي: "Al-Saadi",
  البقمي: "Al-Buqami", السفياني: "Al-Sufyani", الثقفي: "Al-Thaqafi", الحازمي: "Al-Hazmi", المحمدي: "Al-Muhammadi",
  الرحيلي: "Al-Ruhaili", العوفي: "Al-Awfi", اللحياني: "Al-Lihyani", المولد: "Al-Muwallad", باوزير: "Bawazir",
  الخثعمي: "Al-Khathami", البيشي: "Al-Bishi", الأسمري: "Al-Asmari", العلياني: "Al-Alyani",
  الوادعي: "Al-Wadei", النفيعي: "Al-Nufaie", القرشي: "Al-Qurashi", الهذلي: "Al-Hudhali", المنصور: "Al-Mansour",
  الراشد: "Al-Rashid", السعيد: "Al-Saeed", الصالح: "Al-Saleh", الفهد: "Al-Fahad", العثمان: "Al-Othman", الحسن: "Al-Hassan",
  الحسين: "Al-Hussein", العلي: "Al-Ali", المحمد: "Al-Mohammed", العبدالله: "Al-Abdullah", الناصر: "Al-Nasser",
  الشهيل: "Al-Shuhail", الدخيل: "Al-Dakhil", الخليفة: "Al-Khalifa", المطوع: "Al-Mutawa", الجبير: "Al-Jubeir",
};

/** Kinship words (normalized keys). Two-word forms are listed with a space. */
const KINSHIP_RAW: Record<string, string> = {
  والد: "father", والدة: "mother", أب: "father", جد: "grandfather", جدة: "grandmother",
  خال: "maternal uncle", خالة: "maternal aunt", عم: "paternal uncle", عمة: "paternal aunt",
  أخ: "brother", أخو: "brother", أخت: "sister", ابن: "son", ولد: "son", بنت: "daughter", ابنة: "daughter",
  زوج: "husband", زوجة: "wife", حفيد: "grandson", حفيدة: "granddaughter", صديق: "friend", صديقة: "friend",
  "ولد عم": "cousin", "ابن عم": "cousin", "بنت عم": "cousin", "ولد خال": "cousin", "ابن خال": "cousin", "بنت خال": "cousin",
  "ولد خالة": "cousin", "ابن خالة": "cousin", "بنت خالة": "cousin", "ولد عمة": "cousin", "ابن عمة": "cousin", "بنت عمة": "cousin",
};

/** First-person kinship ("my father") — complete on their own, no owner name follows. */
const OWN_KINSHIP_RAW: Record<string, string> = {
  والدي: "my father", والدتي: "my mother", أبي: "my father", أمي: "my mother", جدي: "my grandfather", جدتي: "my grandmother",
  أخي: "my brother", أختي: "my sister", خالي: "my maternal uncle", خالتي: "my maternal aunt", عمي: "my paternal uncle",
  عمتي: "my paternal aunt", ابني: "my son", ابنتي: "my daughter", بنتي: "my daughter", زوجي: "my husband", زوجتي: "my wife",
};

function normalizeKeys(raw: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(raw)) map.set(normalizeArabic(key.replace(/\d+$/, "")), value);
  return map;
}

export const FIRST_NAMES = normalizeKeys(FIRST_NAMES_RAW);
export const FAMILY_NAMES = normalizeKeys(FAMILY_NAMES_RAW);
export const KINSHIP = normalizeKeys(KINSHIP_RAW);
export const OWN_KINSHIP = normalizeKeys(OWN_KINSHIP_RAW);

/** More common names (merged into the dictionary above). */
const MORE_FIRST_NAMES_RAW: Record<string, string> = {
  سلطانة: "Sultana", غيداء: "Ghaida", الجازي: "Al-Jazi", جازي: "Jazi", نورة2: "Noura", لطيف: "Latif", عزام: "Azzam",
  عبدالمجيد2: "Abdulmajeed", حمدة: "Hamda", شيماء: "Shaima", دلال: "Dalal", نادية: "Nadia", رشا: "Rasha", سحر: "Sahar",
  منيف: "Munif", مفرح: "Mufarreh", مرعي: "Marei", ظاهر: "Dhaher", صقر: "Saqr", شبيب: "Shabib", سند: "Sanad",
  عيد: "Eid", حسين2: "Hussein", صالحة: "Saleha", مزنة: "Muzna", الشيماء: "Al-Shaima", ريناد: "Renad", جود: "Joud",
  تالا: "Tala", ليان: "Layan", رغد: "Raghad", لجين: "Lujain", يارا: "Yara", جنى: "Jana", حلا: "Hala", ديما: "Dima",
  مريم2: "Maryam", فيصل2: "Faisal", عبدالرحمن2: "Abdulrahman", نواف2: "Nawaf", تركية: "Turkiya", بدور: "Bdour",
  هيفاء: "Haifa", سلمان2: "Salman", مساعد2: "Musaed", ماجدة: "Majida", نايفة: "Naifa", عواطف: "Awatif", قماشة: "Qumasha",
};
for (const [key, value] of Object.entries(MORE_FIRST_NAMES_RAW)) {
  const normalized = normalizeArabic(key.replace(/\d+$/, ""));
  if (!FIRST_NAMES.has(normalized)) FIRST_NAMES.set(normalized, value);
}

/**
 * Romanization for a proper name missing from the dictionaries. Arabic
 * script omits most short vowels, so the spelling is a best guess (e.g.
 * «زمزمي» → "Zamzami", «غيداء» → "Ghaida") — callers flag any translation
 * that relies on it as "Review recommended". Used ONLY for proper names;
 * ordinary words are never transliterated (see rules.ts).
 */
const CONSONANTS: Record<string, string> = {
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "dh", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h",
};

function romanize(word: string): string {
  const chars = [...word];
  const units: { text: string; vowel: boolean }[] = [];
  chars.forEach((ch, i) => {
    const first = i === 0;
    const last = i === chars.length - 1;
    const prevVowel = units.length > 0 && units[units.length - 1].vowel;
    const nextAlef = chars[i + 1] === "ا";
    if (ch === "ا") units.push({ text: "a", vowel: true });
    else if (ch === "ي" || ch === "ى") {
      if (first) units.push({ text: "y", vowel: false });
      else if (last) units.push({ text: ch === "ى" ? "a" : "i", vowel: true });
      else if (prevVowel || nextAlef) units.push({ text: "y", vowel: false });
      else units.push({ text: "ee", vowel: true });
    } else if (ch === "و") {
      if (first) units.push({ text: "w", vowel: false });
      else if (prevVowel || nextAlef || chars[i + 1] === "ي") units.push({ text: "w", vowel: false });
      else units.push({ text: "ou", vowel: true });
    } else if (ch === "ه" || ch === "ة") {
      units.push(last ? { text: "a", vowel: true } : { text: "h", vowel: false });
    } else if (ch === "ع") {
      if (first) units.push({ text: "a", vowel: true });
      else if (!last) units.push({ text: "'", vowel: false });
    } else if (ch === "ء" || ch === "ئ" || ch === "ؤ") {
      if (!last && !first) units.push({ text: "'", vowel: false });
    } else if (CONSONANTS[ch]) units.push({ text: CONSONANTS[ch], vowel: false });
  });
  // Short vowels aren't written: put an "a" between two consonants at the
  // start and wherever three consonants would otherwise meet.
  let out = "";
  let run = 0;
  units.forEach((unit, i) => {
    const consonant = !unit.vowel;
    if (consonant && run >= 1 && (i === 1 || run >= 2)) {
      out += "a";
      run = 0;
    }
    out += unit.text;
    run = consonant ? run + 1 : 0;
  });
  out = out.replace(/'+$/, "").replace(/^'+/, "").replace(/aa+/g, "aa").replace(/a'a/g, "a'a");
  return out ? out.charAt(0).toUpperCase() + out.slice(1) : "";
}

export function transliterateGuess(token: string): string {
  const word = normalizeArabic(token);
  if (word.startsWith("عبد") && word.length > 4) {
    const rest = word.slice(3).replace(/^ال/, "");
    return "Abdul" + romanize(rest).toLowerCase();
  }
  if (word.startsWith("ال") && word.length > 3) return "Al-" + romanize(word.slice(2));
  return romanize(word);
}
