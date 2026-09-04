/**
 * Real MSA numeral-noun agreement (3–10 takes the plural دقائق, 11+ takes
 * the singular دقيقة) — matches the exact examples "5 دقائق", "15 دقيقة",
 * "30 دقيقة", "ساعة". Shared by both overlay types' interval sliders (see
 * IntervalSlider.tsx) — never a second copy of this agreement logic.
 */
export function formatMinutesLabel(minutes: number): string {
  if (minutes === 60) return "ساعة";
  if (minutes === 1) return "دقيقة";
  if (minutes === 2) return "دقيقتان";
  if (minutes <= 10) return `${minutes} دقائق`;
  return `${minutes} دقيقة`;
}
