"use client";

import { Amiri } from "next/font/google";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["700"],
});

const DEFAULT_VERSE =
  "﴿ مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ ۗ وَاللَّهُ وَاسِعٌ عَلِيمٌ ﴾";
const DEFAULT_REFERENCE_EN = "Al-Baqarah, Verse 261";
const DEFAULT_TRANSLATION =
  "The example of those who spend their wealth in the way of Allah is like a seed [of grain] which grows seven spikes; in each spike is a hundred grains. And Allah multiplies [His reward] for whom He wills. And Allah is all-Encompassing and Knowing.";

/**
 * The Arabic verse text is never altered or replaced — it renders exactly as
 * given in both locales. In English mode only, a Sahih International
 * translation is added underneath (smaller, lighter, secondary to the
 * Arabic), followed by the surah/verse reference and a subtle attribution.
 * Every call site across the app deliberately sources its translation from
 * the same Sahih International edition, never a mix of translations.
 *
 * The Arabic surah/verse reference (`reference`) has no default value and is
 * only rendered where a caller explicitly passes it — deliberately scoped to
 * the Active/Completed campaigns pages, not the homepage default verse.
 */
export default function OpeningVerse({
  verse = DEFAULT_VERSE,
  reference,
  translation = DEFAULT_TRANSLATION,
  referenceEn = DEFAULT_REFERENCE_EN,
}: {
  verse?: string;
  reference?: string;
  translation?: string;
  referenceEn?: string;
}) {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";

  return (
    <div>
      <p
        dir="rtl"
        className={`${amiri.className} mx-auto max-w-4xl text-center text-2xl leading-loose text-foreground sm:text-3xl sm:leading-loose md:text-4xl md:leading-loose`}
      >
        {verse}
      </p>

      {!isEnglish && reference && (
        <p dir="rtl" className="mt-3 text-center text-sm text-muted">
          {reference}
        </p>
      )}

      {isEnglish && translation && (
        <p dir="ltr" className="mx-auto mt-4 max-w-2xl text-center text-sm font-normal leading-7 text-muted sm:text-base sm:leading-8">
          {translation}
        </p>
      )}

      {isEnglish && referenceEn && (
        <p dir="ltr" className="mt-3 text-center text-sm text-muted">
          {referenceEn}
        </p>
      )}

      {isEnglish && translation && (
        <p dir="ltr" className="mt-1 text-center text-[11px] text-muted/70">
          Translation: Sahih International
        </p>
      )}
    </div>
  );
}
