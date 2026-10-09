import { useEffect, useState } from "react";
import { X, Check, CreditCard, Landmark, Wallet, Loader2, Lock, ArrowRight, ArrowLeft } from "lucide-react";

const METHODS = [
  { id: "ideal", icon: Landmark, name: "iDEAL", hint: "ING ···· 4418" },
  { id: "card", icon: CreditCard, name: "Card", hint: "Visa ···· 4812" },
  { id: "wallet", icon: Wallet, name: "Apple Pay", hint: "Face ID" },
];

export default function CheckoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState("ideal");
  const [email, setEmail] = useState("sanne@ziggner.com");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setPaying(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open ]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setStep(2);
    }, 1800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="animate-toast-in w-full max-w-[440px] overflow-hidden rounded-2xl bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-oat-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-ledger-brown">
              <svg width="15" height="15" viewBox="0 0 32 32" fill="none">
                <path d="M7 23V9l5 9.5L17 9l5 9.5L27 9v14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.25px]">Café Maan</p>
              <p className="media-label text-soft-gray">POWERED BY MOLLIE</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-oat-surface hover:bg-[#efe9e3]">
            <X size={17} />
          </button>
        </div>

        {step < 2 && (
          <div className="flex gap-1.5 px-6 pt-5">
            {[0, 1].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-ledger-brown" : "bg-oat-surface"}`} />
            ))}
          </div>
        )}

        {step === 0 && (
          <div className="px-6 py-5">
            <p className="media-label text-quiet-graphite">AMOUNT DUE</p>
            <p className="font-display mt-1 text-[44px] tracking-[-1.2px]">€24.50</p>
            <p className="mt-1 text-[13px] text-quiet-graphite">2× oat flat white · 1× cardamom bun · Order #4821</p>
            <p className="media-label mt-5 text-quiet-graphite">CHOOSE METHOD</p>
            <div className="mt-2.5 space-y-2">
              {METHODS.map((mm) => (
                <button
                  key={mm.id}
                  onClick={() => setMethod(mm.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    method === mm.id ? "border-ink bg-ink text-paper" : "border-oat-line hover:border-[#ddd5cc]"
                  }`}
                >
                  <mm.icon size={19} strokeWidth={1.8} />
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium tracking-[-0.25px]">{mm.name}</span>
                    <span className={`block text-[12px] ${method === mm.id ? "text-paper/60" : "text-quiet-graphite"}`}>{mm.hint}</span>
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${method === mm.id ? "border-paper bg-paper" : "border-[#ddd5cc]"}`}>
                    {method === mm.id && <Check size={12} strokeWidth={3} className="text-ink" />}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="btn-ledger mt-4 flex w-full items-center justify-center gap-2">
              Continue <ArrowRight size={16} />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-soft-gray">
              <Lock size={12} /> 3-D Secure · PSD2 compliant · No card stored
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="px-6 py-5">
            <button onClick={() => setStep(0)} className="flex items-center gap-1.5 text-[13px] font-medium text-quiet-graphite hover:text-ink">
              <ArrowLeft size={14} /> Back
            </button>
            <p className="media-label mt-4 text-quiet-graphite">CONFIRM & PAY</p>
            <div className="mt-2.5 rounded-2xl bg-oat-surface p-4">
              <div className="flex justify-between text-[14px]">
                <span className="text-quiet-graphite">Subtotal</span><span className="font-medium">€24.50</span>
              </div>
              <div className="mt-1.5 flex justify-between text-[14px]">
                <span className="text-quiet-graphite">Method</span><span className="font-medium">{METHODS.find((m) => m.id === method)?.name}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-[14px]">
                <span className="text-quiet-graphite">Fee to you</span><span className="font-medium text-active-green">€0.00</span>
              </div>
            </div>
            <label className="media-label mt-4 block text-quiet-graphite">RECEIPT EMAIL</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-2 w-full rounded-2xl border border-oat-line bg-paper px-4 py-3.5 text-[15px] tracking-[-0.2px] focus:border-ink focus:outline-none"
            />
            <button onClick={pay} disabled={paying} className="btn-ledger mt-4 flex w-full items-center justify-center gap-2 disabled:opacity-80">
              {paying ? (<><Loader2 size={17} className="animate-spin" /> Contacting bank…</>) : (<>Pay €24.50 <Lock size={14} /></>)}
            </button>
            <p className="media-label mt-3 text-center text-soft-gray">TEST MODE · NO REAL CHARGE</p>
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-active-green-surface">
              <Check size={28} strokeWidth={2.6} className="text-paper" />
            </span>
            <h3 className="font-display mt-5 text-[32px] tracking-[-0.8px]">Paid. Warm buns incoming.</h3>
            <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-quiet-graphite">
              €24.50 via {METHODS.find((m) => m.id === method)?.name}. Receipt sent to {email}. Payout lands tomorrow, 09:00.
            </p>
            <div className="mx-auto mt-5 flex max-w-[300px] items-center justify-between rounded-2xl bg-oat-surface px-4 py-3">
              <span className="media-label text-quiet-graphite">TRANSACTION</span>
              <span className="text-[13px] font-medium">tr_9KQ{Math.floor(Math.random() * 900 + 100)}x</span>
            </div>
            <button onClick={onClose} className="btn-ledger mt-5 w-full">Done</button>
            <button onClick={() => setStep(0)} className="mt-2 w-full rounded-full py-3 text-[14px] font-medium text-quiet-graphite hover:text-ink">
              Run it again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
