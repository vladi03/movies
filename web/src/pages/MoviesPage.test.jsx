import { vi, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../auth/AuthGate.jsx', () => {
  const mockAuth = {
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    authError: null,
    clearAuthError: vi.fn(),
  };
  return {
    useAuth: () => mockAuth,
    default: ({ children }) => children,
  };
});

vi.mock('../hooks/useMoviesQuery.js', () => ({
  default: () => ({
    items: [{ id: '1', title: 'Movie 1' }],
    loading: false,
    error: '',
    setQuery: vi.fn(),
    query: { q: '', genre: '', sort: 'title', dir: 'asc', page: 0 },
  }),
}));

import MoviesPage from './MoviesPage.jsx';

test('renders movie grid and search', () => {
  render(
    <MemoryRouter>
      <MoviesPage />
    </MemoryRouter>
  );
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  expect(screen.getByText('Movie 1')).toBeInTheDocument();
});
