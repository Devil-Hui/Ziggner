import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Proof from "./components/Proof";
import Community from "./components/Community";
import Features from "./components/Features";
import Download from "./components/Download";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-paper-white font-sans text-ink antialiased">
      <Nav />
      <main>
        <Hero />
        <Proof />
        <Community />
        <Features />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
