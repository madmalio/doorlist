import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import {
  CreateJob,
  DeleteJob,
  GenerateCutList,
  GetSettings,
  GetJobsPage,
  GetOverlayCategories,
  LoadDoorStyles,
  SaveJob,
  UpdateJob,
} from "../../../wailsjs/go/main/App";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { useMeasurement } from "../ui/MeasurementProvider";
import { printCutList } from "../../lib/cutListPrint";
import { JobForm } from "./JobForm";

const productionStatusOptions = [
  {
    value: "draft",
    label: "Draft",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  {
    value: "in production",
    label: "In Production",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    value: "in finishing",
    label: "In Finishing",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    value: "complete",
    label: "Complete",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
];

function getJobStatus(job) {
  const normalized = String(job?.productionStatus || "draft").toLowerCase();
  return (
    productionStatusOptions.find((option) => option.value === normalized) ||
    productionStatusOptions[0]
  );
}

export function JobsView({ searchRequest, onSearchRequestHandled, onOpenJob, onOpenOverlayPresets, openCreateIntent = 0 }) {
  const lastHandledCreateIntentRef = useRef(0);
  const { measurementSystem } = useMeasurement();
  const [jobs, setJobs] = useState([]);
  const [doorStyles, setDoorStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [woodPresets, setWoodPresets] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isPrintingJobId, setIsPrintingJobId] = useState(null);
  const [openStatusMenuJobId, setOpenStatusMenuJobId] = useState(null);
  const [statusMenuPosition, setStatusMenuPosition] = useState({ top: 0, left: 0 });
  const [isUpdatingStatusJobId, setIsUpdatingStatusJobId] = useState(null);
  const [doorStylesLoaded, setDoorStylesLoaded] = useState(false);
  const [pendingCreateFromIntent, setPendingCreateFromIntent] = useState(false);
  const { showToast } = useToast();
  const styleNameById = useMemo(() => {
    const map = new Map();
    (doorStyles || []).forEach((style) => {
      if (!style?.id) {
        return;
      }
      map.set(style.id, style.name || "N/A");
    });
    return map;
  }, [doorStyles]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const fetchDoorStyles = async () => {
      try {
        const styles = await LoadDoorStyles();
        setDoorStyles(styles || []);
      } catch (error) {
        showToast("Failed to load door styles", "error");
      } finally {
        setDoorStylesLoaded(true);
      }
    };

    void fetchDoorStyles();

    const fetchOverlayCategories = async () => {
      try {
        const categories = await GetOverlayCategories();
        setOverlayCategories(categories || []);
      } catch (error) {
        showToast("Failed to load overlay categories", "error");
      }
    };

    void fetchOverlayCategories();

    const fetchSettings = async () => {
      try {
        const settings = await GetSettings();
        setWoodPresets(Array.isArray(settings?.woodPresets) ? settings.woodPresets : []);
      } catch (error) {
        showToast("Failed to load app settings", "error");
      }
    };

    void fetchSettings();
  }, [showToast]);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const response = await GetJobsPage({ page, pageSize, search });
        setJobs(response?.items || []);
        setTotal(response?.total || 0);
      } catch (error) {
        showToast("Failed to load jobs", "error");
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

    setSearch(searchRequest.query || "");
    setPage(1);
    if (onSearchRequestHandled) {
      onSearchRequestHandled();
    }
  }, [searchRequest, onSearchRequestHandled]);

  useEffect(() => {
    if (!openCreateIntent || openCreateIntent === lastHandledCreateIntentRef.current) {
      return;
    }
    lastHandledCreateIntentRef.current = openCreateIntent;
    setPendingCreateFromIntent(true);
  }, [openCreateIntent]);

  useEffect(() => {
    if (!pendingCreateFromIntent || !doorStylesLoaded) {
      return;
    }

    if (doorStyles.length === 0) {
      showToast("Create a catalog door style first", "error");
    } else {
      setEditingJob(null);
      setIsModalOpen(true);
    }

    setPendingCreateFromIntent(false);
  }, [pendingCreateFromIntent, doorStylesLoaded, doorStyles, showToast]);

  const openCreate = () => {
    if (doorStyles.length === 0) {
      showToast("Create a catalog door style first", "error");
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
        showToast("Job updated", "success");
        await reload();
        closeModal();
      } else {
        const createdJob = await CreateJob(payload);
        showToast("Job created", "success");
        closeModal();
        if (createdJob?.id) {
          onOpenJob(createdJob.id);
        } else {
          await reload();
        }
      }
    } catch (error) {
      showToast("Failed to save job", "error");
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
      showToast("Job deleted", "success");
      await reload();
      closeDeleteModal();
    } catch (error) {
      showToast("Failed to delete job", "error");
    }
  };

  useEffect(() => {
    if (!openStatusMenuJobId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (event.target.closest('[data-status-menu-root="true"]')) {
        return;
      }
      if (event.target.closest('[data-status-menu-popup="true"]')) {
        return;
      }
      setOpenStatusMenuJobId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openStatusMenuJobId]);

  useEffect(() => {
    if (!openStatusMenuJobId) {
      return undefined;
    }

    const handleViewportChange = () => {
      setOpenStatusMenuJobId(null);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openStatusMenuJobId]);

  const statusMenuJob = useMemo(
    () => jobs.find((job) => job.id === openStatusMenuJobId) || null,
    [jobs, openStatusMenuJobId],
  );

  const handleQuickPrint = async (job) => {
    if (!job?.id || isPrintingJobId) {
      return;
    }

    setIsPrintingJobId(job.id);
    try {
      const cutList = await GenerateCutList(job.id);
      const items = Array.isArray(cutList?.items) ? cutList.items : [];
      const openingCount = Array.isArray(job?.doors)
        ? job.doors.reduce((sum, door) => {
            const qty = Number(door?.qty) || 0;
            return sum + (qty > 0 ? qty : 0);
          }, 0)
        : 0;
      const printed = await printCutList({
        customerName: job.customerName,
        jobName: job.name,
        woodChoice: job.woodChoice,
        frameName: styleNameById.get(job.defaultStyleId) || "N/A",
        items,
        openingCount,
        measurementSystem,
      });
      if (!printed) {
        showToast("No printable cut list sections found", "error");
      }
    } catch (error) {
      showToast("Unable to generate cut list for this job", "error");
    } finally {
      setIsPrintingJobId(null);
    }
  };

  const handleStatusUpdate = async (job, nextStatus) => {
    if (!job?.id || isUpdatingStatusJobId) {
      return;
    }

    const currentStatus = String(job.productionStatus || "draft").toLowerCase();
    if (currentStatus === nextStatus) {
      setOpenStatusMenuJobId(null);
      return;
    }

    setIsUpdatingStatusJobId(job.id);
    try {
      const updated = await SaveJob({ ...job, productionStatus: nextStatus });
      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                productionStatus: updated?.productionStatus || nextStatus,
              }
            : item,
        ),
      );
      showToast("Status updated", "success");
    } catch (error) {
      showToast("Failed to update status", "error");
    } finally {
      setIsUpdatingStatusJobId(null);
      setOpenStatusMenuJobId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        Loading jobs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 1.6cm; }
        }
      `}</style>
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Jobs
        </h2>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Job
        </Button>
      </div>

      <Input
        className="print:hidden"
        placeholder="Search jobs by customer or project"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            {search.trim()
              ? "No jobs match your search."
              : "No jobs yet. Add your first job to get started."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Job List
            </h3>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) =>
                  (() => {
                    const status = getJobStatus(job);
                    return (
                      <tr
                        key={job.id}
                        className="cursor-pointer border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                        onClick={() => onOpenJob(job.id)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {job.customerName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="block">{job.name}</span>
                          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{styleNameById.get(job.defaultStyleId) || "N/A"}</span>
                          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{job.woodChoice || 'N/A'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div
                            data-status-menu-root="true"
                            className="relative inline-flex"
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const nextOpen = openStatusMenuJobId !== job.id;
                                if (!nextOpen) {
                                  setOpenStatusMenuJobId(null);
                                  return;
                                }

                                const rect = event.currentTarget.getBoundingClientRect();
                                const menuHeight = 180;
                                const openUpward = rect.bottom + menuHeight > window.innerHeight;
                                setStatusMenuPosition({
                                  left: Math.max(8, rect.left),
                                  top: openUpward ? Math.max(8, rect.top - menuHeight - 8) : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 8),
                                });
                                setOpenStatusMenuJobId(job.id);
                              }}
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
                              disabled={isUpdatingStatusJobId === job.id}
                            >
                              {isUpdatingStatusJobId === job.id
                                ? "Updating..."
                                : status.label}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                          {new Date(job.createdDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleQuickPrint(job);
                              }}
                              title="Print cut list"
                              disabled={Boolean(isPrintingJobId)}
                            >
                              <Printer
                                size={14}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(job);
                              }}
                              title="Edit job"
                            >
                              <Pencil
                                size={14}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
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
                    );
                  })(),
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 print:hidden">
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Rows
              </label>
              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(parseInt(event.target.value, 10) || 10)
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, total)} of {total}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingJob ? "Edit Job" : "Create Job"}
        maxWidthClass="max-w-4xl"
      >
        <JobForm
          job={editingJob}
          doorStyles={doorStyles}
          overlayCategories={overlayCategories}
          woodPresets={woodPresets}
          onOpenOverlayPresets={() => {
            closeModal();
            onOpenOverlayPresets?.();
          }}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete${jobToDelete ? ` "${jobToDelete.name}"` : " this job"}?`}
        warning="This action permanently removes the job and its door entries."
        confirmLabel="Delete Job"
      />

      {openStatusMenuJobId && statusMenuJob
        ? createPortal(
            <div
              data-status-menu-popup="true"
              className="fixed z-[200] w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              style={{ left: statusMenuPosition.left, top: statusMenuPosition.top }}
            >
              {productionStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void handleStatusUpdate(statusMenuJob, option.value);
                  }}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${option.className.split(" ")[0]}`} />
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
