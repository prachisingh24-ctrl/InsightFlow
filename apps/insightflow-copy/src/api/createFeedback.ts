import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const SOURCES = ['Review', 'Survey', 'Support', 'Social', 'Other'] as const;

export default createEndpoint({
  description: 'Adds feedback entries (manual, CSV import, or sample data)',
  inputSchema: z.object({
    items: z.array(z.object({
      content: z.string(),
      source: z.string().optional(),
      customerName: z.string().optional(),
      rating: z.number().optional(),
      submittedAt: z.string().optional(),
      sentiment: z.enum(['Positive', 'Neutral', 'Negative', 'Mixed']).optional(),
      sentimentScore: z.number().optional(),
      category: z.string().optional(),
      topics: z.string().optional(),
      complaint: z.string().optional(),
      urgency: z.number().optional(),
    })),
  }),
  outputSchema: z.object({ created: z.number() }),
  execute: async ({ input }) => {
    const rows = input.items
      .filter((i) => i.content.trim())
      .map((i) => {
        const src = SOURCES.find((s) => s.toLowerCase() === (i.source ?? '').trim().toLowerCase()) ?? 'Other';
        const d = i.submittedAt ? new Date(i.submittedAt) : new Date();
        return {
          content: i.content.trim(),
          source: src,
          customerName: i.customerName?.trim() || undefined,
          rating: i.rating,
          submittedAt: (isNaN(d.getTime()) ? new Date() : d).toISOString(),
          ...(i.sentiment ? {
            sentiment: i.sentiment, sentimentScore: i.sentimentScore, category: i.category,
            topics: i.topics, complaint: i.complaint, urgency: i.urgency, analyzed: true,
          } : { analyzed: false }),
          manuallyCorrected: false,
        };
      });
    for (let i = 0; i < rows.length; i += 100) {
      await zite.feedback.bulkCreate({ records: rows.slice(i, i + 100) });
    }
    return { created: rows.length };
  },
});
