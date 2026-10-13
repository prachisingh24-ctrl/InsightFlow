import { useState } from 'react';
import { loginWithRedirect } from 'zitejs/auth';
import { listFeedback, createFeedback, analyzeFeedback, generateRecommendations, listIssues } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Waves, Sparkles, BarChart3, Brain, FileText, Loader2, ArrowRight, LogIn, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildSampleData } from '../lib/sampleData';

const FEATURES = [
  { icon: Sparkles, title: 'AI analysis', text: 'Sentiment, topics, complaints and urgency for every comment.' },
  { icon: BarChart3, title: 'Live dashboard', text: 'Trends, distribution and top complaints at a glance.' },
  { icon: Brain, title: 'Adaption', text: 'Learns your business from every correction you make.' },
  { icon: FileText, title: 'Shareable reports', text: 'Executive-ready summaries with prioritized actions.' },
];
const STEPS = ['Loading sample feedback', 'AI is analyzing sentiment & topics', 'Ranking issues & recommendations', 'Opening your dashboard'];

export default function LandingPage({ onDemo }: { onDemo: () => void }) {
  const [step, setStep] = useState(-1);

  const startDemo = async () => {
    try {
      setStep(0);
      const { feedback } = await listFeedback({});
      if (feedback.filter((f) => f.analyzed).length < 10) await createFeedback({ items: buildSampleData() });
      setStep(1);
      let remaining = 1;
      try {
        while (remaining > 0) { const r = await analyzeFeedback({ limit: 40 }); remaining = r.analyzed ? r.remaining : 0; }
      } catch { /* AI unavailable — sample data is already analyzed */ }
      setStep(2);
      const { issues } = await listIssues({});
      if (issues.length === 0) await generateRecommendations({});
      setStep(3);
      onDemo();
    } catch {
      toast.error('Demo setup hit a snag — opening anyway');
      onDemo();
    }
  };

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Waves className="h-5 w-5" /></div>
          <span className="text-lg font-bold text-white">InsightFlow</span>
        </div>
        <Button variant="ghost" className="text-white hover:bg-sidebar-accent hover:text-white" onClick={() => loginWithRedirect()}><LogIn className="mr-2 h-4 w-4" />Sign in</Button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-3 py-1 text-xs font-semibold text-sidebar-primary"><Brain className="h-3.5 w-3.5" />Adaptive feedback intelligence</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">Turn customer feedback into <span className="text-sidebar-primary">decisions</span>.</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed">InsightFlow reads every review, survey and support message, finds what matters most, and tells your team exactly what to fix next — getting smarter with every correction.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90" onClick={startDemo} disabled={step >= 0}>
              {step >= 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Try the live demo
            </Button>
            <Button size="lg" variant="outline" className="border-sidebar-border bg-transparent text-white hover:bg-sidebar-accent hover:text-white" onClick={() => loginWithRedirect()}>
              Sign in with email<ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs">Demo needs no account — it loads sample data and runs the full AI workflow.</p>
        </div>

        {step >= 0 ? (
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent p-6">
            <h3 className="mb-4 font-bold text-white">Setting up your demo workspace…</h3>
            <ol className="space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  {i < step ? <CheckCircle2 className="h-5 w-5 text-sidebar-primary" /> : i === step ? <Loader2 className="h-5 w-5 animate-spin text-highlight" /> : <span className="h-5 w-5 rounded-full border border-sidebar-border" />}
                  <span className={i <= step ? 'text-white' : ''}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-sidebar-border bg-sidebar-accent p-5">
                <f.icon className="h-5 w-5 text-sidebar-primary" />
                <h3 className="mt-3 font-bold text-white">{f.title}</h3>
                <p className="mt-1 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-sidebar-primary">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {['Collect', 'Analyze', 'Visualize', 'Prioritize', 'Adapt'].map((s, i) => (
            <div key={s} className="rounded-xl border border-sidebar-border p-4"><div className="text-xs">Step {i + 1}</div><div className="font-bold text-white">{s}</div></div>
          ))}
        </div>
      </section>
    </div>
  );
}
