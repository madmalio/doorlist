import { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { JobsView } from './components/jobs/JobsView';
import { JobDetailView } from './components/jobs/JobDetailView';
import { CatalogView } from './components/catalog/CatalogView';
import { SettingsView } from './components/settings/SettingsView';
import { DashboardView } from './components/dashboard/DashboardView';
import { useTheme } from './components/ui/ThemeProvider';

function App() {
  const { isReady: isThemeReady } = useTheme();
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [isBootFading, setIsBootFading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [jobSearchRequest, setJobSearchRequest] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    if (!isThemeReady || !showBootScreen) {
      return undefined;
    }

    const startFadeTimeout = window.setTimeout(() => {
      setIsBootFading(true);
    }, 180);

    const removeScreenTimeout = window.setTimeout(() => {
      setShowBootScreen(false);
    }, 480);

    return () => {
      window.clearTimeout(startFadeTimeout);
      window.clearTimeout(removeScreenTimeout);
    };
  }, [isThemeReady, showBootScreen]);

  const handleViewChange = (view) => {
    setActiveView(view);
    if (view !== 'job-detail') {
      setSelectedJobId(null);
    }
  };

  const renderView = () => {
    if (activeView === 'job-detail' && selectedJobId) {
      return <JobDetailView jobId={selectedJobId} onBack={() => handleViewChange('jobs')} />;
    }

    if (activeView === 'jobs') {
      return (
        <JobsView
          searchRequest={jobSearchRequest}
          onSearchRequestHandled={() => setJobSearchRequest(null)}
          onOpenJob={(jobId) => {
            setSelectedJobId(jobId);
            setActiveView('job-detail');
          }}
        />
      );
    }

    if (activeView === 'dashboard') {
      return (
        <DashboardView
          onOpenJob={(jobId) => {
            setSelectedJobId(jobId);
            setActiveView('job-detail');
          }}
        />
      );
    }

    if (activeView === 'settings') {
      return <SettingsView />;
    }

    if (activeView === 'catalog') {
      return <CatalogView />;
    }

    return null;
  };

  return (
    showBootScreen ? (
      <div
        className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200 transition-opacity duration-300 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800 ${isBootFading ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="rounded-2xl border border-zinc-200 bg-white/80 px-10 py-8 text-center shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <img
            src="/cutlogic-logo-light.png"
            alt="CutLogic logo"
            className="mx-auto mb-4 h-auto w-28 max-w-[48vw] rounded-xl object-contain sm:w-32 dark:hidden"
          />
          <img
            src="/cutlogic-logo-dark.png"
            alt="CutLogic logo"
            className="mx-auto mb-4 hidden h-auto w-28 max-w-[48vw] rounded-xl object-contain sm:w-32 dark:block"
          />
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">CutLogic</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Loading workspace...</p>
        </div>
      </div>
    ) : (
      <Layout>
        <Sidebar
          activeView={activeView === 'job-detail' ? 'jobs' : activeView}
          onViewChange={handleViewChange}
          onOpenSearch={() => setIsCommandBarOpen(true)}
        />
        <GlobalCommandBar
          isOpen={isCommandBarOpen}
          onOpenChange={setIsCommandBarOpen}
          activeView={activeView === 'job-detail' ? 'jobs' : activeView}
          onNavigate={handleViewChange}
          onOpenResult={(result) => {
            if (result.type === 'job') {
              setSelectedJobId(result.id);
              setActiveView('job-detail');
            }
          }}
        />
        <main className="flex-1 overflow-auto p-6">{renderView()}</main>
      </Layout>
    )
  );
}

export default App;
