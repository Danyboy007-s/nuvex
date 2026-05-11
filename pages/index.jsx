import Layout from "../components/Layout";
import HeroSection from "../components/HeroSection";
import FeaturedTools from "../components/FeaturedTools";
import WhyNuvex from "../components/WhyNuvex";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <Layout>
      <HeroSection />
      <FeaturedTools />
      <WhyNuvex />
      <Footer />
    </Layout>
  );
}