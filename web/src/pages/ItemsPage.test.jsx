import { render, screen } from '@testing-library/react';
import ItemsPage from './ItemsPage.jsx';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../firebase.js', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: (q, cb) => {
    cb({
      docs: [
        { id: '1', data: () => ({ title: 'Item 1' }) },
        { id: '2', data: () => ({ title: 'Item 2' }) },
      ],
    });
    return vi.fn();
  },
  orderBy: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../auth/AuthGate.jsx', () => ({
  useAuth: () => ({ user: { displayName: 'Tester' } }),
}));

test('renders items and read-only message', () => {
  render(<ItemsPage />);
  expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  expect(screen.getByText('Item 1')).toBeInTheDocument();
  expect(screen.getByText('Item 2')).toBeInTheDocument();
});
