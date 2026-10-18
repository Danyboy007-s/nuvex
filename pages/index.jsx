import Layout from "../components/Layout";
import HeroSection from "../components/HeroSection";
import FeaturedTools from "../components/FeaturedTools";
import AiRoadmap from "../components/AiRoadmap";
import WhyNuvex from "../components/WhyNuvex";
import Footer from "../components/Footer";

// Portada: Nuvex IA (lo más destacado) → herramientas → lo que viene con IA → por qué Nuvex.
export default function Home() {
  return (
    <Layout>
      <HeroSection />
      <FeaturedTools />
      <AiRoadmap />
      <WhyNuvex />
      <Footer />
    </Layout>
  );
}
