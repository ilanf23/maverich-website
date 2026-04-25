import { ScrollProgress } from "@/components/site/scroll-progress";
import { SiteHeader } from "@/components/site/site-header";
import { HeroSection } from "@/components/sections/hero-section";
import { ProductsSection } from "@/components/sections/products-section";
import { ProofSection } from "@/components/sections/proof-section";
import { ProcessSection } from "@/components/sections/process-section";
import { FoundersSection } from "@/components/sections/founders-section";
import { CtaSection } from "@/components/sections/cta-section";
import { SiteFooter } from "@/components/sections/site-footer";
import { PersistentCanvasMount } from "@/components/3d/persistent-canvas-mount";
import { LoadingScreen } from "@/components/site/loading-screen";
import { SkipIntroButton } from "@/components/site/skip-intro-button";

export default function Home() {
  return (
    <>
      {/* Persistent canvas — fixed at z-1 across the entire page. The
          jet is the user's wingman through every section; canyon
          environment fades out past the hero. */}
      <PersistentCanvasMount />

      {/* Cinematic intro chrome — loader masks asset stream, skip button
          appears once the autoplay starts. Both gate themselves on
          IntroProvider phase internally. */}
      <LoadingScreen />
      <SkipIntroButton />

      {/* Page chrome — all gated to phase=complete inside their own
          components so they stay invisible during the cinematic. */}
      <ScrollProgress />
      <SiteHeader />

      {/* Page body — sits at z-2, scrolls normally on top of the canvas. */}
      <main className="relative z-[2]">
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
