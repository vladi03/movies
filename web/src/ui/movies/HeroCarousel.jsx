import React from 'react';

export default function HeroCarousel({ movies = [] }) {
  if (!movies.length) return null;
  return (
    <div className="carousel w-full mb-6">
      {movies.map((m) => {
        const img = m.landscape_poster_link || m.poster_link;
        return (
          <a
            key={m.id}
            href={`#${m.id}`}
            className="carousel-item relative w-full h-64 md:h-96"
          >
            {img && (
              <img
                src={img}
                alt={m.title || 'poster'}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
              <h2 className="text-xl md:text-3xl font-semibold">
                {m.title}
              </h2>
            </div>
          </a>
        );
      })}
    </div>
  );
}
