import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, logout } from 'zitejs/auth';
import { LayoutDashboard, MessageSquareText, Lightbulb, FileText, Brain, Bell, Menu, X, Waves, LifeBuoy, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import RaiseConcernDialog from './RaiseConcernDialog';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
  { to: '/insights', label: 'Insights & Issues', icon: Lightbulb },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/adaption', label: 'Adaption', icon: Brain },
];

function Nav({ onNav }: { onNav?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} onClick={onNav}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
          )}>
          {({ isActive }) => (<><Icon className={cn('h-4 w-4', isActive && 'text-sidebar-primary')} />{label}</>)}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-6">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Waves className="h-5 w-5" /></div>
      <div>
        <div className="text-base font-bold text-white">InsightFlow</div>
        <div className="text-[11px] text-sidebar-foreground/70">Feedback → Decisions</div>
      </div>
    </div>
  );
}

function Footer({ demo, onExitDemo, onConcern }: { demo: boolean; onExitDemo: () => void; onConcern: () => void }) {
  const { user } = useAuth();
  const name = demo ? 'Demo User' : user?.name || user?.email || '';
  return (
    <div className="space-y-2 p-4">
      <button onClick={onConcern} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60">
        <LifeBuoy className="h-4 w-4" />Raise a concern
      </button>
      <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{name.charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{name}</div>
          <div className="truncate text-[11px]">{demo ? 'Sample data workspace' : user?.email}</div>
        </div>
        <Button size="icon" variant="ghost" title={demo ? 'Exit demo' : 'Sign out'} className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-border hover:text-white"
          onClick={() => (demo ? onExitDemo() : logout())}><LogOut className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function Layout({ demo, onExitDemo }: { demo: boolean; onExitDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const [concern, setConcern] = useState(false);
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar lg:flex">
        <Brand />
        <Nav />
        <div className="mt-auto"><Footer demo={demo} onExitDemo={onExitDemo} onConcern={() => setConcern(true)} /></div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-2 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(!open)} className="p-2 text-white">{open ? <X /> : <Menu />}</button>
      </header>
      {open && <div className="fixed inset-x-0 top-[84px] z-30 bg-sidebar pb-2 lg:hidden"><Nav onNav={() => setOpen(false)} /><Footer demo={demo} onExitDemo={onExitDemo} onConcern={() => { setOpen(false); setConcern(true); }} /></div>}
      <main className="lg:pl-64">
        {demo && (
          <div className="flex flex-wrap items-center justify-center gap-2 bg-highlight-soft px-4 py-2 text-center text-xs text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-highlight" />You're exploring the demo with sample data.
            <button onClick={onExitDemo} className="font-semibold text-highlight underline-offset-2 hover:underline">Sign in for your own workspace</button>
          </div>
        )}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"><Outlet /></div>
      </main>
      <RaiseConcernDialog open={concern} onOpenChange={setConcern} userEmail={user?.email} />
    </div>
  );
}
