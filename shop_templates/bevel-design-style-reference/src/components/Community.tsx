const tiles = [
  {
    src: "https://images.pexels.com/photos/16961403/pexels-photo-16961403.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Maya",
    note: "12-day readiness streak",
    alt: "Woman jogging through a sunlit park at sunrise",
  },
  {
    src: "https://images.pexels.com/photos/11394987/pexels-photo-11394987.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Sam",
    note: "Fuel check, 6:40 AM",
    alt: "Colorful healthy breakfast bowl with fruit and granola",
  },
  {
    src: "https://images.pexels.com/photos/6193559/pexels-photo-6193559.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Priya",
    note: "Recovery day, HRV up 9%",
    alt: "Woman in activewear performing a yoga twist indoors",
  },
  {
    src: "https://images.pexels.com/photos/10615645/pexels-photo-10615645.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Jordan",
    note: "Zone 2 long run",
    alt: "Woman running along a tree-lined road",
  },
  {
    src: "https://images.pexels.com/photos/7656618/pexels-photo-7656618.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Chloe",
    note: "Post-workout bowl",
    alt: "Vibrant smoothie bowl topped with berries and seeds",
  },
  {
    src: "https://images.pexels.com/photos/19444911/pexels-photo-19444911.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Leo",
    note: "New 5K personal best",
    alt: "Young woman running along a sunny pier by the sea",
  },
  {
    src: "https://images.pexels.com/photos/8846563/pexels-photo-8846563.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Ana",
    note: "Morning mobility, 10 min",
    alt: "Woman stretching in a bright living room",
  },
  {
    src: "https://images.pexels.com/photos/19084945/pexels-photo-19084945.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    name: "Dev",
    note: "Sunrise walk, 8.2k steps",
    alt: "Silhouette of a jogger in a park with sunlight through trees",
  },
];

export default function Community() {
  return (
    <section id="community" className="py-20">
      <div className="mx-auto max-w-[1080px] px-6 text-center">
        <p className="text-[24px] font-semibold leading-[0.9] tracking-[-0.24px] text-ink">Community</p>
        <h2 className="mt-6 text-[40px] font-semibold leading-none tracking-[-1.2px] text-ink">
          Mornings from members.
        </h2>
        <p className="mx-auto mt-6 max-w-[640px] text-[24px] leading-[1.3] text-body-gray">
          Real streaks, real breakfasts, and first-light workouts shared by people who check Bevel before coffee.
        </p>
      </div>

      <div className="relative mt-14">
        <div
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[8vw] pb-8 pt-2"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
          }}
        >
          {tiles.map((tile) => (
            <figure
              key={tile.name}
              className="group relative aspect-[3/4] w-[240px] shrink-0 snap-center overflow-hidden rounded-2xl bg-cloud-card shadow-[0_0_16px_-8px_rgba(0,0,0,0.25)] sm:w-[280px]"
            >
              <img
                src={tile.src}
                alt={tile.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-16 text-left">
                <p className="text-[16px] font-medium leading-[22.4px] text-white">{tile.name}</p>
                <p className="text-[12px] leading-[1.1] text-white/85">{tile.note}</p>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
