import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeAll, afterEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';

import HeroCarousel from './HeroCarousel.jsx';

const heroItems = [
  {
    id: 'hero-1',
    title: 'First Feature',
    year: 2021,
    landscape_poster_link: 'https://example.com/poster-1.jpg',
  },
  {
    id: 'hero-2',
    title: 'Second Story',
    year: 2019,
    poster_link: 'https://example.com/poster-2.jpg',
  },
];

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HeroCarousel', () => {
  test('renders slides and calls onSelect when hero title is clicked', () => {
    const handleSelect = vi.fn();
    render(<HeroCarousel items={heroItems} onSelect={handleSelect} />);

    const heroButton = screen.getByRole('button', {
      name: /view details for first feature/i,
    });
    fireEvent.click(heroButton);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(heroItems[0]);
  });

  test('advances to the next slide when the next button is pressed', async () => {
    render(<HeroCarousel items={heroItems} onSelect={() => {}} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      const secondSlide = document.getElementById('hero-slide-1');
      expect(secondSlide).toHaveAttribute('data-active', 'true');
    });

    const firstSlide = document.getElementById('hero-slide-0');
    expect(firstSlide).not.toHaveAttribute('data-active');
  });
});
