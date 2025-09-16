import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { test, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { mockDeleteItem, mockUpdateItem } = vi.hoisted(() => ({
  mockDeleteItem: vi.fn().mockResolvedValue({}),
  mockUpdateItem: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/functions.js', () => ({
  deleteItem: mockDeleteItem,
  updateItem: mockUpdateItem,
}));

// Import after mocking API helpers so the component uses the mocked versions.
import MovieDialog from './MovieDialog.jsx';

afterEach(() => {
  vi.clearAllMocks();
  mockDeleteItem.mockResolvedValue({});
  mockUpdateItem.mockResolvedValue({});
});

const movie = {
  id: 'movie-1',
  title: 'Test Movie',
  year: 2020,
  actors: ['A', 'B'],
  genre: ['Drama'],
  poster_link: 'http://example.com/poster.jpg',
};

test('shows movie details', () => {
  render(<MovieDialog movie={movie} open={true} onClose={() => {}} />);
  expect(screen.getByText('Test Movie')).toBeInTheDocument();
  expect(screen.getByText('(2020)')).toBeInTheDocument();
  expect(screen.getByText('Actors')).toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();
});

test('marks movie as watched and shows last watched time', async () => {
  const before = Date.now();
  mockUpdateItem.mockImplementation(async ({ lastWatched, ...rest }) => ({
    ...rest,
    id: movie.id,
    lastWatched,
  }));

  render(<MovieDialog movie={movie} open={true} onClose={() => {}} />);
  const watchedButton = screen.getByRole('button', { name: /watched/i });
  fireEvent.click(watchedButton);
  await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
  const args = mockUpdateItem.mock.calls[0][0];
  expect(args.id).toBe(movie.id);
  expect(typeof args.lastWatched).toBe('number');
  expect(args.lastWatched).toBeGreaterThanOrEqual(before);
  expect(args.lastWatched).toBeLessThanOrEqual(Date.now());
  await waitFor(() => {
    expect(screen.getByText(/last watched/i)).toBeInTheDocument();
  });
});
