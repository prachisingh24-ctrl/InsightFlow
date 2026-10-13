import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Updates or deletes a tracked issue',
  inputSchema: z.object({
    id: z.string(),
    delete: z.boolean().optional(),
    status: z.enum(['Open', 'In Progress', 'Resolved']).optional(),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
    owner: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.delete) {
      await zite.issues.delete({ id: input.id });
      return { success: true };
    }
    const { id, delete: _d, ...record } = input;
    await zite.issues.update({ id, record });
    return { success: true };
  },
});
