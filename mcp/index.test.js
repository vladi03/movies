import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin', () => {
  const items = [
    { id: '1', data: () => ({ title: 'First', createdAt: 1 }) },
    { id: '2', data: () => ({ title: 'Second', createdAt: 2 }) },
  ];
  return {
    default: {
      apps: [],
      initializeApp: vi.fn(),
      credential: { applicationDefault: vi.fn() },
      firestore: () => ({
        collection: () => ({
          orderBy: () => ({
            limit: (n) => ({
              get: async () => ({ docs: items.slice(0, n) })
            }),
            get: async () => ({ docs: items })
          }),
          add: vi.fn(async (data) => ({
            id: '3',
            get: async () => ({ data: () => data })
          }))
        })
      })
    }
  };
});

import { tools } from './index.js';

describe('MCP tool handlers', () => {
  it('listItems returns limited items', async () => {
    const res = await tools.listItems.handler({ limit: 1 });
    const data = JSON.parse(res.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: '1', title: 'First' });
  });

  it('createItem validates input', async () => {
    const res = await tools.createItem.handler({});
    const err = JSON.parse(res.content[0].text);
    expect(err.fieldErrors.title).toBeTruthy();
  });
});
