import 'dotenv/config';
import admin from 'firebase-admin';
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}
const db = admin.firestore();
const col = () => db.collection(process.env.FIRESTORE_COLLECTION || 'items');

const ItemCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional()
});
const ItemUpdate = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional()
});

export const tools = {
  listItems: {
      description: 'List items ordered by createdAt desc',
      inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
      handler: async ({ limit }) => {
        let q = col().orderBy('createdAt', 'desc');
        if (limit) q = q.limit(limit);
        const snap = await q.get();
        return { content: [{ type: 'text', text: JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2) }] };
      }
    },
    getItem: {
      description: 'Get one item by id',
      inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      handler: async ({ id }) => {
        const doc = await col().doc(id).get();
        if (!doc.exists) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Not found' }) }] };
        return { content: [{ type: 'text', text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }] };
      }
    },
    createItem: {
      description: 'Create an item',
      inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } },
      handler: async (input) => {
        const parsed = ItemCreate.safeParse(input);
        if (!parsed.success) return { content: [{ type: 'text', text: JSON.stringify(parsed.error.flatten()) }] };
        const now = Date.now();
        const ref = await col().add({ ...parsed.data, createdAt: now, updatedAt: now });
        const snap = await ref.get();
        return { content: [{ type: 'text', text: JSON.stringify({ id: ref.id, ...snap.data() }, null, 2) }] };
      }
    },
    updateItem: {
      description: 'Update an existing item',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } } },
      handler: async (input) => {
        const parsed = ItemUpdate.safeParse(input);
        if (!parsed.success) return { content: [{ type: 'text', text: JSON.stringify(parsed.error.flatten()) }] };
        const ref = col().doc(parsed.data.id);
        const snap = await ref.get();
        if (!snap.exists) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Not found' }) }] };
        const { id, ...patch } = parsed.data;
        await ref.update({ ...patch, updatedAt: Date.now() });
        const updated = await ref.get();
        return { content: [{ type: 'text', text: JSON.stringify({ id: updated.id, ...updated.data() }, null, 2) }] };
      }
    },
    deleteItem: {
      description: 'Delete an item by id',
      inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      handler: async ({ id }) => {
        await col().doc(id).delete();
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true, id }) }] };
      }
    }
  };

export const server = new Server({ name: 'firestore-mcp', version: '1.0.0' }, { tools });

if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  server.connect(transport);
}
