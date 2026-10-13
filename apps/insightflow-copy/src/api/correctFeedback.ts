import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Corrects AI analysis on a feedback item and teaches the AI from the correction (Adaption)',
  inputSchema: z.object({
    id: z.string(),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative', 'Mixed']),
    category: z.string(),
    urgency: z.number(),
    complaint: z.string(),
  }),
  outputSchema: z.object({ learned: z.boolean() }),
  execute: async ({ input }) => {
    const before = await zite.feedback.findOne({ id: input.id });
    if (!before) throw new Error('Feedback not found');
    await zite.feedback.update({
      id: input.id,
      record: {
        sentiment: input.sentiment,
        category: input.category,
        urgency: input.urgency,
        complaint: input.complaint,
        manuallyCorrected: true,
        analyzed: true,
      },
    });
    const changes: string[] = [];
    if (before.sentiment !== input.sentiment) changes.push(`sentiment is ${input.sentiment} (not ${before.sentiment || 'unset'})`);
    if ((before.category ?? '') !== input.category) changes.push(`category is "${input.category}" (not "${before.category || 'unset'}")`);
    if ((before.urgency ?? 0) !== input.urgency) changes.push(`urgency is ${input.urgency} (not ${before.urgency ?? 'unset'})`);
    if (!changes.length) return { learned: false };
    const snippet = (before.content ?? '').slice(0, 180);
    await zite.adaptionRules.create({
      record: { rule: `For feedback like "${snippet}": ${changes.join('; ')}.`, ruleType: 'Correction Example', active: true },
    });
    return { learned: true };
  },
});
