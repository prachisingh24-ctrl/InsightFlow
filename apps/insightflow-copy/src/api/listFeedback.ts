import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all feedback entries',
  inputSchema: z.object({}),
  outputSchema: z.object({
    feedback: z.array(z.object({
      id: z.string(),
      content: z.string(),
      source: z.string(),
      customerName: z.string(),
      rating: z.number().nullable(),
      submittedAt: z.string(),
      sentiment: z.string(),
      sentimentScore: z.number().nullable(),
      category: z.string(),
      topics: z.string(),
      complaint: z.string(),
      urgency: z.number().nullable(),
      analyzed: z.boolean(),
      manuallyCorrected: z.boolean(),
    })),
  }),
  execute: async () => {
    const { records } = await zite.feedback.findAll({ limit: 2000 });
    const feedback = records.map((r) => ({
      id: r.id,
      content: r.content ?? '',
      source: r.source ?? 'Other',
      customerName: r.customerName ?? '',
      rating: r.rating ?? null,
      submittedAt: r.submittedAt ?? '',
      sentiment: r.sentiment ?? '',
      sentimentScore: r.sentimentScore ?? null,
      category: r.category ?? '',
      topics: r.topics ?? '',
      complaint: r.complaint ?? '',
      urgency: r.urgency ?? null,
      analyzed: !!r.analyzed,
      manuallyCorrected: !!r.manuallyCorrected,
    }));
    feedback.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return { feedback };
  },
});
