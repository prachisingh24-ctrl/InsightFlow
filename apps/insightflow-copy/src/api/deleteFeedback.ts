import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Deletes feedback entries',
  inputSchema: z.object({ ids: z.array(z.string()) }),
  outputSchema: z.object({ deleted: z.number() }),
  execute: async ({ input }) => {
    await Promise.all(input.ids.map((id) => zite.feedback.delete({ id })));
    return { deleted: input.ids.length };
  },
});
