import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { computeDrift } from '../lib/alerts';

export default createEndpoint({
  description: 'Flags categories whose sentiment got noticeably worse versus the previous period',
  inputSchema: z.object({ windowDays: z.number().min(3).max(60).optional() }),
  outputSchema: z.object({
    windowDays: z.number(),
    alerts: z.array(z.object({
      category: z.string(),
      recentTotal: z.number(),
      recentNegative: z.number(),
      priorTotal: z.number(),
      priorNegative: z.number(),
      recentRate: z.number(),
      priorRate: z.number(),
      rateChange: z.number(),
      scoreChange: z.number(),
      severity: z.enum(['High', 'Medium']),
      reason: z.string(),
    })),
  }),
  execute: async ({ input }) => {
    const windowDays = input.windowDays ?? 14;
    return { windowDays, alerts: await computeDrift(windowDays) };
  },
});
