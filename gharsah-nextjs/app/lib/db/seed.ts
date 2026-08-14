import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password";

/**
 * The 22 campaigns that used to live as a hardcoded array in
 * `app/lib/campaigns.ts` (see git history) — preserved here verbatim as
 * one-time seed data for a fresh database. After the first seed, this
 * module is never consulted again: the `campaigns` table is the sole
 * source of truth, and every admin edit only ever touches the database.
 * `orderIndex` matches each entry's original `order` field exactly, so a
 * freshly seeded database renders campaigns in the identical order the
 * static file used to.
 */
const SEED_CAMPAIGNS = [
  {
    slug: "1",
    orderIndex: 1,
    url: "https://ehsan.sa/campaign/B6BEE843BD",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "ex21xe",
    relationAr: "عن جدة تركي",
    relationEn: "For Turki's grandmother",
    titleAr: "صدقة جارية عن آمنة الحسن النعمي رحمها الله تعالى",
    titleEn: "Ongoing Charity for Aminah Al-Hassan Al-Nu'mi",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Turki's grandmother, Aminah Al-Hassan Al-Nu'mi — may God have mercy on her.",
  },
  {
    slug: "2",
    orderIndex: 2,
    url: "https://ehsan.sa/campaign/A22C394820",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "RHEB",
    relationAr: "عن ولد عم يوسف",
    relationEn: "For Yusuf's cousin",
    titleAr: "صدقة جاريه عن ولد عم يوسف رحمه الله",
    titleEn: "Ongoing Charity for Yusuf's Cousin",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Yusuf's cousin — may God have mercy on him.",
  },
  {
    slug: "3",
    orderIndex: 3,
    url: "https://ehsan.sa/DonationCampaign/Details/2167129",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: null,
    relationAr: "عن شادن",
    relationEn: "For Shadan",
    titleAr: "صدقة جارية عن شادن رحمها الله",
    titleEn: "Ongoing Charity for Shadan",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Shadan — may God have mercy on her.",
  },
  {
    slug: "4",
    orderIndex: 4,
    url: "https://dawa-alqasba.sa/campaigns/1767168199",
    platform: "دعوة القصبة",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "Mohammed",
    relationAr: "عن خال محمد",
    relationEn: "For Mohammed's uncle",
    titleAr: "صدقة عن المرحوم منصور بن عبدالله القرني",
    titleEn: "Charity for the Late Mansour bin Abdullah Al-Qarni",
    status: "active" as const,
    descriptionEn:
      "A charitable campaign in memory of the late Mansour bin Abdullah Al-Qarni, Mohammed's uncle — may God have mercy on him.",
  },
  {
    slug: "5",
    orderIndex: 5,
    url: "https://ehsan.sa/donationcampaign/details/1980281",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "ibruno8",
    relationAr: "عن جدة علي",
    relationEn: "For Ali's grandmother",
    titleAr: "صدقة جارية لـ وضحى مبارك الشدي رحمها الله",
    titleEn: "Ongoing Charity for Wadha Mubarak Al-Shadi",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Ali's grandmother, Wadha Mubarak Al-Shadi — may God have mercy on her.",
  },
  {
    slug: "6",
    orderIndex: 6,
    url: "https://ehsan.sa/campaign/9653BC5405",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "BDR1",
    relationAr: "عن والد بدر",
    relationEn: "For Badr's father",
    titleAr: "صدقة جارية عن والد بدر رحمه الله",
    titleEn: "Ongoing Charity for Badr's Father",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Badr's father — may God have mercy on him.",
  },
  {
    slug: "7",
    orderIndex: 7,
    url: "https://ehsan.sa/campaign/724A3CD806",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "Oola",
    relationAr: "عن ابن علا (فهيد الشمري)",
    relationEn: "For Ola's son, Fuhaid Al-Shammari",
    titleAr: "صدقة جارية عن ابن علا فهيد الشمري رحمة الله",
    titleEn: "Ongoing Charity for Fuhaid Al-Shammari",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Ola's son, Fuhaid Al-Shammari — may God have mercy on him.",
  },
  {
    slug: "8",
    orderIndex: 8,
    url: "https://ehsan.sa/donationcampaign/details/1841576",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "s4leeh",
    relationAr: "عن خالة صالح",
    relationEn: "For Saleh's aunt",
    titleAr: "صدقة جارية عن دنانير البطي رحمها الله",
    titleEn: "Ongoing Charity for Dananeer Al-Butti",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Saleh's aunt, Dananeer Al-Butti — may God have mercy on her.",
  },
  {
    slug: "9",
    orderIndex: 9,
    url: "https://ehsan.sa/campaign/FF75D97AD2",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "Ksi7",
    relationAr: "عن والد محمد",
    relationEn: "For Mohammed's father",
    titleAr: "صدقة جارية عن أبو محمد",
    titleEn: "Ongoing Charity for Abu Mohammed",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Mohammed's father — may God have mercy on him.",
  },
  {
    slug: "10",
    orderIndex: 10,
    url: "https://ehsan.sa/campaign/3D4A95F848",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "OnlyRawan",
    relationAr: "عن والد روان",
    relationEn: "For Rawan's father",
    titleAr: "صدقة جارية عن والد روان رحمه الله",
    titleEn: "Ongoing Charity for Rawan's Father",
    status: "completed" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Rawan's father — may God have mercy on him.",
  },
  {
    slug: "11",
    orderIndex: 11,
    url: "https://ehsan.sa/DonationCampaign/Details/1614820",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "mej9",
    relationAr: "عن والدة أمجاد",
    relationEn: "For Amjad's mother",
    titleAr: "صدقة جارية عن والدة أمجاد رحمها الله",
    titleEn: "Ongoing Charity for Amjad's Mother",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Amjad's mother — may God have mercy on her.",
  },
  {
    slug: "12",
    orderIndex: 12,
    url: "https://ehsan.sa/campaign/1536C4A05B",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "lon31y_",
    relationAr: "عن والد وليد",
    relationEn: "For Waleed's father",
    titleAr: "صدقة جارية عن والد وليد",
    titleEn: "Ongoing Charity for Waleed's Father",
    status: "active" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Waleed's father — may God have mercy on him.",
  },
  {
    slug: "13",
    orderIndex: 13,
    url: "https://ehsan.sa/DonationCampaign/Details/1548897",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "twentytwo-22",
    relationAr: "عن والد ريان",
    relationEn: "For Rayan's father",
    titleAr: "صدقة عن والد ريان رحمه الله",
    titleEn: "Charity for Rayan's Father",
    status: "active" as const,
    descriptionEn: "A charity campaign in memory of Rayan's father — may God have mercy on him.",
  },
  {
    slug: "14",
    orderIndex: 14,
    url: "https://ehsan.sa/donationcampaign/details/1513522",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "NearLina",
    relationAr: "عن جدة لينا",
    relationEn: "For Lina's grandmother",
    titleAr: "صدقة جارية عن جدة لينا رحمها الله",
    titleEn: "Ongoing Charity for Lina's Grandmother",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Lina's grandmother — may God have mercy on her.",
  },
  {
    slug: "15",
    orderIndex: 15,
    url: "https://ehsan.sa/campaign/1B02D2C4B4",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "Spitfire57",
    relationAr: "عن جدة عبد الملك",
    relationEn: "For Abdulmalik's grandmother",
    titleAr: "صدقة جارية عن جدة عبدالملك رحمها الله",
    titleEn: "Ongoing Charity for Abdulmalik's Grandmother",
    status: "active" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Abdulmalik's grandmother — may God have mercy on her.",
  },
  {
    slug: "16",
    orderIndex: 16,
    url: "https://ehsan.sa/campaign/17398FA67F",
    platform: "منصة إحسان",
    memorialPrefixAr: null,
    memorialPrefixEn: null,
    username: null,
    relationAr: "غرسة مجتمع البثوث",
    relationEn: "Buthooth Community",
    titleAr: "غرسة مجتمع البثوث",
    titleEn: "Gharsah for the Buthooth Community",
    status: "completed" as const,
    descriptionEn: "A collective charity campaign by the Buthooth community, with its reward intended for all.",
  },
  {
    slug: "17",
    orderIndex: 17,
    url: "https://ehsan.sa/campaign/AA0A2F62DF",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمه الله",
    memorialPrefixEn: "may God have mercy on him",
    username: "iFalk7",
    relationAr: "عن والد فلك",
    relationEn: "For Falak's father",
    titleAr: "صدقة جارية عن شار محمد عسيري رحمه الله",
    titleEn: "Ongoing Charity for Shar Mohammed Asiri",
    status: "completed" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Falak's father, Shar Mohammed Asiri — may God have mercy on him.",
  },
  {
    slug: "18",
    orderIndex: 18,
    url: "https://ehsan.sa/campaign/5E47A82B20",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "Raheeb",
    relationAr: "عن والدة رهيب",
    relationEn: "For Raheeb's mother",
    titleAr: "صدقة جارية عن والدة رهيب رحمها الله",
    titleEn: "Ongoing Charity for Raheeb's Mother",
    status: "completed" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Raheeb's mother — may God have mercy on her.",
  },
  {
    slug: "19",
    orderIndex: 19,
    url: "https://ehsan.sa/campaign/DCB95CFA07",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "iDexter89",
    relationAr: "عن اخت عبدالله",
    relationEn: "For Abdullah's sister",
    titleAr: "صدقة جارية عن اخت عبدالله رحمها الله",
    titleEn: "Ongoing Charity for Abdullah's Sister",
    status: "completed" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Abdullah's sister — may God have mercy on her.",
  },
  {
    slug: "20",
    orderIndex: 20,
    url: "https://ehsan.sa/campaign/CC35D9365E",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "NearLina",
    relationAr: "عن والدة لينا",
    relationEn: "For Lina's mother",
    titleAr: "صدقه جاريه عن ام لينا",
    titleEn: "Ongoing Charity for Umm Lina",
    status: "completed" as const,
    descriptionEn: "An ongoing charity (sadaqah jariyah) in loving memory of Lina's mother — may God have mercy on her.",
  },
  {
    slug: "21",
    orderIndex: 21,
    url: "https://ehsan.sa/campaign/EFD1C62369",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "tlvr",
    relationAr: "عن جدة فارس",
    relationEn: "For Faris's grandmother",
    titleAr: "صدقة جارية عن لولوه العفيصان رحمها الله",
    titleEn: "Ongoing Charity for Lulwa Al-Ofaisan",
    status: "completed" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Faris's grandmother, Lulwa Al-Ofaisan — may God have mercy on her.",
  },
  {
    slug: "22",
    orderIndex: 22,
    url: "https://ehsan.sa/campaign/33161ED961",
    platform: "منصة إحسان",
    memorialPrefixAr: "رحمها الله",
    memorialPrefixEn: "may God have mercy on her",
    username: "r4ef",
    relationAr: "عن جدة رايف",
    relationEn: "For Raif's grandmother",
    titleAr: "صدقه جاريه عن طعمه محمد الشهري",
    titleEn: "Ongoing Charity for Ta'mah Mohammed Al-Shahri",
    status: "completed" as const,
    descriptionEn:
      "An ongoing charity (sadaqah jariyah) in loving memory of Raif's grandmother, Ta'mah Mohammed Al-Shahri — may God have mercy on her.",
  },
];

