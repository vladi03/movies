import { useCallback, useEffect, useRef, useState } from 'react';

export default function HeroCarousel({ items = [], onSelect }) {
  const containerRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const length = Array.isArray(items) ? items.length : 0;

  const scrollToIndex = useCallback((idx) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector(`#hero-slide-${idx}`);
    if (target) {
      container.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
  }, [containerRef]);

  useEffect(() => {
    if (length === 0) return undefined;
    setCurrent((prev) => {
      const safe = prev < length ? prev : 0;
      scrollToIndex(safe);
      return safe;
    });
    const id = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % length;
        scrollToIndex(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [length, scrollToIndex]);

  const bgFor = (m) => m.landscape_poster_link || m.poster_link || '';

  if (length === 0) return null;

  return (
    <div ref={containerRef} className="carousel w-full mb-6 h-64 md:h-80 lg:h-96 rounded-box overflow-hidden">
      {items.map((m, idx) => {
        const bg = bgFor(m);
        const title = m.title || m.name || '(untitled)';
        const year = m.year ? `(${m.year})` : '';
        const isActive = current === idx;
        return (
          <div
            id={`hero-slide-${idx}`}
            className="carousel-item relative w-full"
            key={m.id || idx}
            aria-hidden={!isActive}
            data-active={isActive ? 'true' : undefined}
          >
            <div
              className="w-full h-full bg-center bg-cover"
              style={{ backgroundImage: bg ? `url(${bg})` : undefined }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-100/80 via-base-100/20 to-transparent" />
            <div className="absolute inset-0 flex items-end px-6 md:px-8 pb-4 md:pb-6">
              <button
                type="button"
                className="group inline-flex max-w-[90%] bg-transparent border-none p-0 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent3)]/60"
                onClick={() => onSelect?.(m)}
                aria-label={`View details for ${title}`}
              >
                <h2 className="text-xl md:text-3xl font-semibold inline-flex items-center bg-white/25 text-[color:var(--accent3)] rounded-xl px-3 py-1 shadow-sm backdrop-blur-sm transition group-hover:bg-white/35">
                  <span>{title}</span>{' '}
                  {year && <span className="opacity-80">{year}</span>}
                </h2>
              </button>
            </div>
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full w-10 h-10 md:w-12 md:h-12 bg-white/20 text-[color:var(--accent3)] border border-white/40 shadow-sm backdrop-blur-sm transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent3)]/50"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrent((p) => {
                    const idx = (p - 1 + length) % length;
                    scrollToIndex(idx);
                    return idx;
                  });
                }}
                aria-label="Previous"
              >
                ❮
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full w-10 h-10 md:w-12 md:h-12 bg-white/20 text-[color:var(--accent3)] border border-white/40 shadow-sm backdrop-blur-sm transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent3)]/50"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrent((p) => {
                    const idx = (p + 1) % length;
                    scrollToIndex(idx);
                    return idx;
                  });
                }}
                aria-label="Next"
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
