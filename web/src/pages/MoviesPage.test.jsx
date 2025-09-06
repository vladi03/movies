import { render, screen } from '@testing-library/react';
import MoviesPage from './MoviesPage.jsx';
import { vi, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useMoviesQuery.js', () => ({
  default: () => ({
    items: [{ id: '1', title: 'Movie 1' }],
    loading: false,
    error: '',
    setQuery: vi.fn(),
    query: { q: '', genre: '', sort: 'title', dir: 'asc', page: 0 },
  }),
}));

test('renders movie grid and search', () => {
  render(
    <MemoryRouter>
      <MoviesPage />
    </MemoryRouter>
  );
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  expect(screen.getByText('Movie 1')).toBeInTheDocument();
});
