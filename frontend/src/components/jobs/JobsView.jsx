import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CreateJob, DeleteJob, GetJobsPage, GetOverlayCategories, LoadDoorStyles, UpdateJob } from '../../../wailsjs/go/main/App';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { JobForm } from './JobForm';

export function JobsView({ searchRequest, onSearchRequestHandled, onOpenJob }) {
  const [jobs, setJobs] = useState([]);
  const [doorStyles, setDoorStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const { showToast } = useToast();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const fetchDoorStyles = async () => {
      try {
        const styles = await LoadDoorStyles();
        setDoorStyles(styles || []);
      } catch (error) {
        showToast('Failed to load door styles', 'error');
      }
    };

    void fetchDoorStyles();

    const fetchOverlayCategories = async () => {
      try {
        const categories = await GetOverlayCategories();
        setOverlayCategories(categories || []);
      } catch (error) {
        showToast('Failed to load overlay categories', 'error');
      }
    };

    void fetchOverlayCategories();
  }, [showToast]);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const response = await GetJobsPage({ page, pageSize, search });
        setJobs(response?.items || []);
        setTotal(response?.total || 0);
      } catch (error) {
        showToast('Failed to load jobs', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchJobs();
  }, [page, pageSize, search, showToast]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (!searchRequest) {
      return;
    }

    setSearch(searchRequest.query || '');
    setPage(1);
    if (onSearchRequestHandled) {
      onSearchRequestHandled();
    }
  }, [searchRequest, onSearchRequestHandled]);

  const openCreate = () => {
    if (doorStyles.length === 0) {
      showToast('Create a catalog door style first', 'error');
      return;
    }
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingJob(null);
    setIsModalOpen(false);
  };

  const reload = async () => {
    const response = await GetJobsPage({ page, pageSize, search });
    setJobs(response?.items || []);
    setTotal(response?.total || 0);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingJob) {
        await UpdateJob(editingJob.id, payload);
        showToast('Job updated', 'success');
      } else {
        await CreateJob(payload);
        showToast('Job created', 'success');
      }
      await reload();
      closeModal();
    } catch (error) {
      showToast('Failed to save job', 'error');
    }
  };

  const openDeleteModal = (job) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setJobToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!jobToDelete) {
      return;
    }

    try {
      await DeleteJob(jobToDelete.id);
      showToast('Job deleted', 'success');
      await reload();
      closeDeleteModal();
    } catch (error) {
      showToast('Failed to delete job', 'error');
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Jobs</h2>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Job
        </Button>
      </div>

      <Input
        placeholder="Search jobs by customer or project"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            {search.trim() ? 'No jobs match your search.' : 'No jobs yet. Add your first job to get started.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Job List</h3>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    onClick={() => onOpenJob(job.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{job.customerName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{job.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">{new Date(job.createdDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(job);
                          }}
                          title="Edit job"
                        >
                          <Pencil size={14} className="text-zinc-500 dark:text-zinc-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteModal(job);
                          }}
                          title="Delete job"
                        >
                          <Trash2 size={14} className="text-rose-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Rows</label>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(parseInt(event.target.value, 10) || 10)}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                Previous
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingJob ? 'Edit Job' : 'Create Job'}>
        <JobForm
          job={editingJob}
          doorStyles={doorStyles}
          overlayCategories={overlayCategories}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete${jobToDelete ? ` "${jobToDelete.name}"` : ' this job'}?`}
        warning="This action permanently removes the job and its door entries."
        confirmLabel="Delete Job"
      />
    </div>
  );
}
