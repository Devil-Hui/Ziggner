import { useMemo, useRef, useState, type FormEvent } from "react";

type IconName =
  | "arrow"
  | "baby"
  | "bag"
  | "chevron"
  | "close"
  | "grid"
  | "heart"
  | "home"
  | "search"
  | "shirt"
  | "sparkle"
  | "star"
  | "user";

type Tile = {
  id: string;
  title: string;
  image: string;
  alt: string;
  keywords: string;
  position?: string;
};

type Category = {
  id: string;
  title: string;
  description: string;
  feature: Tile;
  tiles: Tile[];
};

type SearchTile = Tile & { category: string };

const photo = (id: string, extension = "jpeg") =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${extension}?auto=compress&cs=tinysrgb&w=1200`;

const categories: Category[] = [
  {
    id: "women",
    title: "Women",
    description: "Easy layers, great denim, and pieces made to feel like you.",
    feature: {
      id: "women-feature",
      title: "Light layers",
      image: photo("7682078"),
      alt: "Woman wearing a neutral trench coat in a modern architectural setting",
      keywords: "clothing fashion coats spring jackets",
      position: "50% 34%",
    },
    tiles: [
      {
        id: "women-dresses",
        title: "Everyday dresses",
        image: photo("8272074"),
        alt: "A woman in a polished outfit standing beside a modern building",
        keywords: "clothing fashion dresses spring",
        position: "50% 30%",
      },
      {
        id: "women-bags",
        title: "Bags & totes",
        image: photo("12877069"),
        alt: "A woman showing a structured brown leather bag",
        keywords: "handbags accessories leather",
        position: "56% 48%",
      },
      {
        id: "women-shoes",
        title: "Shoes to go",
        image: photo("30725738", "png"),
        alt: "Brown leather ankle boots shown close up",
        keywords: "boots shoes footwear leather",
        position: "50% 50%",
      },
      {
        id: "women-accessories",
        title: "Finishing touches",
        image: photo("29301758"),
        alt: "Fashion portrait with classic sunglasses",
        keywords: "sunglasses accessories eyewear",
        position: "50% 38%",
      },
    ],
  },
  {
    id: "men",
    title: "Men",
    description: "Considered staples and small upgrades for every day.",
    feature: {
      id: "men-feature",
      title: "The good basics",
      image: photo("18031037"),
      alt: "Man in a relaxed linen suit photographed outdoors",
      keywords: "menswear linen clothing shirts jackets spring",
      position: "52% 28%",
    },
    tiles: [
      {
        id: "men-tailoring",
        title: "A softer suit",
        image: photo("4651334"),
        alt: "Two men wearing modern tailored suits",
        keywords: "menswear suits tailoring formal",
        position: "50% 35%",
      },
      {
        id: "men-layers",
        title: "Easy layers",
        image: photo("3095442"),
        alt: "Portrait of a man wearing a brown jacket",
        keywords: "menswear jackets clothing layers",
        position: "50% 28%",
      },
      {
        id: "men-streetwear",
        title: "Off-duty uniform",
        image: photo("29197620"),
        alt: "Contemporary streetwear portrait in a studio",
        keywords: "menswear streetwear casual clothing",
        position: "50% 36%",
      },
      {
        id: "men-sneakers",
        title: "Sneaker rotation",
        image: photo("27988921"),
        alt: "Black sneakers styled with flowers",
        keywords: "menswear sneakers shoes footwear",
        position: "50% 50%",
      },
    ],
  },
  {
    id: "beauty",
    title: "Beauty",
    description: "A better morning routine starts with the little things.",
    feature: {
      id: "beauty-feature",
      title: "Skin, meet glow",
      image: photo("31251024"),
      alt: "A collection of colorful skincare dropper bottles on a bright backdrop",
      keywords: "beauty skincare serum face care",
      position: "50% 50%",
    },
    tiles: [
      {
        id: "beauty-body",
        title: "Body care",
        image: photo("4832435"),
        alt: "A pink skincare bottle on a marble surface",
        keywords: "beauty skincare lotion body care",
        position: "50% 50%",
      },
      {
        id: "beauty-honey",
        title: "Natural formulas",
        image: photo("16329382"),
        alt: "Honey-based face cleanser with a wooden honey dipper",
        keywords: "beauty face wash cleanser natural skincare",
        position: "50% 50%",
      },
      {
        id: "beauty-serums",
        title: "Serums & drops",
        image: photo("20382236"),
        alt: "A skincare serum and toner arranged on a white background",
        keywords: "beauty skincare serum toner",
        position: "50% 50%",
      },
      {
        id: "beauty-herbal",
        title: "A little reset",
        image: photo("18066458"),
        alt: "Herbal beauty products styled with fresh limes",
        keywords: "beauty hair care herbal shampoo wellness",
        position: "50% 50%",
      },
    ],
  },
  {
    id: "home",
    title: "Home",
    description: "Small comforts and thoughtful details for your space.",
    feature: {
      id: "home-feature",
      title: "A softer landing",
      image: photo("14063721"),
      alt: "A sunlit minimalist bedroom with neutral bedding and soft lighting",
      keywords: "home bedroom bedding linens interior",
      position: "50% 55%",
    },
    tiles: [
      {
        id: "home-vases",
        title: "Ceramics & vases",
        image: photo("6952331"),
        alt: "Minimal ceramic vases arranged on a white surface",
        keywords: "home ceramics vases decor",
        position: "50% 50%",
      },
      {
        id: "home-decor",
        title: "Objects with feeling",
        image: photo("6805522"),
        alt: "A curated group of neutral ceramic vases",
        keywords: "home decor ceramics vases objects",
        position: "50% 50%",
      },
      {
        id: "home-living",
        title: "Living, gently",
        image: photo("7602594"),
        alt: "A minimalist beige sofa with a flower in a white vase",
        keywords: "home living room couch furniture flowers",
        position: "50% 46%",
      },
      {
        id: "home-sofa",
        title: "Room to unwind",
        image: photo("8580720"),
        alt: "A calm living room with a white sofa and minimal decor",
        keywords: "home furniture sofa living room",
        position: "50% 48%",
      },
    ],
  },
  {
    id: "baby",
    title: "Baby & Toddler",
    description: "Soft little essentials for their very big firsts.",
    feature: {
      id: "baby-feature",
      title: "Little days, big memories",
      image: photo("27816523"),
      alt: "A toddler sitting on the grass on a sunny day",
      keywords: "baby toddler kids clothing children",
      position: "50% 44%",
    },
    tiles: [
      {
        id: "baby-outfits",
        title: "Tiny outfits",
        image: photo("26593568"),
        alt: "A young child in a sun hat and blue dress outdoors",
        keywords: "baby toddler kids clothing dresses",
        position: "50% 38%",
      },
      {
        id: "baby-play",
        title: "Made for play",
        image: photo("32504640"),
        alt: "A child with curly hair enjoying a bright day outside",
        keywords: "baby toddler kids play children",
        position: "50% 34%",
      },
      {
        id: "baby-everyday",
        title: "Everyday pieces",
        image: photo("25534032"),
        alt: "A child wearing a neutral jumpsuit and sunglasses",
        keywords: "baby toddler kids clothing outfits",
        position: "50% 40%",
      },
      {
        id: "baby-occasion",
        title: "A little occasion",
        image: photo("29650590"),
        alt: "A child in a red dress by the seaside at twilight",
        keywords: "baby toddler kids occasion clothes dresses",
        position: "50% 45%",
      },
    ],
  },
];

const heroBrands = [
  {
    name: "STUDIO WEST",
    rating: "4.9",
    reviews: "214",
    category: "Women",
    image: photo("10211651"),
    alt: "Minimal fashion portrait of two women wearing white",
    position: "50% 28%",
    className: "spotlight-left",
  },
  {
    name: "LUNE & LEAF",
    rating: "4.8",
    reviews: "386",
    category: "Beauty",
    image: photo("4832435"),
    alt: "A softly lit pink skincare bottle on marble",
    position: "50% 50%",
    className: "spotlight-center",
  },
  {
    name: "SUNDAY OBJECTS",
    rating: "4.9",
    reviews: "892",
    category: "Home",
    image: photo("6805522"),
    alt: "Neutral ceramic vases in a warm minimalist setting",
    position: "50% 50%",
    className: "spotlight-right",
  },
];

const categoryPills: { label: string; icon: IconName }[] = [
  { label: "For you", icon: "grid" },
  { label: "Women", icon: "shirt" },
  { label: "Men", icon: "user" },
  { label: "Beauty", icon: "sparkle" },
  { label: "Home", icon: "home" },
  { label: "Baby & Toddler", icon: "baby" },
];

function Icon({
  name,
  size = 20,
  filled = false,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
}) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "arrow":
      return (
        <svg {...shared}>
          <path d="M4.5 12h15" />
          <path d="m13 5.5 6.5 6.5-6.5 6.5" />
        </svg>
      );
    case "baby":
      return (
        <svg {...shared}>
          <path d="M7 9.5a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0z" />
          <path d="M9.3 12h.01M14.7 12h.01M9.5 15.5c1.5 1.2 3.5 1.2 5 0" />
          <path d="M9 6.5 7.5 5M15 6.5 16.5 5" />
        </svg>
      );
    case "bag":
      return (
        <svg {...shared}>
          <path d="M5 8h14l1 12H4L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...shared}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      );
    case "close":
      return (
        <svg {...shared}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "grid":
      return (
        <svg {...shared}>
          <rect x="4.5" y="4.5" width="6" height="6" rx="1.5" />
          <rect x="13.5" y="4.5" width="6" height="6" rx="1.5" />
          <rect x="4.5" y="13.5" width="6" height="6" rx="1.5" />
          <rect x="13.5" y="13.5" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "heart":
      return (
        <svg
          {...shared}
          fill={filled ? "currentColor" : "none"}
          strokeWidth={filled ? 1.3 : 1.7}
        >
          <path d="M20.4 8.8c0 4.1-8.4 9.4-8.4 9.4S3.6 12.9 3.6 8.8a4.3 4.3 0 0 1 8.4-1.2 4.3 4.3 0 0 1 8.4 1.2Z" />
        </svg>
      );
    case "home":
      return (
        <svg {...shared}>
          <path d="m3.5 10 8.5-6.5 8.5 6.5" />
          <path d="M5.5 9v10.5h13V9M9.5 19.5v-6h5v6" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
      );
    case "shirt":
      return (
        <svg {...shared}>
          <path d="m8.5 4 2-1h3l2 1 4 2.5-2.2 4-2.2-1.2V20H8.9V9.3L6.7 10.5l-2.2-4L8.5 4Z" />
          <path d="M10.5 3c0 1.3.7 2 1.5 2s1.5-.7 1.5-2" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...shared}>
          <path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
        </svg>
      );
    case "star":
      return (
        <svg
          {...shared}
          fill="currentColor"
          strokeWidth={filled ? 0 : 1.2}
          viewBox="0 0 20 20"
        >
          <path d="m10 1.8 2.45 5.05 5.57.8-4.03 3.93.95 5.55L10 14.5l-4.98 2.63.95-5.55L1.94 7.65l5.58-.8L10 1.8Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c.8-3.3 3.5-5 7.5-5s6.7 1.7 7.5 5" />
        </svg>
      );
  }
}

function SpotlightCard({
  brand,
  onClick,
}: {
  brand: (typeof heroBrands)[number];
  onClick: () => void;
}) {
  return (
    <button
      className={`spotlight-card ${brand.className}`}
      type="button"
      onClick={onClick}
      aria-label={`Explore ${brand.name}, rated ${brand.rating} out of 5`}
    >
      <img
        src={brand.image}
        alt={brand.alt}
        style={{ objectPosition: brand.position }}
        fetchPriority={brand.className === "spotlight-center" ? "high" : "auto"}
      />
      <span className="spotlight-brand">{brand.name}</span>
      <span className="spotlight-rating">
        <Icon name="star" size={10} filled />
        <span>{brand.rating}</span>
        <span className="rating-dot" aria-hidden="true" />
        <span>{brand.reviews} reviews</span>
      </span>
    </button>
  );
}

function ImageTile({
  tile,
  categoryTitle,
  saved,
  featured = false,
  onSave,
  onOpen,
}: {
  tile: Tile;
  categoryTitle: string;
  saved: boolean;
  featured?: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={`image-tile ${featured ? "image-tile-featured" : ""}`}>
      <img
        className="tile-image"
        src={tile.image}
        alt={tile.alt}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: tile.position }}
      />
      <button
        className="tile-open"
        type="button"
        onClick={onOpen}
        aria-label={`Explore ${tile.title} in ${categoryTitle}`}
      />
      {featured ? (
        <div className="feature-copy" aria-hidden="true">
          <span>{categoryTitle} edit</span>
          <strong>{tile.title}</strong>
          <span className="feature-explore">
            Explore the edit <Icon name="arrow" size={16} />
          </span>
        </div>
      ) : (
        <span className="tile-label" aria-hidden="true">
          {tile.title}
        </span>
      )}
      <button
        className={`tile-save ${saved ? "is-saved" : ""}`}
        type="button"
        onClick={onSave}
        aria-label={saved ? `Remove ${tile.title} from saved` : `Save ${tile.title}`}
        aria-pressed={saved}
      >
        <Icon name="heart" size={18} filled={saved} />
      </button>
    </article>
  );
}

function CategorySection({
  category,
  savedIds,
  onSave,
  onOpenTile,
  onExplore,
}: {
  category: Category;
  savedIds: string[];
  onSave: (id: string) => void;
  onOpenTile: (title: string) => void;
  onExplore: (title: string) => void;
}) {
  return (
    <section className="category-section" id={`category-${category.id}`}>
      <div className="section-heading-row">
        <div>
          <button
            className="section-heading"
            type="button"
            onClick={() => onExplore(category.title)}
          >
            <h2>{category.title}</h2>
            <Icon name="chevron" size={18} />
          </button>
          <p>{category.description}</p>
        </div>
        <button
          className="section-more"
          type="button"
          onClick={() => onExplore(category.title)}
        >
          See all <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="category-layout">
        <ImageTile
          tile={category.feature}
          categoryTitle={category.title}
          saved={savedIds.includes(category.feature.id)}
          featured
          onSave={() => onSave(category.feature.id)}
          onOpen={() => onOpenTile(category.feature.title)}
        />
        <div className="category-tile-grid">
          {category.tiles.map((tile) => (
            <ImageTile
              key={tile.id}
              tile={tile}
              categoryTitle={category.title}
              saved={savedIds.includes(tile.id)}
              onSave={() => onSave(tile.id)}
              onOpen={() => onOpenTile(tile.title)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultGrid({
  heading,
  subheading,
  emptyTitle,
  emptyBody,
  items,
  savedIds,
  onSave,
  onOpenTile,
}: {
  heading: string;
  subheading?: string;
  emptyTitle?: string;
  emptyBody?: string;
  items: SearchTile[];
  savedIds: string[];
  onSave: (id: string) => void;
  onOpenTile: (title: string) => void;
}) {
  return (
    <section className="results-section" aria-live="polite">
      <div className="section-heading-row">
        <div>
          <div className="results-heading-line">
            <h2>{heading}</h2>
            <span>{items.length}</span>
          </div>
          {subheading && <p>{subheading}</p>}
        </div>
      </div>
      {items.length ? (
        <div className="results-grid">
          {items.map((tile) => (
            <div className="result-item" key={tile.id}>
              <ImageTile
                tile={tile}
                categoryTitle={tile.category}
                saved={savedIds.includes(tile.id)}
                onSave={() => onSave(tile.id)}
                onOpen={() => onOpenTile(tile.title)}
              />
              <span className="result-category">{tile.category}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="heart" size={24} />
          </span>
          <h3>{emptyTitle ?? "Your next favorite is waiting."}</h3>
          <p>{emptyBody ?? "Tap the heart on anything you like and it will be kept here."}</p>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("For you");
  const [activeNav, setActiveNav] = useState<"discover" | "saved">("discover");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const allTiles = useMemo<SearchTile[]>(
    () =>
      categories.flatMap((category) =>
        [category.feature, ...category.tiles].map((tile) => ({
          ...tile,
          category: category.title,
        })),
      ),
    [],
  );

  const searchResults = useMemo(() => {
    const needle = submittedQuery.trim().toLowerCase();
    if (!needle) return [];
    return allTiles.filter((tile) =>
      `${tile.title} ${tile.category} ${tile.keywords}`.toLowerCase().includes(needle),
    );
  }, [allTiles, submittedQuery]);

  const savedTiles = useMemo(
    () => allTiles.filter((tile) => savedIds.includes(tile.id)),
    [allTiles, savedIds],
  );

  const visibleCategories =
    activeCategory === "For you"
      ? categories
      : categories.filter((category) => category.title === activeCategory);

  const goToCategory = (title: string) => {
    setActiveNav("discover");
    setSubmittedQuery("");
    setQuery("");
    setActiveCategory(title);
    const category = categories.find((item) => item.title === title);
    if (category) {
      window.requestAnimationFrame(() => {
        document.getElementById(`category-${category.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToDiscover = () => {
    setActiveNav("discover");
    setActiveCategory("For you");
    setQuery("");
    setSubmittedQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const focusSearch = () => {
    setActiveNav("discover");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => searchRef.current?.focus(), 160);
  };

  const openSaved = () => {
    setActiveNav("saved");
    setSubmittedQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSave = (id: string) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const openTileSearch = (title: string) => {
    setActiveNav("discover");
    setActiveCategory("For you");
    setQuery(title);
    setSubmittedQuery(title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) {
      searchRef.current?.focus();
      return;
    }
    setActiveNav("discover");
    setActiveCategory("For you");
    setSubmittedQuery(nextQuery);
    window.setTimeout(() => {
      document.getElementById("browse-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const submitAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountEmail.trim()) return;
    setAccountMessage("If there's an account for this email, a sign-in link is on its way.");
  };

  return (
    <div className={`site ${bannerVisible ? "" : "banner-is-closed"}`}>
      {bannerVisible && (
        <div className="app-banner">
          <a href="https://ziggner.com" target="_blank" rel="noreferrer" className="app-banner-link">
            <span className="app-icon" aria-hidden="true">
              <Icon name="bag" size={16} />
            </span>
            <span className="app-banner-copy">
              <span>Download Shop app</span>
              <small>Available on iOS &amp; Android</small>
            </span>
            <Icon name="arrow" size={17} />
          </a>
          <button
            className="banner-close"
            type="button"
            aria-label="Dismiss app download banner"
            onClick={() => setBannerVisible(false)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <aside className="nav-rail" aria-label="Primary navigation">
        <div className="rail-links">
          <button
            className={`rail-button ${activeNav === "discover" && !submittedQuery ? "is-active" : ""}`}
            type="button"
            aria-label="Discover"
            title="Discover"
            onClick={goToDiscover}
          >
            <Icon name="home" size={22} />
          </button>
          <button
            className="rail-button"
            type="button"
            aria-label="Search"
            title="Search"
            onClick={focusSearch}
          >
            <Icon name="search" size={22} />
          </button>
          <button
            className={`rail-button ${activeNav === "saved" ? "is-active" : ""}`}
            type="button"
            aria-label={`Saved items, ${savedIds.length} saved`}
            title="Saved"
            onClick={openSaved}
          >
            <Icon name="heart" size={22} />
            {savedIds.length > 0 && <span className="saved-count">{savedIds.length}</span>}
          </button>
        </div>
        <button
          className="profile-button"
          type="button"
          aria-label="Open your Shop account"
          title="Account"
          onClick={() => setAccountOpen(true)}
        >
          <img src={photo("29301758")} alt="" />
        </button>
      </aside>

      <main className="page-main">
        <div className="content-shell">
          <section className="hero" aria-labelledby="shop-wordmark">
            <div className="hero-stage" aria-label="Featured shops">
              {heroBrands.map((brand) => (
                <SpotlightCard
                  key={brand.name}
                  brand={brand}
                  onClick={() => goToCategory(brand.category)}
                />
              ))}
            </div>
            <div className="hero-branding">
              <h1 className="wordmark" id="shop-wordmark">
                shop<span>.</span>
              </h1>
              <p>Good finds from shops worth knowing.</p>
            </div>
            <form className="search-form" onSubmit={submitSearch} role="search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you shopping for today?"
                aria-label="What are you shopping for today?"
              />
              <button className="search-submit" type="submit" aria-label="Search Shop">
                <Icon name="arrow" size={20} />
              </button>
            </form>
            <nav className="category-pills" aria-label="Shop categories">
              {categoryPills.map((category) => (
                <button
                  className={`category-pill ${activeCategory === category.label && activeNav === "discover" ? "is-selected" : ""}`}
                  key={category.label}
                  type="button"
                  aria-pressed={activeCategory === category.label && activeNav === "discover"}
                  onClick={() => goToCategory(category.label)}
                >
                  <span className="category-icon">
                    <Icon name={category.icon} size={15} />
                  </span>
                  <span>{category.label}</span>
                </button>
              ))}
            </nav>
          </section>

          <div className="browse-content" id="browse-content">
            {activeNav === "saved" ? (
              <ResultGrid
                heading="Saved for later"
                subheading="All the things you wanted to come back to."
                items={savedTiles}
                savedIds={savedIds}
                onSave={toggleSave}
                onOpenTile={openTileSearch}
              />
            ) : submittedQuery ? (
              <ResultGrid
                heading={`Results for "${submittedQuery}"`}
                subheading="A few good places to start."
                emptyTitle="No matches this time."
                emptyBody="Try a different search, like linen, skincare, bags, or home."
                items={searchResults}
                savedIds={savedIds}
                onSave={toggleSave}
                onOpenTile={openTileSearch}
              />
            ) : (
              <div className="category-stack">
                {visibleCategories.map((category) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    savedIds={savedIds}
                    onSave={toggleSave}
                    onOpenTile={openTileSearch}
                    onExplore={goToCategory}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand-block">
              <a className="footer-wordmark" href="#top" onClick={goToDiscover}>
                shop<span>.</span>
              </a>
              <p>Good things are closer than you think.</p>
            </div>
            <div className="footer-column">
              <span className="footer-label">Explore</span>
              {categories.slice(0, 3).map((category) => (
                <button key={category.id} type="button" onClick={() => goToCategory(category.title)}>
                  {category.title}
                </button>
              ))}
            </div>
            <div className="footer-column">
              <span className="footer-label">Make yourself at home</span>
              {categories.slice(3).map((category) => (
                <button key={category.id} type="button" onClick={() => goToCategory(category.title)}>
                  {category.title}
                </button>
              ))}
              <button type="button" onClick={() => setAccountOpen(true)}>Your account</button>
            </div>
            <div className="footer-note">
              <span>Made for the good stuff.</span>
              <button type="button" onClick={goToDiscover} aria-label="Back to top">
                Back to top <Icon name="arrow" size={15} />
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>Copyright 2026 Shop</span>
            <span>Thoughtful finds, all in one place.</span>
          </div>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button type="button" onClick={goToDiscover} className={activeNav === "discover" ? "is-active" : ""}>
          <Icon name="home" size={20} />
          <span>Discover</span>
        </button>
        <button type="button" onClick={focusSearch}>
          <Icon name="search" size={20} />
          <span>Search</span>
        </button>
        <button type="button" onClick={openSaved} className={activeNav === "saved" ? "is-active" : ""}>
          <Icon name="heart" size={20} />
          <span>Saved{savedIds.length > 0 ? ` (${savedIds.length})` : ""}</span>
        </button>
        <button type="button" onClick={() => setAccountOpen(true)}>
          <Icon name="user" size={20} />
          <span>Account</span>
        </button>
      </nav>

      {accountOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAccountOpen(false);
          }}
        >
          <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button
              className="dialog-close"
              type="button"
              aria-label="Close account dialog"
              onClick={() => setAccountOpen(false)}
            >
              <Icon name="close" size={20} />
            </button>
            <span className="dialog-mark">ziggner<span>.</span></span>
            <h2 id="account-title">Your Shop account</h2>
            <p>Sign in to keep your saved finds close and see your orders in one place.</p>
            <form onSubmit={submitAccount}>
              <label htmlFor="account-email">Email address</label>
              <input
                id="account-email"
                type="email"
                placeholder="hello@ziggner.com"
                value={accountEmail}
                onChange={(event) => {
                  setAccountEmail(event.target.value);
                  setAccountMessage("");
                }}
                required
              />
              <button type="submit">Continue</button>
              {accountMessage && <span className="account-message" role="status">{accountMessage}</span>}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}