export function runSeed(database: DatabaseSync): void {
  const { count } = database.prepare("SELECT COUNT(*) as count FROM campaigns").get() as { count: number };
  if (count === 0) {
    // translation_status is hardcoded 'ok' below: this seed data's English
    // was hand-authored (see git history), not AI-translated, and is
    // trustworthy as-is — it should never be flagged as a translation
    // failure needing a retry. description_source/title_source are both
    // 'manual' for the same reason — none of it was fetched from Ehsan by
    // this feature.
    const insert = database.prepare(
      `INSERT INTO campaigns
        (id, slug, order_index, url, platform, memorial_prefix_ar, memorial_prefix_en, username, relation_ar, relation_en, title_ar, title_en, status, description_ar, description_en, percent, archived_at, created_at, updated_at, translation_status, translation_error, description_source, title_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'ok', NULL, 'manual', 'manual')`,
    );
    const now = new Date().toISOString();
    for (const c of SEED_CAMPAIGNS) {
      insert.run(
        randomUUID(),
        c.slug,
        c.orderIndex,
        c.url,
        c.platform,
        c.memorialPrefixAr,
        c.memorialPrefixEn,
        c.username,
        c.relationAr,
        c.relationEn,
        c.titleAr,
        c.titleEn,
        c.status,
        null,
        c.descriptionEn,
        now,
        now,
      );
    }
    console.warn(`[db] Seeded ${SEED_CAMPAIGNS.length} campaigns from the original static dataset.`);
  }

  bootstrapAdmin(database);
}

/**
 * Creates the first admin account from ADMIN_USERNAME/ADMIN_PASSWORD if the
 * `admins` table is still empty. Deliberately takes the raw `database`
 * handle as a parameter and does its own inline INSERT rather than calling
 * into `./admins` (which imports the `db` singleton from `./client`) —
 * this runs from inside `client.ts`'s own `createDb()`, before that
 * module's `export const db = ...` has finished initializing, so importing
 * the singleton here would hit the temporal dead zone. `./admins`'s own
 * `ensureBootstrapAdmin` does the same check for any other future caller
 * that already has a fully-initialized `db` to work with.
 */
function bootstrapAdmin(database: DatabaseSync): void {
  const { count } = database.prepare("SELECT COUNT(*) as count FROM admins").get() as { count: number };
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      "[admin] No admin account exists yet and ADMIN_USERNAME/ADMIN_PASSWORD are not set — nobody can log in until one is created.",
    );
    return;
  }

  const { hash, salt } = hashPassword(password);
  database
    .prepare("INSERT INTO admins (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), username, hash, salt, new Date().toISOString());
  console.warn(`[admin] Bootstrapped initial admin account "${username}" from environment variables.`);
}
