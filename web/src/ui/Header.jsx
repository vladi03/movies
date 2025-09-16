import { Link, useLocation } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../auth/AuthGate.jsx';

function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const avatar = user.photoURL;
  const name = user.displayName || user.email || 'Signed in user';

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        className="btn btn-ghost btn-circle avatar"
        tabIndex={0}
        aria-label="User menu"
      >
        <div className="w-10 rounded-full overflow-hidden bg-base-300 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <UserCircleIcon className="w-7 h-7 text-base-content/70" />
          )}
        </div>
      </button>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content mt-3 w-56 rounded-box bg-base-200 p-2 shadow"
      >
        <li className="mb-2 px-2 py-2 text-sm">
          <p className="font-semibold leading-tight">{name}</p>
          {user.email && <p className="text-xs opacity-70">{user.email}</p>}
        </li>
        <li>
          <Link to="/profile">View profile</Link>
        </li>
        <li>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}

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
        <UserMenu />
      </div>
    </header>
  );
}
