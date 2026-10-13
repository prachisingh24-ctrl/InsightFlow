import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists, adds, toggles or deletes Adaption rules that teach the AI',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'toggle', 'delete']),
    id: z.string().optional(),
    rule: z.string().optional(),
    ruleType: z.enum(['Business Context', 'Category Definition', 'Correction Example']).optional(),
    active: z.boolean().optional(),
  }),
  outputSchema: z.object({
    rules: z.array(z.object({ id: z.string(), rule: z.string(), ruleType: z.string(), active: z.boolean(), createdAt: z.string() })),
  }),
  execute: async ({ input }) => {
    if (input.action === 'create' && input.rule) {
      await zite.adaptionRules.create({ record: { rule: input.rule, ruleType: input.ruleType ?? 'Business Context', active: true } });
    } else if (input.action === 'toggle' && input.id) {
      await zite.adaptionRules.update({ id: input.id, record: { active: !!input.active } });
    } else if (input.action === 'delete' && input.id) {
      await zite.adaptionRules.delete({ id: input.id });
    }
    const { records } = await zite.adaptionRules.findAll({ limit: 500 });
    const rules = records.map((r) => ({
      id: r.id, rule: r.rule ?? '', ruleType: r.ruleType ?? 'Business Context', active: !!r.active, createdAt: r.createdAt ?? '',
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { rules };
  },
});
