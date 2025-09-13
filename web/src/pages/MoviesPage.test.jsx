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

vi.mock('../api/functions.js', () => ({
  randomItems: () => Promise.resolve({ movies: [] })
}));

test('renders movie grid and search', async () => {
  render(
    <MemoryRouter>
      <MoviesPage />
    </MemoryRouter>
  );
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  expect(await screen.findByText('Movie 1')).toBeInTheDocument();
});
