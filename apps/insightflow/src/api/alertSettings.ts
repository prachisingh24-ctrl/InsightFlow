import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { Email } from 'zitejs/email';
import { getSettingsRecord, appLink } from '../lib/alerts';

const Settings = z.object({
  email: z.string(),
  enabled: z.boolean(),
  notifyCriticalIssues: z.boolean(),
  notifySentimentDrift: z.boolean(),
  lastSent: z.string(),
});

export default createEndpoint({
  description: 'Reads or saves email-alert settings, or sends a test alert',
  inputSchema: z.object({
    action: z.enum(['get', 'save', 'test']),
    email: z.string().trim().email().optional(),
    enabled: z.boolean().optional(),
    notifyCriticalIssues: z.boolean().optional(),
    notifySentimentDrift: z.boolean().optional(),
  }),
  outputSchema: z.object({ settings: Settings, tested: z.boolean() }),
  execute: async ({ input }) => {
    const read = async () => {
      const s = await getSettingsRecord();
      return {
        email: s?.email ?? '',
        enabled: !!s?.enabled,
        notifyCriticalIssues: s?.notifyCriticalIssues ?? true,
        notifySentimentDrift: s?.notifySentimentDrift ?? true,
        lastSent: s?.lastSent ?? '',
      };
    };

    if (input.action === 'save') {
      const existing = await getSettingsRecord();
      const record = {
        email: input.email ?? existing?.email ?? '',
        enabled: input.enabled ?? !!existing?.enabled,
        notifyCriticalIssues: input.notifyCriticalIssues ?? existing?.notifyCriticalIssues ?? true,
        notifySentimentDrift: input.notifySentimentDrift ?? existing?.notifySentimentDrift ?? true,
      };
      if (record.enabled && !record.email) throw new Error('Add an email address before turning alerts on.');
      if (existing) await zite.alertSettings.update({ id: existing.id, record });
      else await zite.alertSettings.create({ record });
      return { settings: await read(), tested: false };
    }

    if (input.action === 'test') {
      const to = input.email ?? (await getSettingsRecord())?.email;
      if (!to) throw new Error('Add an email address first.');
      const link = appLink();
      await Email.send({
        to,
        subject: 'InsightFlow test alert',
        body: [{ type: 'text', content: `This is a test alert from InsightFlow. You will get emails like this when a new Critical issue appears or customer sentiment drops in a category.${link ? `\n\nOpen InsightFlow: ${link}` : ''}` }],
      });
      return { settings: await read(), tested: true };
    }

    return { settings: await read(), tested: false };
  },
});
