export default function GenreRow({ genre, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{genre}</h2>
      <div className="flex overflow-x-auto gap-2 pb-2">
        {items.map((m) => {
          const title = m.title || m.name || '(untitled)';
          return (
            <img
              key={m.id}
              src={m.poster_link}
              alt={title}
              className="h-40 w-28 object-cover rounded-md flex-shrink-0"
            />
          );
        })}
      </div>
    </section>
  );
}
