import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from 'zitejs/auth';
import { Toaster } from '@project/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import InsightsPage from './pages/InsightsPage';
import ReportsPage from './pages/ReportsPage';
import AdaptionPage from './pages/AdaptionPage';
import AlertsPage from './pages/AlertsPage';
import SharedReportPage from './pages/SharedReportPage';
import LandingPage from './pages/LandingPage';

export default function App() {
  const { user, isLoading } = useAuth();
  const [demo, setDemo] = useState(() => localStorage.getItem('if-demo') === '1');
  const enterDemo = () => { localStorage.setItem('if-demo', '1'); setDemo(true); };
  const exitDemo = () => { localStorage.removeItem('if-demo'); setDemo(false); };
  const signedIn = !!user || demo;

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/share/:id" element={<SharedReportPage />} />
        {isLoading ? (
          <Route path="*" element={<div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>} />
        ) : !signedIn ? (
          <Route path="*" element={<LandingPage onDemo={enterDemo} />} />
        ) : (
          <Route element={<Layout demo={demo && !user} onExitDemo={exitDemo} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:id" element={<ReportsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/adaption" element={<AdaptionPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
