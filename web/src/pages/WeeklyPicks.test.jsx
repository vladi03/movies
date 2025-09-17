import { describe, expect, beforeEach, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = {
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
};

vi.mock('../auth/AuthGate.jsx', () => ({
  useAuth: () => mockAuth,
  default: ({ children }) => children,
}));

const mockRandomItems = vi.fn();
const mockGetWeeklyPicks = vi.fn();
const mockSaveWeeklyPicks = vi.fn();

vi.mock('../api/functions.js', () => ({
  randomItems: (...args) => mockRandomItems(...args),
  getWeeklyPicks: (...args) => mockGetWeeklyPicks(...args),
  saveWeeklyPicks: (...args) => mockSaveWeeklyPicks(...args),
}));

vi.mock('../ui/Layout.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

import WeeklyPicks from './WeeklyPicks.jsx';

const createMovie = (id, title) => ({ id, title, year: 2020 + id.charCodeAt(0) });

describe('WeeklyPicks memory logic', () => {
  beforeEach(() => {
    mockRandomItems.mockReset();
    mockGetWeeklyPicks.mockReset();
    mockSaveWeeklyPicks.mockReset();
    mockGetWeeklyPicks.mockResolvedValue(null);
  });

  it('avoids repeating movies when picking the full schedule', async () => {
    mockRandomItems
      .mockImplementationOnce(async () => [
        createMovie('a', 'Movie A'),
        createMovie('a', 'Movie A duplicate'),
        createMovie('b', 'Movie B'),
        createMovie('c', 'Movie C'),
        createMovie('b', 'Movie B duplicate'),
        createMovie('c', 'Movie C duplicate'),
      ])
      .mockImplementationOnce(async () => [
        createMovie('a', 'Movie A again'),
        createMovie('d', 'Movie D'),
        createMovie('e', 'Movie E'),
      ])
      .mockImplementationOnce(async () => [
        createMovie('f', 'Movie F'),
        createMovie('g', 'Movie G'),
      ]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WeeklyPicks />
      </MemoryRouter>,
    );

    const pickButton = await screen.findByRole('button', { name: /pick movies/i });
    await user.click(pickButton);

    await waitFor(() => {
      expect(mockRandomItems).toHaveBeenCalledTimes(3);
    });

    const expectedTitles = ['Movie A', 'Movie B', 'Movie C', 'Movie D', 'Movie E', 'Movie F', 'Movie G'];
    for (const title of expectedTitles) {
      const element = await screen.findByText(title);
      expect(element).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getAllByText(title)).toHaveLength(1);
      });
    }
  });

  it('spins a single day without repeating previously seen movies', async () => {
    mockRandomItems
      .mockImplementationOnce(async () => [
        createMovie('a', 'Movie A'),
        createMovie('b', 'Movie B'),
        createMovie('c', 'Movie C'),
        createMovie('d', 'Movie D'),
        createMovie('e', 'Movie E'),
        createMovie('f', 'Movie F'),
        createMovie('g', 'Movie G'),
      ])
      .mockImplementationOnce(async () => [createMovie('a', 'Movie A repeat')])
      .mockImplementationOnce(async () => [createMovie('h', 'Movie H')]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WeeklyPicks />
      </MemoryRouter>,
    );

    const pickButton = await screen.findByRole('button', { name: /pick movies/i });
    await user.click(pickButton);

    await waitFor(() => {
      expect(mockRandomItems).toHaveBeenCalledTimes(1);
    });

    const cards = await screen.findAllByRole('button', { name: /click to spin this day/i });
    await user.click(cards[0]);

    const spinButton = await screen.findByRole('button', { name: /^spin$/i });
    await user.click(spinButton);

    await waitFor(() => {
      expect(mockRandomItems).toHaveBeenCalledTimes(3);
    });

    const updatedCards = await screen.findAllByRole('button', { name: /click to spin this day/i });
    expect(updatedCards.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(within(updatedCards[0]).getByText('Movie H')).toBeInTheDocument();
    });
    expect(within(updatedCards[0]).queryByText('Movie A')).not.toBeInTheDocument();
  });
});

