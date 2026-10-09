import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Capabilities from "./components/Capabilities";
import EspressoDemo from "./components/EspressoDemo";
import Stories from "./components/Stories";
import Footer from "./components/Footer";
import CheckoutModal from "./components/CheckoutModal";

export default function App() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar onStart={() => setCheckoutOpen(true)} />
      <main>
        <Hero onStart={() => setCheckoutOpen(true)} />
        <Capabilities onStart={() => setCheckoutOpen(true)} />
        <EspressoDemo />
        <Stories onStart={() => setCheckoutOpen(true)} />
      </main>
      <Footer onStart={() => setCheckoutOpen(true)} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}
