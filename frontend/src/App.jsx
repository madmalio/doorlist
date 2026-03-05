import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { JobsView } from './components/jobs/JobsView';
import { JobDetailView } from './components/jobs/JobDetailView';
import { CatalogView } from './components/catalog/CatalogView';
import { SettingsView } from './components/settings/SettingsView';

function App() {
  const [activeView, setActiveView] = useState('jobs');
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [jobSearchRequest, setJobSearchRequest] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

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

    if (activeView === 'settings') {
      return <SettingsView />;
    }

    if (activeView === 'catalog') {
      return <CatalogView />;
    }

    return null;
  };

  return (
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
  );
}

export default App;
