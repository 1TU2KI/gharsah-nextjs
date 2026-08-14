import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "عن غرسة | غرسة",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
