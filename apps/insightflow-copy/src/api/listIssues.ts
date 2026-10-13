import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists tracked issues with their linked feedback',
  inputSchema: z.object({}),
  outputSchema: z.object({
    issues: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      priority: z.string(),
      category: z.string(),
      impactScore: z.number(),
      reasoning: z.string(),
      actionItems: z.string(),
      owner: z.string(),
      createdAt: z.string(),
      feedbackCount: z.number(),
      examples: z.array(z.string()),
    })),
  }),
  execute: async () => {
    const { records } = await zite.issues.findAll({ limit: 500 });
    const { records: fb } = await zite.feedback.findAll({ limit: 2000 });
    const issues = records.map((r) => {
      const linked = fb.filter((f) => (f.issue as unknown as string[] | undefined)?.includes(r.id));
      return {
        id: r.id,
        title: r.title ?? '',
        description: r.description ?? '',
        status: r.status ?? 'Open',
        priority: r.priority ?? 'Medium',
        category: r.category ?? '',
        impactScore: r.impactScore ?? 0,
        reasoning: r.reasoning ?? '',
        actionItems: r.actionItems ?? '',
        owner: r.owner ?? '',
        createdAt: r.createdAt ?? '',
        feedbackCount: linked.length,
        examples: linked.sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0)).slice(0, 3).map((f) => f.content ?? ''),
      };
    });
    issues.sort((a, b) => b.impactScore - a.impactScore);
    return { issues };
  },
});
