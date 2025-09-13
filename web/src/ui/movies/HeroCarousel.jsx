import { useEffect, useRef, useState } from 'react';

export default function HeroCarousel({ items = [], onScrollTo }) {
  if (!items || items.length === 0) return null;

  function bgFor(m) {
    return m.landscape_poster_link || m.poster_link || '';
  }

  const containerRef = useRef(null);
  const [current, setCurrent] = useState(0);

  function scrollToIndex(idx) {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector(`#hero-slide-${idx}`);
    if (target) {
      container.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
  }

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!items || items.length === 0) return undefined;
    const id = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div ref={containerRef} className="carousel w-full mb-6 h-64 md:h-80 lg:h-96 rounded-box overflow-hidden">
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
              <div className="inline-block max-w-[90%]">
                <h2 className="text-xl md:text-3xl font-semibold inline-block bg-white/25 text-black rounded-xl px-3 py-1 shadow-sm backdrop-blur-sm">
                  <span>{title}</span>{' '}{year && <span className="opacity-80">{year}</span>}
                </h2>
              </div>
              <div className="flex gap-2">
                {m.id && (
                  <a
                    href={`#movie-${m.id}`}
                    onClick={(e) => {
                      // Prefer smooth scroll if provided
                      e.preventDefault();
                      onScrollTo?.(m);
                    }}
                    className="inline-flex items-center bg-white/25 text-black rounded-xl px-3 py-1.5 md:px-4 md:py-2 shadow-sm backdrop-blur-sm hover:bg-white/35 transition"
                  >
                    Jump to card
                  </a>
                )}
              </div>
            </div>
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between">
              <button
                type="button"
                className="btn btn-circle"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrent((p) => {
                    const idx = (p - 1 + items.length) % items.length;
                    scrollToIndex(idx);
                    return idx;
                  });
                }}
              >
                ❮
              </button>
              <button
                type="button"
                className="btn btn-circle"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrent((p) => {
                    const idx = (p + 1) % items.length;
                    scrollToIndex(idx);
                    return idx;
                  });
                }}
              >
                ❯
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
