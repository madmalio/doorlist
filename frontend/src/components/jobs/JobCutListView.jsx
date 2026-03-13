import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { GenerateCutList, GetJob, LoadDoorStyles } from "../../../wailsjs/go/main/App";
import { printCutList } from "../../lib/cutListPrint";
import { getStyleDisplayName } from "../../lib/styleCatalog";
import { formatLengthDisplay } from "../../lib/units";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { useMeasurement } from "../ui/MeasurementProvider";
import { useToast } from "../ui/Toast";
import { useLicense } from "../ui/LicenseProvider";

function formatSlabUse(value) {
  return value === "drawer-front" ? "Drawer Front" : "Door";
}

function formatDrawerFrontPosition(value) {
  if (value === "middle") {
    return "Middle";
  }
  if (value === "bottom") {
    return "Bottom";
  }
  return "Top";
}

function formatSlabGrain(value) {
  if (value === "vertical") {
    return "Vertical";
  }
  if (value === "horizontal") {
    return "Horizontal";
  }
  return "MDF";
}

function getGrainDisplay(item) {
  if (item.part !== "Slab") {
    return "-";
  }
  return formatSlabGrain(item.slabGrain);
}

function getCutPartDisplay(item) {
  if (item.part !== "Slab") {
    return item.part;
  }

  const suffix = item.slabUse === "drawer-front" ? ` - ${formatDrawerFrontPosition(item.drawerFrontPosition)}` : "";
  return `${formatSlabUse(item.slabUse)}${suffix}`;
}

