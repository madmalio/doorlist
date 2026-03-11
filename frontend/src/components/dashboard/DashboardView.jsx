import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { GetOverlayCategories, LoadDoorStyles, LoadJobs } from '../../../wailsjs/go/main/App';
import { Card, CardContent, CardHeader } from '../ui/Card';

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function getProductionStatusBadge(value) {
  const normalized = String(value || 'draft').toLowerCase();
  if (normalized === 'in production') {
    return {
      label: 'In Production',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
  }
  if (normalized === 'in finishing') {
    return {
      label: 'In Finishing',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };
  }
  if (normalized === 'complete') {
    return {
      label: 'Complete',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    };
  }

  return {
    label: 'Draft',
    className: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  };
}

export function DashboardView({ onOpenJob }) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [jobsCount, setJobsCount] = useState(0);
  const [doorFamiliesCount, setDoorFamiliesCount] = useState(0);
  const [doorStyles, setDoorStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [jobsResponse, stylesResponse, overlayCategoriesResponse] = await Promise.all([
          LoadJobs(),
          LoadDoorStyles(),
          GetOverlayCategories(),
        ]);

        if (cancelled) {
          return;
        }

        const jobs = Array.isArray(jobsResponse) ? jobsResponse : [];
        const styles = Array.isArray(stylesResponse) ? stylesResponse : [];
        const uniqueFamilies = new Set(
          styles
            .map((style) => {
              const family = String(style?.family || '').trim();
              const fallbackName = String(style?.name || '').trim();
              return family || fallbackName;
            })
            .filter(Boolean)
            .map((value) => value.toLowerCase()),
        );
        const sortedJobs = [...jobs].sort((left, right) => new Date(right.createdDate).getTime() - new Date(left.createdDate).getTime());

        setJobsCount(jobs.length);
        setDoorFamiliesCount(uniqueFamilies.size);
        setDoorStyles(styles);
        setOverlayCategories(Array.isArray(overlayCategoriesResponse) ? overlayCategoriesResponse : []);
        setRecentJobs(sortedJobs.slice(0, 5));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage('Unable to load dashboard data right now.');
          setJobsCount(0);
          setDoorFamiliesCount(0);
          setDoorStyles([]);
          setOverlayCategories([]);
          setRecentJobs([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const mostRecentDate = useMemo(() => formatDate(recentJobs[0]?.createdDate), [recentJobs]);
  const styleNameById = useMemo(() => {
    const map = new Map();
    doorStyles.forEach((style) => {
      if (!style?.id) {
        return;
      }
      map.set(style.id, (style.name || '').trim() || 'N/A');
    });
    return map;
  }, [doorStyles]);

  const overlayNameById = useMemo(() => {
    const map = new Map();
    overlayCategories.forEach((category) => {
      if (!category?.id) {
        return;
      }
      map.set(category.id, category.name || 'Unnamed Overlay');
    });
    return map;
  }, [overlayCategories]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Your quick snapshot of jobs and catalog data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total Jobs</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{isLoading ? '...' : jobsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Doors</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{isLoading ? '...' : doorFamiliesCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Most Recent Job</p>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Clock3 size={16} className="text-zinc-500 dark:text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{isLoading ? 'Loading...' : mostRecentDate}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Jobs</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading recent jobs...</p> : null}
          {!isLoading && errorMessage ? <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p> : null}
          {!isLoading && !errorMessage && recentJobs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No jobs yet. Create your first job to get started.</p>
          ) : null}
          {!isLoading && !errorMessage && recentJobs.length > 0 ? (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                (() => {
                  const status = getProductionStatusBadge(job.productionStatus);
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onOpenJob(job.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{job.customerName || 'Customer: N/A'}</span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {job.name || 'Untitled Job'} | <span className="font-semibold text-zinc-700 dark:text-zinc-300">{job.woodChoice || 'N/A'}</span> | {styleNameById.get(job.defaultStyleId) || 'N/A'} | Overlay:{' '}
                          {overlayNameById.get(job.defaultOverlayCategoryId) || 'N/A'}
                        </span>
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(job.createdDate)}</span>
                    </button>
                  );
                })()
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
