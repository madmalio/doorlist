import { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { JobsView } from './components/jobs/JobsView';
import { JobDetailView } from './components/jobs/JobDetailView';
import { JobCutListView } from './components/jobs/JobCutListView';
import { QuickDoorView } from './components/quickdoor/QuickDoorView';
import { CatalogView } from './components/catalog/CatalogView';
import { SettingsView } from './components/settings/SettingsView';
import { DashboardView } from './components/dashboard/DashboardView';
import { useTheme } from './components/ui/ThemeProvider';
import { WelcomeModal } from './components/onboarding/WelcomeModal';
import { GetJobsPage, GetOverlayCategories, GetSettings, UpdateSettings } from '../wailsjs/go/main/App';

function hasValidOverlayDefaults(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return false;
  }

  return categories.some((category) => {
    const defaults = category?.default;
    if (!defaults) {
      return false;
    }
    return [defaults.left, defaults.right, defaults.top, defaults.bottom].every((value) => Number.isFinite(Number(value)));
  });
}

function App() {
  const { isReady: isThemeReady } = useTheme();
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [isBootFading, setIsBootFading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [jobSearchRequest, setJobSearchRequest] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [settingsInitialSection, setSettingsInitialSection] = useState('theme');
  const [overlaySetupIntent, setOverlaySetupIntent] = useState(0);
  const [createJobIntent, setCreateJobIntent] = useState(0);
  const [isQuickDoorOpen, setIsQuickDoorOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [hasJobs, setHasJobs] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [overlayDefaultsComplete, setOverlayDefaultsComplete] = useState(false);

  const handleMeasurementConfirmed = () => {
    setMeasurementComplete(true);
  };

  const handleOverlayDefaultsSaved = (categories) => {
    setOverlayDefaultsComplete(hasValidOverlayDefaults(categories || []));
  };

  const handleSetupCompleted = (createJob = false) => {
    setMeasurementComplete(true);
    setOverlayDefaultsComplete(true);
    setOnboardingDismissed(true);
    setIsWelcomeOpen(false);
    if (createJob) {
      setActiveView('jobs');
      setSelectedJobId(null);
      setCreateJobIntent((prev) => prev + 1);
    }
  };

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

  const refreshOnboardingState = async ({ syncVisibility = false } = {}) => {
    const [settingsResult, categoriesResult, jobsResult] = await Promise.allSettled([
      GetSettings(),
      GetOverlayCategories(),
      GetJobsPage({ page: 1, pageSize: 1, search: '' }),
    ]);

    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
    const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
    const jobsPage = jobsResult.status === 'fulfilled' ? jobsResult.value : null;

    const dismissed = Boolean(settings?.onboardingDismissed);
    const measurementReady = Boolean(settings?.measurementConfirmed);
    const overlayReady = hasValidOverlayDefaults(categories || []);
    const hasAnyJobs = Number(jobsPage?.total || 0) > 0;

    setOnboardingDismissed(dismissed);
    setMeasurementComplete(measurementReady);
    setOverlayDefaultsComplete(overlayReady);
    setHasJobs(hasAnyJobs);
    if (syncVisibility) {
      setIsWelcomeOpen(!dismissed && !hasAnyJobs && (!overlayReady || !measurementReady));
    }
  };

  useEffect(() => {
    void refreshOnboardingState({ syncVisibility: true });
  }, []);

  useEffect(() => {
    if (activeView === 'settings' || activeView === 'jobs' || activeView === 'dashboard') {
      void refreshOnboardingState({ syncVisibility: false });
    }
  }, [activeView]);

  const handleViewChange = (view) => {
    if (view === 'quick-door') {
      setIsQuickDoorOpen(true);
      return;
    }
    setActiveView(view);
    if (view !== 'job-detail' && view !== 'job-cutlist') {
      setSelectedJobId(null);
    }
    if (view !== 'settings') {
      setSettingsInitialSection('theme');
    }
  };

  const handleOpenOverlayPresets = () => {
    setIsWelcomeOpen(false);
    setSettingsInitialSection('overlay-presets');
    setOverlaySetupIntent((prev) => prev + 1);
    setActiveView('settings');
    setSelectedJobId(null);
  };

  const handleDismissWelcome = async () => {
    try {
      await UpdateSettings({ onboardingDismissed: true });
      setOnboardingDismissed(true);
    } catch {
      // Keep modal closable even if persistence fails.
    }
    setIsWelcomeOpen(false);
  };

  const handleOpenWelcome = async () => {
    try {
      if (onboardingDismissed) {
        await UpdateSettings({ onboardingDismissed: false });
        setOnboardingDismissed(false);
      }
    } catch {
      // Continue opening modal even if persistence fails.
    }
    await refreshOnboardingState({ syncVisibility: false });
    setIsWelcomeOpen(true);
  };

  const renderView = () => {
    if (activeView === 'job-detail' && selectedJobId) {
      return (
        <JobDetailView
          jobId={selectedJobId}
          onBack={() => handleViewChange('jobs')}
          onOpenCutList={(targetJobId) => {
            setSelectedJobId(targetJobId);
            setActiveView('job-cutlist');
          }}
        />
      );
    }

    if (activeView === 'job-cutlist' && selectedJobId) {
      return (
        <JobCutListView
          jobId={selectedJobId}
          onBack={() => setActiveView('job-detail')}
        />
      );
    }

    if (activeView === 'jobs') {
      return (
        <JobsView
          searchRequest={jobSearchRequest}
          onSearchRequestHandled={() => setJobSearchRequest(null)}
          openCreateIntent={createJobIntent}
          onOpenOverlayPresets={handleOpenOverlayPresets}
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
      return (
        <SettingsView
          initialSection={settingsInitialSection}
          overlaySetupIntent={overlaySetupIntent}
          onOpenWelcome={handleOpenWelcome}
          onMeasurementConfirmed={handleMeasurementConfirmed}
          onOverlayDefaultsSaved={handleOverlayDefaultsSaved}
        />
      );
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
          activeView={activeView === 'job-detail' || activeView === 'job-cutlist' ? 'jobs' : activeView}
          onViewChange={handleViewChange}
          onOpenSearch={() => setIsCommandBarOpen(true)}
        />
        <GlobalCommandBar
          isOpen={isCommandBarOpen}
          onOpenChange={setIsCommandBarOpen}
          activeView={activeView === 'job-detail' || activeView === 'job-cutlist' ? 'jobs' : activeView}
          onNavigate={handleViewChange}
          onOpenResult={(result) => {
            if (result.type === 'job') {
              setSelectedJobId(result.id);
              setActiveView('job-detail');
            }
          }}
        />
        <main className="flex-1 overflow-auto p-6">{renderView()}</main>
        <QuickDoorView isOpen={isQuickDoorOpen} onClose={() => setIsQuickDoorOpen(false)} />
        <WelcomeModal
          isOpen={isWelcomeOpen}
          onClose={() => void handleDismissWelcome()}
          onDismiss={() => void handleDismissWelcome()}
          onSetupCompleted={handleSetupCompleted}
          onMeasurementConfirmed={handleMeasurementConfirmed}
          onOverlayDefaultsSaved={handleOverlayDefaultsSaved}
        />
      </Layout>
    )
  );
}

export default App;
