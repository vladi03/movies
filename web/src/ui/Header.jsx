export default function Header({ search, onSearchChange }) {
  return (
    <header className="navbar bg-base-200 sticky top-0 z-10">
      <div className="flex-1">
        <a className="btn btn-ghost normal-case text-xl">Movie Catalog</a>
      </div>
      <div className="flex-none">
        <input
          type="text"
          placeholder="Search"
          className="input input-bordered w-24 md:w-auto"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </header>
  );
}
