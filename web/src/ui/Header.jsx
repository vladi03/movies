import { Link, useLocation } from 'react-router-dom';

export default function Header({ search, onSearchChange }) {
  const { pathname } = useLocation();
  return (
    <header className="navbar bg-base-200 sticky top-0 z-10">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">Movie Catalog</Link>
      </div>
      <div className="flex-none">
        <Link to="/home" className={`btn btn-ghost mr-2 ${pathname === '/home' ? 'btn-active' : ''}`}>Browse</Link>
        <Link to="/ai" className={`btn btn-ghost mr-2 ${pathname === '/ai' ? 'btn-active' : ''}`}>AI</Link>
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
