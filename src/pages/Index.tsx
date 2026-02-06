import { WarningBanner } from "@/components/landing/WarningBanner";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AgentDiagram } from "@/components/landing/AgentDiagram";
import { ExplainerSections } from "@/components/landing/ExplainerSections";
import { X402FlowVisual } from "@/components/landing/X402FlowVisual";
import { RoleCards } from "@/components/landing/RoleCards";
import { SetupGuide } from "@/components/landing/SetupGuide";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      <WarningBanner />
      <Navbar />
      <main>
        <HeroSection />
        <AgentDiagram />
        <ExplainerSections />
        <X402FlowVisual />
        <RoleCards />
        <SetupGuide />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
