import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { manageRules, ManageRulesOutputType } from 'zitejs/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@project/components/ui/card';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Switch } from '@project/components/ui/switch';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Brain, Building2, Tags, PencilLine, Trash2, Plus, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui-bits';

type Rule = ManageRulesOutputType['rules'][0];
type RT = 'Business Context' | 'Category Definition' | 'Correction Example';
const META: Record<string, { icon: typeof Brain; tone: string; hint: string }> = {
  'Business Context': { icon: Building2, tone: 'bg-info-soft text-info', hint: 'e.g. "We are a D2C apparel brand. Late delivery is our #1 churn driver — treat it as urgent."' },
  'Category Definition': { icon: Tags, tone: 'bg-positive-soft text-positive', hint: 'e.g. "Checkout & Payments: card failures, promo codes, double charges"' },
  'Correction Example': { icon: PencilLine, tone: 'bg-warning-soft text-warning', hint: 'Created automatically when you correct an AI analysis.' },
};

function RuleRow({ rule, onToggle, onDelete }: { rule: Rule; onToggle: () => void; onDelete: () => void }) {
  const m = META[rule.ruleType] ?? META['Business Context'];
  return (
    <div className="flex items-start gap-3 border-t py-3 first:border-t-0">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.tone}`}><m.icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-muted-foreground">{rule.ruleType}</div><p className={`text-sm ${rule.active ? '' : 'text-muted-foreground line-through'}`}>{rule.rule}</p></div>
      <Switch checked={rule.active} onCheckedChange={onToggle} />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

export default function AdaptionPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [text, setText] = useState('');
  const [type, setType] = useState<RT>('Business Context');
  const [saving, setSaving] = useState(false);

  useEffect(() => { manageRules({ action: 'list' }).then((r) => setRules(r.rules)).catch(() => toast.error('Could not load rules')); }, []);

  const add = async () => {
    setSaving(true);
    try { const r = await manageRules({ action: 'create', rule: text.trim(), ruleType: type }); setRules(r.rules); setText(''); toast.success('The AI will use this from now on'); }
    catch { toast.error('Could not save rule'); }
    setSaving(false);
  };
  const toggle = (r: Rule) => {
    setRules((p) => p?.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)) ?? null);
    manageRules({ action: 'toggle', id: r.id, active: !r.active }).catch(() => toast.error('Update failed'));
  };
  const remove = (r: Rule) => {
    setRules((p) => p?.filter((x) => x.id !== r.id) ?? null);
    manageRules({ action: 'delete', id: r.id }).catch(() => toast.error('Delete failed'));
  };
  const count = (t: string) => (rules ?? []).filter((r) => r.ruleType === t && r.active).length;

  return (
    <div>
      <PageHeader title="Adaption" subtitle="InsightFlow's AI adapts to your business — it learns your context, your categories, and every correction you make." />
      <div className="mb-6 grid gap-3 rounded-2xl bg-sidebar p-5 text-sm text-sidebar-foreground sm:grid-cols-4 sm:items-center">
        {[['1. AI analyzes', 'sentiment, category, urgency'], ['2. You correct', 'any wrong call in Feedback'], ['3. It learns', 'corrections become rules'], ['4. It adapts', 'every future analysis, issue & report']].map(([a, b], i) => (
          <div key={a} className="flex items-center gap-2"><div><div className="font-bold text-white">{a}</div><div className="text-xs">{b}</div></div>{i < 3 && <ArrowRight className="ml-auto hidden h-4 w-4 text-sidebar-primary sm:block" />}</div>
        ))}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Object.entries(META).map(([k, m]) => (
          <Card key={k}><CardContent className="flex items-center gap-3 p-4"><div className={`grid h-10 w-10 place-items-center rounded-xl ${m.tone}`}><m.icon className="h-5 w-5" /></div><div><div className="text-2xl font-extrabold">{count(k)}</div><div className="text-xs text-muted-foreground">active {k.toLowerCase()}s</div></div></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Teach the AI</CardTitle><CardDescription>Add context or define the categories your team uses.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as RT)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Business Context">Business Context</SelectItem><SelectItem value="Category Definition">Category Definition</SelectItem></SelectContent></Select>
            <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={META[type].hint} />
            <Button className="w-full" onClick={add} disabled={saving || text.trim().length < 5}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add rule</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">What the AI has learned</CardTitle><CardDescription>Toggle off any rule to stop using it.</CardDescription></CardHeader>
          <CardContent>
            {!rules ? <Skeleton className="h-40" /> : rules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No rules yet. Add business context, or correct an analysis on the Feedback page.</p>
              : rules.map((r) => <RuleRow key={r.id} rule={r} onToggle={() => toggle(r)} onDelete={() => remove(r)} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
