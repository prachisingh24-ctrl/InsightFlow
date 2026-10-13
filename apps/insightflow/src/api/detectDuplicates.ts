import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { detectDuplicates } from '../lib/duplicates';

export default createEndpoint({
  description: 'Finds near-duplicate feedback and groups it under the earliest item so repeats are not counted as separate problems',
  inputSchema: z.object({}),
  outputSchema: z.object({ clusters: z.number(), duplicates: z.number(), total: z.number() }),
  execute: async () => detectDuplicates(),
});
