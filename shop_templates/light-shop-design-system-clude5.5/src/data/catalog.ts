export type CategoryId = 'women' | 'men' | 'beauty' | 'home' | 'baby' | 'accessories';

export interface Category {
  id: CategoryId;
  label: string;
  title: string;
  icon: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  category: CategoryId;
  type: string;
  image: number;
  dark?: boolean;
  sizes?: string[];
  tags?: string[];
}

export interface Brand {
  name: string;
  cover: string;
  rating: number;
  reviews: number;
}

export type View =
  | { kind: 'query'; q: string }
  | { kind: 'category'; id: CategoryId; type?: string }
  | { kind: 'brand'; name: string }
  | { kind: 'sale' };

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating';

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Pexels CDN image. With only a width the natural aspect ratio is kept and
 * CSS object-cover + object-position frames it; pass a height to hard-crop.
 */
export const px = (id: number, w = 600, h?: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}${
    h ? `&h=${h}&fit=crop` : ''
  }`;

export const money = (n: number) =>
  `$${
    Number.isInteger(n)
      ? n.toLocaleString('en-US')
      : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }`;

export const fmtCount = (n: number) => {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
};

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIES: Category[] = [
  { id: 'women', label: 'Women', title: 'Women', icon: 8070398 },
  { id: 'men', label: 'Men', title: 'Men', icon: 26936523 },
  { id: 'beauty', label: 'Beauty', title: 'Beauty', icon: 8100691 },
  { id: 'home', label: 'Home', title: 'Home', icon: 27180805 },
  { id: 'baby', label: 'Baby & toddler', title: 'Baby & toddler', icon: 4964355 },
  { id: 'accessories', label: 'Accessories', title: 'Tech & accessories', icon: 10557466 },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.title])) as Record<
  CategoryId,
  string
>;

const APPAREL = ['XS', 'S', 'M', 'L', 'XL'];
const SHOES = ['6', '7', '8', '9', '10', '11'];
const BABY = ['0–3M', '3–6M', '6–12M', '12–24M'];

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export const PRODUCTS: Product[] = [
  // Women
  { id: 'w1', name: 'Linen Wrap Set', brand: 'Maison Ocre', price: 148, compareAt: 185, rating: 4.8, reviews: 2140, category: 'women', type: 'Sets', image: 8070398, sizes: APPAREL, tags: ['linen', 'beige', 'neutral', 'outfit'] },
  { id: 'w2', name: 'Relaxed Utility Jumpsuit', brand: 'Ondine Studio', price: 129, rating: 4.7, reviews: 1830, category: 'women', type: 'Jumpsuits', image: 8217774, sizes: APPAREL, tags: ['beige', 'utility', 'outfit'] },
  { id: 'w3', name: 'Poplin Oversized Shirt', brand: 'Ondine Studio', price: 88, rating: 4.6, reviews: 960, category: 'women', type: 'Tops', image: 7624504, sizes: APPAREL, tags: ['white', 'cotton', 'shirt'] },
  { id: 'w4', name: 'Structured Leather Tote', brand: 'Sable Row', price: 265, rating: 4.9, reviews: 3210, category: 'women', type: 'Bags', image: 10919291, tags: ['leather', 'brown', 'handbag', 'tote'] },
  { id: 'w5', name: 'Croc-Embossed Mini Bag', brand: 'Sable Row', price: 189, rating: 4.8, reviews: 1475, category: 'women', type: 'Bags', image: 22434762, tags: ['leather', 'handbag', 'croc'] },
  { id: 'w6', name: 'Two-Tone Shoulder Bag', brand: 'Sable Row', price: 210, compareAt: 240, rating: 4.7, reviews: 890, category: 'women', type: 'Bags', image: 36367484, tags: ['leather', 'handbag'] },
  { id: 'w7', name: 'Pavé Pendant Necklace', brand: 'Aurum & Ash', price: 96, rating: 4.9, reviews: 5120, category: 'women', type: 'Jewelry', image: 27357178, tags: ['gold', 'necklace', 'jewelry'] },
  { id: 'w8', name: 'Sculpted Hoop Earrings', brand: 'Aurum & Ash', price: 72, rating: 4.8, reviews: 2760, category: 'women', type: 'Jewelry', image: 15785497, tags: ['gold', 'earrings', 'hoops', 'jewelry'] },
  { id: 'w9', name: 'Woven Gold Cuff', brand: 'Aurum & Ash', price: 84, compareAt: 105, rating: 4.7, reviews: 1320, category: 'women', type: 'Jewelry', image: 7248769, tags: ['gold', 'bracelet', 'jewelry'] },
  { id: 'w10', name: 'Lilac Court Sneaker', brand: 'Ondine Studio', price: 135, rating: 4.6, reviews: 740, category: 'women', type: 'Shoes', image: 27113473, sizes: SHOES, tags: ['sneakers', 'purple', 'lilac'] },
  { id: 'w11', name: 'Tailored Studio Set', brand: 'Maison Ocre', price: 198, rating: 4.8, reviews: 610, category: 'women', type: 'Sets', image: 19222080, sizes: APPAREL, tags: ['tailored', 'outfit'] },
  { id: 'w12', name: 'Fluid Knit Dress', brand: 'Maison Ocre', price: 156, rating: 4.7, reviews: 1080, category: 'women', type: 'Dresses', image: 11928214, sizes: APPAREL, tags: ['dress', 'knit'] },

  // Men
  { id: 'm1', name: 'Cotton Field Jacket', brand: 'Northfold', price: 168, rating: 4.8, reviews: 2380, category: 'men', type: 'Jackets', image: 26936523, sizes: APPAREL, tags: ['beige', 'jacket', 'cotton'] },
  { id: 'm2', name: 'Recycled Puffer Jacket', brand: 'Northfold', price: 220, compareAt: 260, rating: 4.9, reviews: 4110, category: 'men', type: 'Outerwear', image: 26936522, sizes: APPAREL, tags: ['puffer', 'jacket', 'winter'] },
  { id: 'm3', name: 'Merino Crew Sweater', brand: 'Kestrel Goods', price: 118, rating: 4.7, reviews: 1690, category: 'men', type: 'Knitwear', image: 6211655, sizes: APPAREL, tags: ['merino', 'wool', 'sweater'] },
  { id: 'm4', name: 'Washed Suede Jacket', brand: 'Harbor Supply Co.', price: 245, rating: 4.8, reviews: 920, category: 'men', type: 'Jackets', image: 3724367, sizes: APPAREL, tags: ['suede', 'brown', 'jacket'] },
  { id: 'm5', name: 'Track Zip Jacket', brand: 'Kestrel Goods', price: 98, rating: 4.6, reviews: 1240, category: 'men', type: 'Activewear', image: 9604303, sizes: APPAREL, tags: ['green', 'track', 'zip', 'jacket'] },
  { id: 'm6', name: 'Moto Leather Jacket', brand: 'Harbor Supply Co.', price: 320, rating: 4.9, reviews: 2050, category: 'men', type: 'Outerwear', image: 23910818, sizes: APPAREL, tags: ['leather', 'black', 'jacket'] },
  { id: 'm7', name: 'Weekend Essentials Kit', brand: 'Northfold', price: 140, rating: 4.7, reviews: 530, category: 'men', type: 'Accessories', image: 18533675, tags: ['kit', 'essentials', 'gift'] },
  { id: 'm8', name: 'Garden Linen Suit', brand: 'Harbor Supply Co.', price: 295, rating: 4.8, reviews: 410, category: 'men', type: 'Suits', image: 18031037, sizes: APPAREL, tags: ['linen', 'suit'] },
  { id: 'm9', name: 'Sunset Court Runner', brand: 'Kestrel Goods', price: 125, rating: 4.7, reviews: 2890, category: 'men', type: 'Sneakers', image: 19882430, sizes: SHOES, tags: ['sneakers', 'shoes', 'runner'] },

  // Beauty
  { id: 'b1', name: 'Daily Barrier Serum', brand: 'Dew Theory', price: 42, rating: 4.9, reviews: 8740, category: 'beauty', type: 'Skincare', image: 8100691, tags: ['serum', 'skincare', 'glass'] },
  { id: 'b2', name: 'Cloud Body Lotion', brand: 'Olea Botanics', price: 28, rating: 4.8, reviews: 3260, category: 'beauty', type: 'Body', image: 7814991, tags: ['lotion', 'body', 'moisturizer'] },
  { id: 'b3', name: 'Gel Cleanser Duo', brand: 'Saltwell', price: 34, compareAt: 44, rating: 4.7, reviews: 2120, category: 'beauty', type: 'Skincare', image: 8049849, tags: ['cleanser', 'skincare'] },
  { id: 'b4', name: 'Eau de Parfum No. 4', brand: 'Bare Ritual', price: 86, rating: 4.8, reviews: 1980, category: 'beauty', type: 'Fragrance', image: 15096784, tags: ['perfume', 'fragrance', 'scent'] },
  { id: 'b5', name: 'Night Ritual Set', brand: 'Bare Ritual', price: 120, rating: 4.9, reviews: 1460, category: 'beauty', type: 'Sets', image: 16372665, dark: true, tags: ['gift', 'set', 'night', 'skincare'] },
  { id: 'b6', name: 'Refillable Shelf Set', brand: 'Olea Botanics', price: 64, rating: 4.7, reviews: 870, category: 'beauty', type: 'Bath', image: 4202321, tags: ['bath', 'refill', 'shampoo'] },
  { id: 'b7', name: 'Hydra Squeeze Tubes', brand: 'Saltwell', price: 24, rating: 4.6, reviews: 1540, category: 'beauty', type: 'Body', image: 8049841, tags: ['tube', 'body'] },
  { id: 'b8', name: 'Mineral Hand Cream', brand: 'Dew Theory', price: 18, rating: 4.8, reviews: 4320, category: 'beauty', type: 'Body', image: 9775406, tags: ['hand cream', 'cream'] },
  { id: 'b9', name: 'Apothecary Oil Trio', brand: 'Bare Ritual', price: 58, rating: 4.7, reviews: 690, category: 'beauty', type: 'Bath', image: 6915111, dark: true, tags: ['oil', 'bath'] },
  { id: 'b10', name: 'Vanity Essentials', brand: 'Dew Theory', price: 76, compareAt: 96, rating: 4.8, reviews: 1120, category: 'beauty', type: 'Sets', image: 4207891, tags: ['set', 'vanity', 'skincare'] },

  // Home
  { id: 'h1', name: 'Stoneware Bud Vases, Set of 3', brand: 'Terra & Kiln', price: 78, rating: 4.9, reviews: 2640, category: 'home', type: 'Vases', image: 27180805, tags: ['ceramic', 'vase', 'stoneware'] },
  { id: 'h2', name: 'Matte Bottle Vase', brand: 'Terra & Kiln', price: 46, rating: 4.8, reviews: 1370, category: 'home', type: 'Vases', image: 6770266, tags: ['ceramic', 'vase', 'white'] },
  { id: 'h3', name: 'Sculpted Ceramic Vessel', brand: 'Clay Room', price: 92, rating: 4.7, reviews: 540, category: 'home', type: 'Decor', image: 33105316, tags: ['ceramic', 'vessel', 'sculpture'] },
  { id: 'h4', name: 'Amber Soy Candle, Lavender', brand: 'Hearth Hour', price: 32, rating: 4.9, reviews: 6890, category: 'home', type: 'Candles', image: 7004671, tags: ['candle', 'lavender', 'soy'] },
  { id: 'h5', name: 'Tin Travel Candle', brand: 'Hearth Hour', price: 22, rating: 4.8, reviews: 3010, category: 'home', type: 'Candles', image: 7005935, tags: ['candle', 'travel'] },
  { id: 'h6', name: 'Cedar Wood-Wick Candle', brand: 'Hearth Hour', price: 38, compareAt: 46, rating: 4.8, reviews: 2210, category: 'home', type: 'Candles', image: 7473307, dark: true, tags: ['candle', 'cedar'] },
  { id: 'h7', name: 'Stonewashed Linen Duvet Set', brand: 'Linen Lane', price: 240, rating: 4.9, reviews: 4780, category: 'home', type: 'Bedding', image: 27439405, sizes: ['Twin', 'Full', 'Queen', 'King'], tags: ['linen', 'bedding', 'duvet'] },
  { id: 'h8', name: 'Velvet Cushion Pair', brand: 'Linen Lane', price: 68, rating: 4.7, reviews: 1290, category: 'home', type: 'Bedding', image: 4271665, tags: ['cushion', 'pillow', 'velvet'] },
  { id: 'h9', name: 'Rattan Bedside Lamp', brand: 'Moss House', price: 112, rating: 4.8, reviews: 860, category: 'home', type: 'Lighting', image: 34980863, tags: ['lamp', 'rattan', 'lighting'] },
  { id: 'h10', name: 'Ochre Vase Pair', brand: 'Terra & Kiln', price: 64, rating: 4.6, reviews: 450, category: 'home', type: 'Vases', image: 8767270, tags: ['vase', 'yellow', 'ceramic'] },

  // Baby & toddler
  { id: 'k1', name: 'Rainbow Wooden Blocks', brand: 'Little Acorn', price: 38, rating: 4.9, reviews: 3920, category: 'baby', type: 'Toys', image: 4964355, tags: ['wooden', 'blocks', 'toys'] },
  { id: 'k2', name: 'Knit Cotton Romper', brand: 'Nestling', price: 44, rating: 4.8, reviews: 1760, category: 'baby', type: 'Clothing', image: 28259754, sizes: BABY, tags: ['knit', 'romper', 'onesie'] },
  { id: 'k3', name: 'Bear Bedtime Gift Set', brand: 'Pip & Pine', price: 52, rating: 4.9, reviews: 1180, category: 'baby', type: 'Gifts', image: 32452348, tags: ['gift', 'bear', 'socks'] },
  { id: 'k4', name: 'Montessori Activity Set', brand: 'Little Acorn', price: 64, rating: 4.8, reviews: 2240, category: 'baby', type: 'Toys', image: 6692935, tags: ['wooden', 'montessori', 'toys'] },
  { id: 'k5', name: 'First Shapes Puzzle', brand: 'Little Acorn', price: 26, rating: 4.7, reviews: 1610, category: 'baby', type: 'Toys', image: 7491112, tags: ['puzzle', 'wooden', 'toys'] },
  { id: 'k6', name: 'Squeaky Bath Duck', brand: 'Pip & Pine', price: 14, rating: 4.6, reviews: 980, category: 'baby', type: 'Toys', image: 31137011, tags: ['duck', 'bath', 'toys'] },
  { id: 'k7', name: 'First Balance Trike', brand: 'Nestling', price: 129, compareAt: 149, rating: 4.8, reviews: 720, category: 'baby', type: 'Ride-ons', image: 32736255, tags: ['trike', 'tricycle', 'ride'] },
  { id: 'k8', name: 'Tulle Party Dress & Shoes', brand: 'Nestling', price: 58, rating: 4.7, reviews: 530, category: 'baby', type: 'Clothing', image: 30791355, sizes: BABY, tags: ['dress', 'pink', 'party'] },

  // Tech & accessories
  { id: 'a1', name: 'Studio Wireless Earbuds', brand: 'Ostra Audio', price: 149, rating: 4.8, reviews: 5630, category: 'accessories', type: 'Audio', image: 8380417, tags: ['earbuds', 'wireless', 'headphones', 'tech'] },
  { id: 'a2', name: 'Over-Ear ANC Headphones', brand: 'Ostra Audio', price: 279, compareAt: 329, rating: 4.9, reviews: 3870, category: 'accessories', type: 'Audio', image: 3721941, dark: true, tags: ['headphones', 'noise cancelling', 'tech'] },
  { id: 'a3', name: 'Gilded Day Watch', brand: 'Lumen Time', price: 185, rating: 4.8, reviews: 1940, category: 'accessories', type: 'Watches', image: 10557466, tags: ['watch', 'gold'] },
  { id: 'a4', name: 'Tortoise Sunglasses', brand: 'Solace Eyewear', price: 110, rating: 4.7, reviews: 1230, category: 'accessories', type: 'Sunglasses', image: 33471459, tags: ['sunglasses', 'eyewear'] },
  { id: 'a5', name: 'Monochrome Headphones', brand: 'Ostra Audio', price: 199, rating: 4.7, reviews: 1460, category: 'accessories', type: 'Audio', image: 15487609, dark: true, tags: ['headphones', 'tech'] },
  { id: 'a6', name: 'Everyday Watch & Case Set', brand: 'Lumen Time', price: 145, rating: 4.6, reviews: 610, category: 'accessories', type: 'Watches', image: 33482422, tags: ['watch', 'set'] },
  { id: 'a7', name: 'Mocha Top-Handle Bag', brand: 'Sable Row', price: 230, rating: 4.8, reviews: 1050, category: 'accessories', type: 'Bags', image: 27174573, tags: ['bag', 'leather', 'handbag'] },
  { id: 'a8', name: 'Saddle Bag & Belt', brand: 'Sable Row', price: 195, rating: 4.7, reviews: 760, category: 'accessories', type: 'Bags', image: 27127406, tags: ['bag', 'belt', 'leather'] },
];

/* ------------------------------------------------------------------ */
/* Brands                                                              */
/* ------------------------------------------------------------------ */

export const BRANDS: Brand[] = [
  { name: 'Sable Row', cover: 'w5', rating: 4.8, reviews: 18400 },
  { name: 'Hearth Hour', cover: 'h4', rating: 4.9, reviews: 32600 },
  { name: 'Northfold', cover: 'm2', rating: 4.8, reviews: 12100 },
  { name: 'Dew Theory', cover: 'b1', rating: 4.9, reviews: 41200 },
  { name: 'Terra & Kiln', cover: 'h1', rating: 4.8, reviews: 9800 },
  { name: 'Aurum & Ash', cover: 'w7', rating: 4.9, reviews: 22700 },
  { name: 'Little Acorn', cover: 'k1', rating: 4.9, reviews: 15300 },
  { name: 'Ostra Audio', cover: 'a1', rating: 4.8, reviews: 27500 },
  { name: 'Bare Ritual', cover: 'b4', rating: 4.8, reviews: 8600 },
  { name: 'Linen Lane', cover: 'h7', rating: 4.9, reviews: 19900 },
];

/* ------------------------------------------------------------------ */
/* Derived collections                                                 */
/* ------------------------------------------------------------------ */

export const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const BRAND_PRODUCTS: Record<string, Product[]> = PRODUCTS.reduce<Record<string, Product[]>>(
  (acc, p) => {
    if (!acc[p.brand]) acc[p.brand] = [];
    acc[p.brand].push(p);
    return acc;
  },
  {},
);

export const BRAND_NAMES = Object.keys(BRAND_PRODUCTS);

export const TRENDING: Product[] = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 12);

/** Round-robin across categories so the feed feels browsable, not catalog-like. */
export const MIXED: Product[] = (() => {
  const groups = CATEGORIES.map((c) => PRODUCTS.filter((p) => p.category === c.id));
  const longest = Math.max(...groups.map((g) => g.length));
  const out: Product[] = [];
  for (let i = 0; i < longest; i++) {
    for (const g of groups) if (g[i]) out.push(g[i]);
  }
  return out;
})();

export const POPULAR_SEARCHES = ['linen', 'candles', 'gold jewelry', 'sneakers', 'serum', 'headphones', 'wooden toys', 'vases'];

const COPY: Record<CategoryId, string> = {
  women:
    'Cut from considered, breathable fabrics in an easy silhouette that layers through every season. Designed in small batches and finished by hand.',
  men: 'Built from durable, responsibly sourced materials with a relaxed, modern fit. Made to be worn hard and loved for years.',
  beauty:
    'Clean, dermatologist-tested formulas with skin-loving botanicals. Free from parabens, sulfates, and synthetic fragrance.',
  home: 'A thoughtfully made object that brings warmth and calm to everyday rituals. Crafted in a small studio from natural materials.',
  baby: 'Gentle, non-toxic materials and timeless design — independently safety tested and made to be passed down.',
  accessories:
    'An everyday essential refined down to the details, with premium materials and a two-year warranty from the maker.',
};

export const describe = (p: Product) => COPY[p.category];

/** Focal point for object-position — apparel portraits bias toward the top so faces/torsos stay in frame. */
const NON_APPAREL = new Set(['Bags', 'Jewelry', 'Shoes', 'Sneakers', 'Accessories']);
export const focusOf = (p: Product) =>
  (p.category === 'women' || p.category === 'men') && !NON_APPAREL.has(p.type) ? 'center 20%' : 'center';

/* ------------------------------------------------------------------ */
/* Search, filter, sort                                                */
/* ------------------------------------------------------------------ */

const variants = (t: string) => {
  const out = [t];
  if (t.length > 3) {
    if (t.endsWith('ies')) out.push(`${t.slice(0, -3)}y`);
    if (t.endsWith('es')) out.push(t.slice(0, -2));
    if (t.endsWith('s')) out.push(t.slice(0, -1));
  }
  return out;
};

export function searchProducts(query: string): Product[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { p: Product; score: number }[] = [];
  for (const p of PRODUCTS) {
    const name = p.name.toLowerCase();
    const brand = p.brand.toLowerCase();
    const type = p.type.toLowerCase();
    const hay = `${name} ${brand} ${type} ${CATEGORY_LABEL[p.category].toLowerCase()} ${(p.tags ?? []).join(' ')}`;
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const forms = variants(term);
      if (!forms.some((f) => hay.includes(f))) {
        ok = false;
        break;
      }
      if (forms.some((f) => name.includes(f))) score += 3;
      if (forms.some((f) => brand.includes(f))) score += 2;
      if (forms.some((f) => type.includes(f))) score += 2;
      score += 1;
    }
    if (ok) scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score || b.p.reviews - a.p.reviews).map((s) => s.p);
}

export function matchBrands(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return BRAND_NAMES.filter((b) => b.toLowerCase().includes(q));
}

export function filterView(view: View): Product[] {
  switch (view.kind) {
    case 'query':
      return searchProducts(view.q);
    case 'category':
      return PRODUCTS.filter((p) => p.category === view.id && (!view.type || p.type === view.type));
    case 'brand':
      return PRODUCTS.filter((p) => p.brand === view.name);
    case 'sale':
      return PRODUCTS.filter((p) => p.compareAt !== undefined);
    default:
      return [];
  }
}

export function sortProducts(list: Product[], key: SortKey): Product[] {
  const copy = [...list];
  switch (key) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    default:
      return copy;
  }
}

export function viewTitle(view: View): string {
  switch (view.kind) {
    case 'query':
      return `Results for “${view.q}”`;
    case 'category':
      return view.type ? `${CATEGORY_LABEL[view.id]} · ${view.type}` : CATEGORY_LABEL[view.id];
    case 'brand':
      return view.name;
    case 'sale':
      return 'On sale';
    default:
      return '';
  }
}

export function brandStats(name: string) {
  const known = BRANDS.find((b) => b.name === name);
  if (known) return { rating: known.rating, reviews: known.reviews };
  const list = BRAND_PRODUCTS[name] ?? [];
  const reviews = list.reduce((s, p) => s + p.reviews, 0);
  const weighted = list.reduce((s, p) => s + p.rating * p.reviews, 0);
  return { rating: reviews ? Math.round((weighted / reviews) * 10) / 10 : 0, reviews };
}
