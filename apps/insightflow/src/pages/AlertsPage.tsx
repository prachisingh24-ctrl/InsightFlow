import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';
import { alertSettings, sendAlerts } from 'zitejs/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@project/components/ui/card';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Skeleton } from '@project/components/ui/skeleton';
import { Bell, Loader2, Mail, Send, Save } from 'lucide-react';
import { PageHeader } from '../components/ui-bits';
import DriftBanner from '../components/DriftBanner';

const emailSchema = z.string().trim().email();

export default function AlertsPage() {
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [critical, setCritical] = useState(true);
  const [drift, setDrift] = useState(true);
  const [lastSent, setLastSent] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    alertSettings({ action: 'get' }).then(({ settings: s }) => {
      setEmail(s.email); setEnabled(s.enabled); setCritical(s.notifyCriticalIssues); setDrift(s.notifySentimentDrift); setLastSent(s.lastSent); setLoaded(true);
    }).catch(() => { toast.error('Could not load alert settings'); setLoaded(true); });
  }, []);

  const validEmail = emailSchema.safeParse(email).success;
  const emailError = email && !validEmail ? 'Enter a valid email address' : '';

  const save = async () => {
    if (enabled && !validEmail) return toast.error('Add a valid email before turning alerts on.');
    setBusy('save');
    try {
      const { settings: s } = await alertSettings({ action: 'save', ...(validEmail ? { email: email.trim() } : {}), enabled, notifyCriticalIssues: critical, notifySentimentDrift: drift });
      setLastSent(s.lastSent);
      toast.success(enabled ? 'Alerts are on' : 'Settings saved — alerts are off');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save settings'); }
    setBusy(null);
  };

  const test = async () => {
    if (!validEmail) return toast.error('Enter a valid email first.');
    setBusy('test');
    try { await alertSettings({ action: 'test', email: email.trim() }); toast.success(`Test email sent to ${email.trim()}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send the test email'); }
    setBusy(null);
  };

  const sendNow = async () => {
    setBusy('send');
    try {
      const r = await sendAlerts({});
      if (r.sent) { toast.success(`Alert sent: ${r.critical} critical issue(s), ${r.drift} sentiment shift(s)`); const { settings: s } = await alertSettings({ action: 'get' }); setLastSent(s.lastSent); }
      else toast.message(r.reason ?? 'Nothing new to report.');
    } catch { toast.error('Could not send alerts'); }
    setBusy(null);
  };

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Get an email the moment something needs attention, without watching the dashboard." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" />Email alerts</CardTitle>
            <CardDescription>Sent automatically whenever recommendations are generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!loaded ? <Skeleton className="h-48 rounded-xl" /> : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="alert-email">Send alerts to</Label>
                  <div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="alert-email" type="email" className="pl-9" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold">Alerts on</div><div className="text-xs text-muted-foreground">Master switch for all email alerts.</div></div><Switch checked={enabled} onCheckedChange={setEnabled} /></div>
                  <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold">New Critical issues</div><div className="text-xs text-muted-foreground">Each critical issue is announced once.</div></div><Switch checked={critical} onCheckedChange={setCritical} /></div>
                  <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold">Sentiment drift</div><div className="text-xs text-muted-foreground">A category's sentiment drops sharply vs the last 2 weeks (at most once a day).</div></div><Switch checked={drift} onCheckedChange={setDrift} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} disabled={!!busy}>{busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
                  <Button variant="outline" onClick={test} disabled={!!busy || !validEmail}>{busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send test email</Button>
                  <Button variant="outline" onClick={sendNow} disabled={!!busy || !enabled}>{busy === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}Check & send now</Button>
                </div>
                {lastSent && <p className="text-xs text-muted-foreground">Last alert sent {format(new Date(lastSent), 'MMM d, h:mm a')}.</p>}
              </>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Current sentiment shifts</CardTitle><CardDescription>What the drift alert is watching right now.</CardDescription></CardHeader>
            <CardContent>
              <DriftBanner limit={10} linkToAlerts={false} />
              <p className="mt-3 text-xs text-muted-foreground">If nothing is listed above, no category has slipped enough to flag. A category needs at least 3 recent items and a clear drop against its previous period.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
