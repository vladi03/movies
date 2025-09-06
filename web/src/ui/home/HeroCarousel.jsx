import { useEffect, useState } from 'react';

export default function HeroCarousel({ items }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!items || items.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden mb-8 rounded-lg">
      <div
        className="flex h-full transition-transform duration-500"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((m) => {
          const title = m.title || m.name || '(untitled)';
          return (
            <div key={m.id} className="w-full flex-shrink-0 relative">
              {m.poster_link && (
                <img
                  src={m.poster_link}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-2xl font-bold drop-shadow">{title}</h2>
                {m.year && <p className="opacity-75">{m.year}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
