import GenresChips from './movies/GenresChips.jsx';

export default function FiltersBar({ genres, genre, setGenre, sort, setSort }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <GenresChips genres={genres} selected={genre} onSelect={setGenre} />
      <select className="select select-bordered" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="title">Title</option>
        <option value="year">Year</option>
      </select>
    </div>
  );
}
