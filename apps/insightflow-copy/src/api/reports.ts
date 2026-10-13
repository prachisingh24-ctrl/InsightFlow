import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const Report = z.object({ id: z.string(), title: z.string(), content: z.string(), feedbackCount: z.number(), createdAt: z.string() });

export default createEndpoint({
  description: 'Lists, fetches or deletes insight reports',
  inputSchema: z.object({ action: z.enum(['list', 'get', 'delete']), id: z.string().optional() }),
  outputSchema: z.object({ reports: z.array(Report) }),
  execute: async ({ input }) => {
    const map = (r: { id: string; title?: string; content?: string; feedbackCount?: number; createdAt?: string }) => ({
      id: r.id, title: r.title ?? '', content: r.content ?? '', feedbackCount: r.feedbackCount ?? 0, createdAt: r.createdAt ?? '',
    });
    if (input.action === 'get' && input.id) {
      const r = await zite.reports.findOne({ id: input.id });
      return { reports: r ? [map(r)] : [] };
    }
    if (input.action === 'delete' && input.id) await zite.reports.delete({ id: input.id });
    const { records } = await zite.reports.findAll({ limit: 200 });
    return { reports: records.map(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  },
});
