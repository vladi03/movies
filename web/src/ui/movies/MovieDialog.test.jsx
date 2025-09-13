import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import '@testing-library/jest-dom';
import MovieDialog from './MovieDialog.jsx';

const movie = {
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
