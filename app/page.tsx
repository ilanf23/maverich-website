import { ScrollProgress } from "@/components/site/scroll-progress";
import { SiteHeader } from "@/components/site/site-header";
import { HeroSection } from "@/components/sections/hero-section";
import { ProductsSection } from "@/components/sections/products-section";
import { ProofSection } from "@/components/sections/proof-section";
import { ProcessSection } from "@/components/sections/process-section";
import { FoundersSection } from "@/components/sections/founders-section";
import { CtaSection } from "@/components/sections/cta-section";
import { SiteFooter } from "@/components/sections/site-footer";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main className="relative">
        <HeroSection />
        <ProductsSection />
        <ProofSection />
        <ProcessSection />
        <FoundersSection />
        <CtaSection />
        <SiteFooter />
      </main>
    </>
  );
}
