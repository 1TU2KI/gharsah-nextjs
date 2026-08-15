import ActiveCasesSection from "@/app/components/home/ActiveCasesSection";
import AlmostThereSection from "@/app/components/home/AlmostThereSection";
import CompletedCasesSection from "@/app/components/home/CompletedCasesSection";
import ContactSection from "@/app/components/home/ContactSection";
import Goals from "@/app/components/home/Goals";
import Hero from "@/app/components/home/Hero";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Goals />
      <AlmostThereSection />
      <ActiveCasesSection />
      <CompletedCasesSection />
      <ContactSection />
    </main>
  );
}
