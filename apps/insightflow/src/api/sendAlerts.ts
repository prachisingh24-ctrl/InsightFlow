import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { dispatchAlerts } from '../lib/alerts';

export default createEndpoint({
  description: 'Emails any new critical-issue and sentiment-drift alerts to the configured address',
  inputSchema: z.object({}),
  outputSchema: z.object({ sent: z.boolean(), critical: z.number(), drift: z.number(), reason: z.string().optional() }),
  execute: async () => dispatchAlerts(),
});
