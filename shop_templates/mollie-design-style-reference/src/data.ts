export const IMAGES = {
  heroTerminal:
    "https://images.pexels.com/photos/6684796/pexels-photo-6684796.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  heroRetail:
    "https://images.pexels.com/photos/5239822/pexels-photo-5239822.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  heroCounter:
    "https://images.pexels.com/photos/3907161/pexels-photo-3907161.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  heroPhone:
    "https://images.pexels.com/photos/4199526/pexels-photo-4199526.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  cafe: "https://images.pexels.com/photos/5812847/pexels-photo-5812847.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  boutique:
    "https://images.pexels.com/photos/5717846/pexels-photo-5717846.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  boutique2:
    "https://images.pexels.com/photos/6545444/pexels-photo-6545444.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  florist:
    "https://images.pexels.com/photos/5410081/pexels-photo-5410081.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pack:
    "https://images.pexels.com/photos/7857531/pexels-photo-7857531.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pack2:
    "https://images.pexels.com/photos/8939788/pexels-photo-8939788.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  online:
    "https://images.pexels.com/photos/15195243/pexels-photo-15195243.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  laptop:
    "https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  barista:
    "https://images.pexels.com/photos/19373865/pexels-photo-19373865.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  terminal:
    "https://images.pexels.com/photos/6023608/pexels-photo-6023608.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  paydesk:
    "https://images.pexels.com/photos/5239810/pexels-photo-5239810.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

export type TxStatus = "paid" | "pending" | "expired";

export interface Tx {
  id: string;
  customer: string;
  email: string;
  method: string;
  amount: number;
  currency: string;
  status: TxStatus;
  time: string;
}

export const INITIAL_TXS: Tx[] = [
  { id: "tr_9KQ21x", customer: "Atelier Nord", email: "shop@ateliernord.dk", method: "iDEAL", amount: 184.0, currency: "€", status: "paid", time: "09:41" },
  { id: "tr_9KQ20m", customer: "Café Maan", email: "hello@cafmaan.nl", method: "Apple Pay", amount: 24.5, currency: "€", status: "paid", time: "09:38" },
  { id: "tr_9KQ1zZ", customer: "Freddy's Supply", email: "ops@freddys.co", method: "Visa", amount: 412.9, currency: "€", status: "pending", time: "09:31" },
  { id: "tr_9KQ1yA", customer: "Bloom & Stem", email: "orders@bloomstem.be", method: "Bancontact", amount: 68.2, currency: "€", status: "paid", time: "09:24" },
  { id: "tr_9KQ1wQ", customer: "Harbor Books", email: "till@harborbooks.uk", method: "Mastercard", amount: 96.0, currency: "£", status: "expired", time: "09:12" },
  { id: "tr_9KQ1vE", customer: "LOOM Studio", email: "billing@loom.studio", method: "Klarna", amount: 289.0, currency: "€", status: "paid", time: "09:02" },
];

export const LIVE_FEED_POOL = [
  { customer: "Juniper Coffee", method: "Apple Pay", amount: 12.8 },
  { customer: "Studio Maren", method: "iDEAL", amount: 149.0 },
  { customer: "De Kas Winkel", method: "Visa", amount: 64.4 },
  { customer: "Paper Trails", method: "Klarna", amount: 210.0 },
  { customer: "Nordwind Bikes", method: "SEPA", amount: 899.0 },
  { customer: "Maison Fleur", method: "Bancontact", amount: 88.5 },
  { customer: "Kiosk Centraal", method: "Mastercard", amount: 18.2 },
  { customer: "Aesop & Co.", method: "PayPal", amount: 132.75 },
];

export const STORIES = [
  {
    brand: "CAFÉ MAAN",
    quote: "We switched terminals on a Tuesday. By Friday the queue moved twice as fast — regulars noticed before we did.",
    name: "Sanne Verhoeven, Owner",
    image:
      "https://images.pexels.com/photos/5812847/pexels-photo-5812847.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    stat: "+38%",
    statLabel: "faster counter throughput",
  },
  {
    brand: "ATELIER NORD",
    quote: "Checkout used to be our leak. Now it just holds water — conversion is up and support tickets are down.",
    name: "Jonas Lindqvist, Founder",
    image:
      "https://images.pexels.com/photos/5717846/pexels-photo-5717846.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    stat: "+12.4%",
    statLabel: "checkout conversion",
  },
  {
    brand: "BLOOM & STEM",
    quote: "Mother's Day used to terrify me. Last year we took 900 orders in a day and every payout landed on time.",
    name: "Amara Diallo, Florist",
    image:
      "https://images.pexels.com/photos/5410081/pexels-photo-5410081.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    stat: "900",
    statLabel: "orders in one day",
  },
  {
    brand: "HARBOUR BOOKS",
    quote: "One dashboard for the shop, the site, and the market stall. My accountant finally smiles at me.",
    name: "Tom Ellis, Bookseller",
    image:
      "https://images.pexels.com/photos/6545444/pexels-photo-6545444.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    stat: "3×",
    statLabel: "channels, one ledger",
  },
  {
    brand: "LOOM STUDIO",
    quote: "Subscriptions, deposits, payment links — it's the quiet back office we never had to hire.",
    name: "Maren Kooij, Director",
    image:
      "https://images.pexels.com/photos/7857531/pexels-photo-7857531.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    stat: "−71%",
    statLabel: "manual invoicing",
  },
];

export const FAQS = [
  {
    q: "How fast can I actually go live?",
    a: "Most businesses accept their first payment the same day. Create an account, verify your identity, and plug in checkout — no lengthy underwriting, no setup fee, no hardware lock-in.",
  },
  {
    q: "What does Mollie-style pricing look like?",
    a: "Pay per successful transaction, nothing else. iDEAL from €0.29, cards from 1.5% + €0.25, Klarna from 2.99% + €0.25. Payouts, reporting, and support are included.",
  },
  {
    q: "Can I sell in-store and online with one account?",
    a: "Yes. Terminals, checkout, payment links, and QR all settle into the same balance. Refunds, disputes, and payouts are reconciled automatically across channels.",
  },
  {
    q: "Do you support subscriptions and invoices?",
    a: "Built in. Create recurring plans, send branded payment links, and let dunning handle retries. SEPA Direct Debit and card-on-file are supported across the EU.",
  },
  {
    q: "How do payouts work?",
    a: "Funds settle daily to your bank account. Standard payout is next business day in the EU; instant payout is available for eligible volumes. Every cent is traceable to its order.",
  },
  {
    q: "Is migrating from my current provider painful?",
    a: "No. Import customers and mandates, keep your checkout design, and run both providers in parallel until you're confident. Most migrations finish in under a week.",
  },
];
