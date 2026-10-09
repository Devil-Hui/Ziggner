import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Partners } from "./components/Partners";
import { Board } from "./components/Board";
import { Features } from "./components/Features";
import { Steps } from "./components/Steps";
import { Stories } from "./components/Stories";
import { Download } from "./components/Download";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="relative min-h-screen bg-paper">
      <Nav />
      <main>
        <Hero />
        <Partners />
        <Board />
        <Features />
        <Steps />
        <Stories />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
