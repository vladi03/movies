export default function HeroCarousel({ items = [], onScrollTo }) {
  if (!items || items.length === 0) return null;

  function bgFor(m) {
    return m.landscape_poster_link || m.poster_link || '';
  }

  return (
    <div className="carousel w-full mb-6 h-64 md:h-80 lg:h-96 rounded-box overflow-hidden">
      {items.map((m, idx) => {
        const bg = bgFor(m);
        const prev = (idx - 1 + items.length) % items.length;
        const next = (idx + 1) % items.length;
        const title = m.title || m.name || '(untitled)';
        const year = m.year ? `(${m.year})` : '';
        return (
          <div id={`hero-slide-${idx}`} className="carousel-item relative w-full" key={m.id || idx}>
            <div
              className="w-full h-full bg-center bg-cover"
              style={{ backgroundImage: bg ? `url(${bg})` : undefined }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-100/80 via-base-100/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col gap-3">
              <h2 className="text-xl md:text-3xl font-semibold">
                {title} <span className="opacity-80">{year}</span>
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm md:btn-md"
                  onClick={() => onScrollTo?.(m)}
                >
                  View in list
                </button>
                {m.id && (
                  <a
                    href={`#movie-${m.id}`}
                    onClick={(e) => {
                      // Prefer smooth scroll if provided
                      e.preventDefault();
                      onScrollTo?.(m);
                    }}
                    className="btn btn-ghost btn-sm md:btn-md"
                  >
                    Jump to card
                  </a>
                )}
              </div>
            </div>
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between">
              <a href={`#hero-slide-${prev}`} className="btn btn-circle">❮</a>
              <a href={`#hero-slide-${next}`} className="btn btn-circle">❯</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

