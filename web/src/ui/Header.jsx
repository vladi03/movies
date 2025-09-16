import { Link, useLocation } from 'react-router-dom';

export default function Header({ search, onSearchChange }) {
  const { pathname } = useLocation();
  const showSearch = typeof onSearchChange === 'function';
  const searchValue = typeof search === 'string' ? search : '';
  return (
    <header className="navbar bg-base-200 sticky top-0 z-10">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">Movie Catalog</Link>
      </div>
      <div className="flex-none flex items-center gap-2">
        <Link
          to="/weekly"
          className={`btn btn-ghost ${pathname === '/weekly' ? 'btn-active' : ''}`}
        >
          Weekly Picks
        </Link>
        <Link
          to="/ai"
          className={`btn btn-ghost ${pathname === '/ai' ? 'btn-active' : ''}`}
        >
          AI
        </Link>
        {showSearch && (
          <input
            type="text"
            placeholder="Search"
            className="input input-bordered w-24 md:w-auto"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
      </div>
    </header>
  );
}
