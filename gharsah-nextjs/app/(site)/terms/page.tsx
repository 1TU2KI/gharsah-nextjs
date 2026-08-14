import type { Metadata } from "next";
import TermsPageClient from "./TermsPageClient";

export const metadata: Metadata = {
  title: "الشروط والأحكام | غرسة",
};

export default function TermsPage() {
  return <TermsPageClient />;
}