export function JobCutListView({ jobId, onBack, onRequireLicense }) {
  const { measurementSystem } = useMeasurement();
  const [job, setJob] = useState(null);
  const [doorStyles, setDoorStyles] = useState([]);
  const [cutList, setCutList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCutList, setIsLoadingCutList] = useState(false);
  const { showToast } = useToast();
  const { can, capabilityKeys, getCapabilityMessage } = useLicense();
  const canGenerate = can(capabilityKeys.generate);
  const canPrint = can(capabilityKeys.print);
  const requireCapability = (capability) => {
    if (can(capability)) {
      return true;
    }
    showToast(`${getCapabilityMessage(capability)} Opening License settings...`, "error");
    onRequireLicense?.();
    return false;
  };

  const styleById = useMemo(() => {
    const map = new Map();
    for (const style of doorStyles || []) {
      map.set(style.id, style);
    }
    return map;
  }, [doorStyles]);

  const selectedFrameName = useMemo(() => {
    const style = styleById.get(job?.defaultStyleId);
    return style ? getStyleDisplayName(style) : "N/A";
  }, [styleById, job?.defaultStyleId]);

  const frameItems = useMemo(
    () =>
      (cutList?.items || []).filter(
        (item) => item.part === "Stile" || item.part === "Rail",
      ),
    [cutList],
  );
  const panelItems = useMemo(
    () => (cutList?.items || []).filter((item) => item.part === "Panel"),
    [cutList],
  );
  const slabItems = useMemo(
    () => (cutList?.items || []).filter((item) => item.part === "Slab"),
    [cutList],
  );

  const getThicknessLabel = (items) => {
    if (!items.length) {
      return "";
    }
    const values = Array.from(
      new Set(items.map((item) => item.thicknessFormatted || "").filter(Boolean)),
    );
    return values.map((value) => formatLengthDisplay(value, measurementSystem)).join(", ");
  };

  const frameThicknessLabel = useMemo(() => getThicknessLabel(frameItems), [frameItems, measurementSystem]);
  const slabThicknessLabel = useMemo(() => getThicknessLabel(slabItems), [slabItems, measurementSystem]);
  const panelThicknessLabel = useMemo(() => getThicknessLabel(panelItems), [panelItems, measurementSystem]);
  const frameLengthLabel = useMemo(() => {
    if (!frameItems.length) {
      return "";
    }
    const totalFeet = frameItems.reduce((sum, item) => {
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + (length * qty) / 12;
    }, 0);
    if (measurementSystem === "metric") {
      return `Total Length: ${(totalFeet * 0.3048).toFixed(2)} m`;
    }
    return `Linear Feet: ${totalFeet.toFixed(2)}`;
  }, [frameItems, measurementSystem]);
  const panelAreaLabel = useMemo(() => {
    if (!panelItems.length) {
      return "";
    }
    const totalSquareFeet = panelItems.reduce((sum, item) => {
      const width = Number(item.width) || 0;
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + ((width * length) / 144) * qty;
    }, 0);
    if (measurementSystem === "metric") {
      return `Total Area: ${(totalSquareFeet * 0.092903).toFixed(2)} m^2`;
    }
    return `Square Feet: ${totalSquareFeet.toFixed(2)}`;
  }, [panelItems, measurementSystem]);
  const slabAreaLabel = useMemo(() => {
    if (!slabItems.length) {
      return "";
    }
    const totalSquareFeet = slabItems.reduce((sum, item) => {
      const width = Number(item.width) || 0;
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + ((width * length) / 144) * qty;
    }, 0);
    if (measurementSystem === "metric") {
      return `Total Area: ${(totalSquareFeet * 0.092903).toFixed(2)} m^2`;
    }
    return `Square Feet: ${totalSquareFeet.toFixed(2)}`;
  }, [slabItems, measurementSystem]);

  const printSections = useMemo(
    () =>
      [
        { id: "frame", title: "Stiles & Rails", items: frameItems },
        { id: "slab", title: "Slabs", items: slabItems },
        { id: "panel", title: "Panels", items: panelItems },
      ].filter((section) => section.items.length > 0),
    [frameItems, slabItems, panelItems],
  );

  const loadBase = async () => {
    setIsLoading(true);
    try {
      const [jobData, styles] = await Promise.all([GetJob(jobId), LoadDoorStyles()]);
      setJob(jobData || null);
      setDoorStyles(styles || []);
      return jobData || null;
    } catch (error) {
      showToast("Failed to load job details", "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadCutList = async () => {
    if (!canGenerate) {
      setCutList(null);
      return;
    }
    setIsLoadingCutList(true);
    try {
      const response = await GenerateCutList(jobId);
      setCutList(response || null);
    } catch (error) {
      setCutList(null);
      showToast("Unable to generate cut list for this job", "error");
    } finally {
      setIsLoadingCutList(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadBase();
      await loadCutList();
    };
    void run();
  }, [jobId, canGenerate]);

  const handlePrint = async () => {
    if (!requireCapability(capabilityKeys.generate)) {
      return;
    }
    if (!requireCapability(capabilityKeys.print)) {
      return;
    }
    const openingCount = Array.isArray(job?.doors)
      ? job.doors.reduce((sum, door) => {
          const qty = Number(door?.qty) || 0;
          return sum + (qty > 0 ? qty : 0);
        }, 0)
      : 0;

    const printed = await printCutList({
      customerName: job?.customerName,
      jobName: job?.name,
      woodChoice: job?.woodChoice,
      frameName: selectedFrameName,
      items: cutList?.items || [],
      openingCount,
      measurementSystem,
    });
    if (!printed) {
      showToast("No printable cut list sections found", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        Loading cut list...
      </div>
    );
  }

  if (!job) {
    return <div className="text-zinc-500 dark:text-zinc-400">Job not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Job
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Cut List</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {job.customerName} · {job.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void handlePrint()} disabled={isLoadingCutList}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cut List</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selectedFrameName}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{job.woodChoice || "None"}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingCutList ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating cut list...</p>
          ) : !canGenerate ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{getCapabilityMessage(capabilityKeys.generate)}</p>
          ) : !cutList || !cutList.items || cutList.items.length === 0 || printSections.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No cut list parts yet. Add doors and save to generate.</p>
          ) : (
            <>
              {printSections.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{section.title}</h4>
                    <div className="flex items-center gap-4">
                      {section.id === "frame" && frameThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {frameThicknessLabel}</span> : null}
                      {section.id === "slab" && slabThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {slabThicknessLabel}</span> : null}
                      {section.id === "panel" && panelThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {panelThicknessLabel}</span> : null}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <colgroup>
                          {section.id === "slab" ? (
                            <>
                              <col className="w-[24%]" />
                              <col className="w-[16%]" />
                              <col className="w-[12%]" />
                              <col className="w-[22%]" />
                              <col className="w-[26%]" />
                            </>
                          ) : (
                            <>
                              <col className="w-[20%]" />
                              <col className="w-[16%]" />
                              <col className="w-[26%]" />
                              <col className="w-[38%]" />
                            </>
                          )}
                        </colgroup>
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Part</th>
                            {section.id === "slab" ? <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Grain</th> : null}
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Qty</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Width</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Length</th>
                        </tr>
                      </thead>
                      <tbody>
                          {section.items.map((item, index) => (
                            <tr key={`${item.part}-${item.label}-${index}`} className="border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                              <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{getCutPartDisplay(item)}</td>
                              {section.id === "slab" ? <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{getGrainDisplay(item)}</td> : null}
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{item.qty}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatLengthDisplay(item.widthFormatted || "-", measurementSystem)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatLengthDisplay(item.lengthFormatted, measurementSystem)}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {section.id === "frame" && frameLengthLabel ? (
                    <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {frameLengthLabel}
                    </div>
                  ) : null}
                  {section.id === "panel" && panelAreaLabel ? (
                    <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {panelAreaLabel}
                    </div>
                  ) : null}
                  {section.id === "slab" && slabAreaLabel ? (
                    <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {slabAreaLabel}
                    </div>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
