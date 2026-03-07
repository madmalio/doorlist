import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  GenerateCutList,
  GetJob,
  GetOverlayCategories,
  LoadDoorStyles,
  SaveJob,
} from "../../../wailsjs/go/main/App";
import { formatMeasurement, parseMeasurement } from "../../lib/measurements";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import {
  findStyleById,
  getStyleDisplayName,
  getStyleFamily,
  getStyleUse,
  getStyleVariant,
  getStyleVariantLabel,
  groupStylesByFamily,
  styleMatchesOverlayType,
} from "../../lib/styleCatalog";
import { printCutList } from "../../lib/cutListPrint";

function createDoorDraft(defaultStyleId, defaultOverlay) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: "",
    qty: "1",
    opWidth: "",
    opHeight: "",
    styleId: defaultStyleId || "",
    overlayType: "door",
    overlaySubcategoryId: "",
    customOverlay: formatMeasurement(defaultOverlay ?? 0.5),
    doorType: "single",
    buttGap: "1/8",
    useCustomOverlay: false,
    overlayLeft: formatMeasurement(defaultOverlay ?? 0.5),
    overlayRight: formatMeasurement(defaultOverlay ?? 0.5),
    overlayTop: formatMeasurement(defaultOverlay ?? 0.5),
    overlayBottom: formatMeasurement(defaultOverlay ?? 0.5),
    panelLayout: "single",
    slabGrain: "mdf",
  };
}

function mapDoorToRow(door, fallbackStyleId, fallbackOverlay) {
  const resolvedOverlay = door.customOverlay ?? fallbackOverlay ?? 0.5;
  const hasStoredSides =
    door.overlayLeft !== undefined &&
    door.overlayRight !== undefined &&
    door.overlayTop !== undefined &&
    door.overlayBottom !== undefined;

  return {
    id: door.id,
    name: door.name || "",
    qty: String(door.qty || 1),
    opWidth: formatMeasurement(door.opWidth),
    opHeight: formatMeasurement(door.opHeight),
    styleId: door.styleId || fallbackStyleId || "",
    overlayType: door.overlayType === "drawer-front" ? "drawer-front" : "door",
    overlaySubcategoryId: door.overlaySubcategoryId || "",
    customOverlay: formatMeasurement(resolvedOverlay),
    doorType: door.doorType || "single",
    buttGap: formatMeasurement(door.buttGap || 0.125),
    useCustomOverlay: Boolean(door.useCustomOverlay),
    overlayLeft: formatMeasurement(
      hasStoredSides ? door.overlayLeft : resolvedOverlay,
    ),
    overlayRight: formatMeasurement(
      hasStoredSides ? door.overlayRight : resolvedOverlay,
    ),
    overlayTop: formatMeasurement(
      hasStoredSides ? door.overlayTop : resolvedOverlay,
    ),
    overlayBottom: formatMeasurement(
      hasStoredSides ? door.overlayBottom : resolvedOverlay,
    ),
    panelLayout:
      door.panelLayout === "two-panel-vertical" ||
      door.panelLayout === "two-panel-horizontal"
        ? door.panelLayout
        : "single",
    slabGrain:
      door.slabGrain === "vertical" || door.slabGrain === "horizontal"
        ? door.slabGrain
        : "mdf",
  };
}

function parseDoorRow(row) {
  const opWidth = parseMeasurement(row.opWidth);
  const opHeight = parseMeasurement(row.opHeight);
  const uniformOverlay = parseMeasurement(row.customOverlay);
  const buttGap = parseMeasurement(row.buttGap);
  const overlayLeft = parseMeasurement(row.overlayLeft);
  const overlayRight = parseMeasurement(row.overlayRight);
  const overlayTop = parseMeasurement(row.overlayTop);
  const overlayBottom = parseMeasurement(row.overlayBottom);
  const qty = parseInt(row.qty, 10) || 1;

  if (
    !row.name.trim() ||
    !row.styleId ||
    opWidth === null ||
    opHeight === null
  ) {
    return { error: "Each door needs name, style, and opening sizes" };
  }

  const hasSelectedItem = Boolean(row.overlaySubcategoryId);
  const useSideOverlays = row.useCustomOverlay || hasSelectedItem;

  if (useSideOverlays) {
    if (
      overlayLeft === null ||
      overlayRight === null ||
      overlayTop === null ||
      overlayBottom === null
    ) {
      return { error: "Custom overlays require left/right/top/bottom values" };
    }
  } else if (uniformOverlay === null) {
    return { error: "Each door needs a valid overlay value" };
  }

  if (row.doorType === "butt" && buttGap === null) {
    return { error: "Butt doors require a valid butt gap" };
  }

  return {
    door: {
      id: row.id,
      name: row.name.trim(),
      qty,
      opWidth,
      opHeight,
      styleId: row.styleId,
      overlayType: row.overlayType === "drawer-front" ? "drawer-front" : "door",
      overlaySubcategoryId: row.overlaySubcategoryId || "",
      customOverlay: useSideOverlays ? 0 : uniformOverlay,
      doorType: row.doorType,
      buttGap: row.doorType === "butt" ? buttGap : 0.125,
      useCustomOverlay: row.useCustomOverlay,
      overlayLeft: useSideOverlays ? overlayLeft : 0,
      overlayRight: useSideOverlays ? overlayRight : 0,
      overlayTop: useSideOverlays ? overlayTop : 0,
      overlayBottom: useSideOverlays ? overlayBottom : 0,
      panelLayout:
        row.panelLayout === "two-panel-vertical" ||
        row.panelLayout === "two-panel-horizontal"
          ? row.panelLayout
          : "single",
      slabGrain:
        row.slabGrain === "vertical" || row.slabGrain === "horizontal"
          ? row.slabGrain
          : "mdf",
    },
  };
}

function formatSlabUse(value) {
  return value === "drawer-front" ? "Drawer Front" : "Door";
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

function formatPanelLayout(value) {
  if (value === "two-panel-vertical") {
    return "2-Panel Vertical";
  }
  if (value === "two-panel-horizontal") {
    return "2-Panel Horizontal";
  }
  return "Single Panel";
}

function SinglePanelLayoutIcon() {
  return (
    <svg viewBox="0 0 200 300" className="h-8 w-6" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="10" width="180" height="280" />
        <rect x="50" y="50" width="100" height="200" />
        <line x1="50" y1="10" x2="50" y2="50" />
        <line x1="150" y1="10" x2="150" y2="50" />
        <line x1="50" y1="250" x2="50" y2="290" />
        <line x1="150" y1="250" x2="150" y2="290" />
      </g>
    </svg>
  );
}

function TwoPanelVerticalLayoutIcon() {
  return (
    <svg viewBox="0 0 200 300" className="h-8 w-6" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="10" width="180" height="280" />
        <rect x="50" y="50" width="100" height="80" />
        <rect x="50" y="170" width="100" height="80" />
        <line x1="50" y1="10" x2="50" y2="50" />
        <line x1="150" y1="10" x2="150" y2="50" />
        <line x1="50" y1="130" x2="50" y2="170" />
        <line x1="150" y1="130" x2="150" y2="170" />
        <line x1="50" y1="250" x2="50" y2="290" />
        <line x1="150" y1="250" x2="150" y2="290" />
      </g>
    </svg>
  );
}

function TwoPanelHorizontalLayoutIcon() {
  return (
    <svg viewBox="0 0 200 300" className="h-8 w-6" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="10" width="180" height="280" />
        <rect x="50" y="50" width="40" height="200" />
        <rect x="110" y="50" width="40" height="200" />
        <line x1="50" y1="10" x2="50" y2="50" />
        <line x1="150" y1="10" x2="150" y2="50" />
        <line x1="90" y1="50" x2="110" y2="50" />
        <line x1="90" y1="250" x2="110" y2="250" />
        <line x1="50" y1="250" x2="50" y2="290" />
        <line x1="150" y1="250" x2="150" y2="290" />
      </g>
    </svg>
  );
}

function PanelLayoutOptionIcon({ value }) {
  if (value === "two-panel-vertical") {
    return <TwoPanelVerticalLayoutIcon />;
  }
  if (value === "two-panel-horizontal") {
    return <TwoPanelHorizontalLayoutIcon />;
  }
  return <SinglePanelLayoutIcon />;
}

function getCutPartDisplay(item) {
  if (item.part !== "Slab") {
    return item.part;
  }

  return `${formatSlabUse(item.slabUse)} - ${formatSlabGrain(item.slabGrain)}`;
}

function resolvePreviewOverlays(row, job) {
  if (row.useCustomOverlay || row.overlaySubcategoryId) {
    const left = parseMeasurement(row.overlayLeft);
    const right = parseMeasurement(row.overlayRight);
    const top = parseMeasurement(row.overlayTop);
    const bottom = parseMeasurement(row.overlayBottom);
    if ([left, right, top, bottom].some((value) => value === null)) {
      return null;
    }
    return { left, right, top, bottom };
  }

  const uniformOverlay = parseMeasurement(row.customOverlay);
  if (uniformOverlay !== null) {
    return {
      left: uniformOverlay,
      right: uniformOverlay,
      top: uniformOverlay,
      bottom: uniformOverlay,
    };
  }

  if (job?.useCustomOverlay) {
    const left = Number(job.overlayLeft);
    const right = Number(job.overlayRight);
    const top = Number(job.overlayTop);
    const bottom = Number(job.overlayBottom);
    if ([left, right, top, bottom].some((value) => !Number.isFinite(value))) {
      return null;
    }
    return { left, right, top, bottom };
  }

  const fallbackOverlay = Number(job?.defaultOverlay);
  if (!Number.isFinite(fallbackOverlay)) {
    return null;
  }

  return {
    left: fallbackOverlay,
    right: fallbackOverlay,
    top: fallbackOverlay,
    bottom: fallbackOverlay,
  };
}

function getFinishedSizeSummary(row, job) {
  const opWidth = parseMeasurement(row.opWidth);
  const opHeight = parseMeasurement(row.opHeight);
  if (opWidth === null || opHeight === null) {
    return "-";
  }

  const overlays = resolvePreviewOverlays(row, job);
  if (!overlays) {
    return "-";
  }

  const { left, right, top, bottom } = overlays;

  const finishedHeight = opHeight + top + bottom;
  if (row.doorType === "butt") {
    let gap = parseMeasurement(row.buttGap);
    if (gap === null || gap <= 0) {
      const fallbackGap = Number(job?.buttGap);
      gap = Number.isFinite(fallbackGap) && fallbackGap > 0 ? fallbackGap : 0.125;
    }

    const totalFinishedWidth = opWidth + left + right;
    const clearPairWidth = totalFinishedWidth - gap;
    if (clearPairWidth <= 0 || finishedHeight <= 0) {
      return "-";
    }

    const leafWidth = clearPairWidth / 2;
    return `${formatMeasurement(leafWidth)} x ${formatMeasurement(finishedHeight)}`;
  }

  const finishedWidth = opWidth + left + right;
  if (finishedWidth <= 0 || finishedHeight <= 0) {
    return "-";
  }

  return `${formatMeasurement(finishedWidth)} x ${formatMeasurement(finishedHeight)}`;
}

function getDoorQty(row) {
  const qty = parseInt(row.qty, 10) || 0;
  if (row.doorType === "butt") {
    return qty * 2;
  }
  return qty;
}

function renderStyleSelectors(row, updateRow, styleFamilies, styleByID) {
  const selectedStyle = styleByID.get(row.styleId) || null;
  const overlayType = row.overlayType === "drawer-front" ? "drawer-front" : "door";
  const selectedFamily = selectedStyle ? getStyleFamily(selectedStyle) : "";

  const compatibleFamilies = styleFamilies
    .map((group) => ({
      family: group.family,
      styles: (group.styles || []).filter((style) => styleMatchesOverlayType(style, overlayType)),
    }))
    .filter((group) => group.styles.length > 0);

  let availableFamilies = compatibleFamilies;
  const selectedStyleAllowed = selectedStyle ? styleMatchesOverlayType(selectedStyle, overlayType) : false;
  if (selectedStyle && !selectedStyleAllowed) {
    const selectedGroupIndex = availableFamilies.findIndex((group) => group.family === selectedFamily);
    if (selectedGroupIndex >= 0) {
      const currentStyles = availableFamilies[selectedGroupIndex].styles;
      if (!currentStyles.some((style) => style.id === selectedStyle.id)) {
        const next = [...availableFamilies];
        next[selectedGroupIndex] = { ...next[selectedGroupIndex], styles: [selectedStyle, ...currentStyles] };
        availableFamilies = next;
      }
    } else {
      availableFamilies = [{ family: selectedFamily || "Current Style", styles: [selectedStyle] }, ...availableFamilies];
    }
  }

  const resolvedFamily = selectedFamily || availableFamilies[0]?.family || "";
  const familyStyles = availableFamilies.find((group) => group.family === resolvedFamily)?.styles || [];
  const selectedStyleId = familyStyles.some((style) => style.id === row.styleId) ? row.styleId : familyStyles[0]?.id || "";

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Style Family
        </label>
        <select
          value={resolvedFamily}
          onChange={(event) => {
            const nextFamily = event.target.value;
            const nextStyle =
              availableFamilies.find((group) => group.family === nextFamily)
                ?.styles?.[0] || null;
            updateRow("styleId", nextStyle?.id || "");
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {availableFamilies.map((group) => (
            <option key={group.family} value={group.family}>
              {group.family}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Variant
        </label>
        <select
          value={selectedStyleId}
          onChange={(event) => updateRow("styleId", event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {familyStyles.map((style) => (
            <option key={style.id} value={style.id}>
              {getStyleVariantLabel(style)}
              {styleMatchesOverlayType(style, overlayType) ? "" : ` (Current: ${getStyleUse(style)})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function renderDoorSettings(
  row,
  updateRow,
  doorOverlayItems,
  drawerFrontItems,
  isSlab,
) {
  const overlayType =
    row.overlayType === "drawer-front" ? "drawer-front" : "door";
  const activeItems =
    overlayType === "drawer-front"
      ? drawerFrontItems || []
      : doorOverlayItems || [];
  const selectedItemId = row.overlaySubcategoryId || "";

  const applyItemValues = (items, itemId) => {
    const selected = (items || []).find((item) => item.id === itemId);
    if (!selected) {
      return;
    }

    updateRow("customOverlay", formatMeasurement(selected.left));
    updateRow("overlayLeft", formatMeasurement(selected.left));
    updateRow("overlayRight", formatMeasurement(selected.right));
    updateRow("overlayTop", formatMeasurement(selected.top));
    updateRow("overlayBottom", formatMeasurement(selected.bottom));
  };

  const applyOverlayItem = (itemId) => {
    updateRow("overlaySubcategoryId", itemId);
    applyItemValues(activeItems, itemId);
  };

  const switchOverlayType = (nextType) => {
    const normalizedType =
      nextType === "drawer-front" ? "drawer-front" : "door";
    updateRow("overlayType", normalizedType);
    updateRow("overlaySubcategoryId", "");
  };

  return (
    <div className="grid gap-4 rounded-lg border border-zinc-200 p-3 md:grid-cols-[220px_150px_1fr] dark:border-zinc-700">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {isSlab ? "Slab Use" : "Item"}
        </p>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={overlayType === "door"}
              onChange={() => switchOverlayType("door")}
            />
            {isSlab ? "Door" : "Door"}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={overlayType === "drawer-front"}
              onChange={() => switchOverlayType("drawer-front")}
            />
            {isSlab ? "Drawer Front" : "Drawer Front"}
          </label>
        </div>

        {isSlab ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Grain / Finish
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={row.slabGrain === "vertical"}
                  onChange={() => updateRow("slabGrain", "vertical")}
                />
                Vertical
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={row.slabGrain === "horizontal"}
                  onChange={() => updateRow("slabGrain", "horizontal")}
                />
                Horizontal
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={row.slabGrain === "mdf"}
                  onChange={() => updateRow("slabGrain", "mdf")}
                />
                MDF
              </label>
            </div>
          </>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Door Type
        </p>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={row.doorType === "single"}
              onChange={() => updateRow("doorType", "single")}
            />
            Single
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={row.doorType === "butt"}
              onChange={() => updateRow("doorType", "butt")}
            />
            Butt
          </label>
        </div>

        {!isSlab ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Panel Layout
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                {
                  value: "single",
                  label: "Single Panel",
                },
                {
                  value: "two-panel-vertical",
                  label: "2-Panel Vertical",
                },
              ].map((option) => {
                const isActive = (row.panelLayout || "single") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateRow("panelLayout", option.value)}
                    className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-center transition-colors ${
                      isActive
                        ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                    title={option.label}
                  >
                    <PanelLayoutOptionIcon value={option.value} />
                    <span className="text-[11px] font-medium leading-tight">
                      {option.value === "single" ? "Single" : "Vertical"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Butt Gap
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={row.buttGap}
          onChange={(event) => updateRow("buttGap", event.target.value)}
          disabled={row.doorType !== "butt"}
          placeholder="1/8"
          className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {overlayType === "drawer-front" ? "Drawer Front" : "Door"}
          </label>
          <select
            value={selectedItemId}
            onChange={(event) => applyOverlayItem(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="" disabled>
              Select Type
            </option>
            {activeItems.length === 0 ? (
              <option value="">No items available</option>
            ) : null}
            {activeItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={Boolean(row.useCustomOverlay)}
            onChange={(event) => {
              updateRow("useCustomOverlay", event.target.checked);
              if (!event.target.checked) {
                updateRow("overlaySubcategoryId", "");
              }
            }}
          />
          Customize overlay
        </label>

        {row.useCustomOverlay ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Left", "overlayLeft"],
              ["Right", "overlayRight"],
              ["Top", "overlayTop"],
              ["Bottom", "overlayBottom"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {label}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row[key]}
                  onChange={(event) => updateRow(key, event.target.value)}
                  placeholder="1/2"
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function JobDetailView({ jobId, onBack }) {
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([]);
  const [draftRow, setDraftRow] = useState(createDoorDraft("", 0.5));
  const [doorStyles, setDoorStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [cutList, setCutList] = useState(null);
  const [showCutList, setShowCutList] = useState(false);
  const [isLoadingCutList, setIsLoadingCutList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const { showToast } = useToast();

  const styleFamilies = useMemo(
    () => groupStylesByFamily(doorStyles || []),
    [doorStyles],
  );
  const styleByID = useMemo(() => {
    const byID = new Map();
    for (const style of doorStyles || []) {
      byID.set(style.id, style);
    }
    return byID;
  }, [doorStyles]);
  const selectedOverlayCategory = useMemo(
    () =>
      overlayCategories.find(
        (category) => category.id === job?.defaultOverlayCategoryId,
      ) || null,
    [overlayCategories, job?.defaultOverlayCategoryId],
  );
  const overlayItems = useMemo(
    () => selectedOverlayCategory?.doorItems || [],
    [selectedOverlayCategory],
  );
  const drawerFrontItems = useMemo(
    () => selectedOverlayCategory?.drawerFrontItems || [],
    [selectedOverlayCategory],
  );
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
      new Set(
        items.map((item) => item.thicknessFormatted || "").filter(Boolean),
      ),
    );
    if (values.length === 0) {
      return "";
    }

    return values.join(", ");
  };
  const frameThicknessLabel = useMemo(
    () => getThicknessLabel(frameItems),
    [frameItems],
  );
  const frameLinearFeetLabel = useMemo(() => {
    if (!frameItems.length) {
      return "";
    }

    const totalFeet = frameItems.reduce((sum, item) => {
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + (length * qty) / 12;
    }, 0);

    return totalFeet.toFixed(2);
  }, [frameItems]);
  const slabThicknessLabel = useMemo(
    () => getThicknessLabel(slabItems),
    [slabItems],
  );
  const panelThicknessLabel = useMemo(
    () => getThicknessLabel(panelItems),
    [panelItems],
  );
  const printSections = useMemo(
    () =>
      [
        { id: "frame", title: "Stiles & Rails", items: frameItems },
        { id: "slab", title: "Slabs", items: slabItems },
        { id: "panel", title: "Panels", items: panelItems },
      ].filter((section) => section.items.length > 0),
    [frameItems, panelItems, slabItems],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [jobData, styles, categories] = await Promise.all([
          GetJob(jobId),
          LoadDoorStyles(),
          GetOverlayCategories(),
        ]);
        setJob(jobData);
        setDoorStyles(styles || []);
        setOverlayCategories(categories || []);
        setRows(
          (jobData?.doors || []).map((door) =>
            mapDoorToRow(door, jobData.defaultStyleId, jobData.defaultOverlay),
          ),
        );
        setDraftRow(
          createDoorDraft(jobData.defaultStyleId, jobData.defaultOverlay),
        );
      } catch (error) {
        showToast("Failed to load job details", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [jobId, showToast]);

  const updateDraft = (field, value) => {
    setDraftRow((prev) => ({ ...prev, [field]: value }));
  };

  const addDoorFromDraft = async () => {
    const parsed = parseDoorRow(draftRow);
    if (parsed.error) {
      showToast(parsed.error, "error");
      return;
    }

    const nextRows = [...rows, draftRow];
    const saved = await saveDoors(nextRows, { successMessage: "Door added" });
    if (!saved) {
      return;
    }

    setDraftRow(createDoorDraft(job?.defaultStyleId, job?.defaultOverlay));
    if (showCutList) {
      await fetchCutList();
    }
  };

  const removeRow = async (id) => {
    const nextRows = rows.filter((row) => row.id !== id);
    const saved = await saveDoors(nextRows, { successMessage: "Door removed" });
    if (saved && showCutList) {
      await fetchCutList();
    }
  };

  const openEditModal = (row) => {
    setEditRow({ ...row });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditRow(null);
    setIsEditModalOpen(false);
  };

  const updateEdit = (field, value) => {
    setEditRow((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEditedDoor = async () => {
    if (!editRow) {
      return;
    }

    const nextRows = rows.map((row) => (row.id === editRow.id ? editRow : row));
    const saved = await saveDoors(nextRows, { successMessage: "Door updated" });
    if (!saved) {
      return;
    }

    closeEditModal();
    if (showCutList) {
      await fetchCutList();
    }
  };

  const reloadJobFromServer = async () => {
    const latestJob = await GetJob(jobId);
    setJob(latestJob);
    setRows(
      (latestJob?.doors || []).map((door) =>
        mapDoorToRow(door, latestJob.defaultStyleId, latestJob.defaultOverlay),
      ),
    );
    return latestJob;
  };

  const fetchCutList = async ({ reloadJob = false } = {}) => {
    if (!jobId) {
      return;
    }

    setIsLoadingCutList(true);
    try {
      if (reloadJob) {
        await reloadJobFromServer();
      }
      const response = await GenerateCutList(jobId);
      setCutList(response || null);
    } catch (error) {
      setCutList(null);
      showToast("Unable to generate cut list for this job", "error");
    } finally {
      setIsLoadingCutList(false);
    }
  };

  const saveDoors = async (
    rowsToSave = rows,
    { silentSuccess = false, successMessage = "Doors saved" } = {},
  ) => {
    if (!job) {
      return false;
    }

    const doors = [];
    for (const row of rowsToSave) {
      const parsed = parseDoorRow(row);
      if (parsed.error) {
        showToast(parsed.error, "error");
        return false;
      }
      doors.push(parsed.door);
    }

    setIsSaving(true);
    try {
      const updated = await SaveJob({ ...job, doors });
      setJob(updated);
      setRows(
        (updated?.doors || []).map((door) =>
          mapDoorToRow(door, updated.defaultStyleId, updated.defaultOverlay),
        ),
      );
      if (!silentSuccess) {
        showToast(successMessage, "success");
      }
      return true;
    } catch (error) {
      showToast("Failed to save doors", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const onCutListClick = async () => {
    if (showCutList) {
      setShowCutList(false);
      return;
    }

    setShowCutList(true);
    await fetchCutList();
  };

  const handlePrintCutList = async () => {
    const openingCount = (rows || []).reduce((sum, row) => {
      const qty = Number.parseInt(row?.qty, 10);
      return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
    }, 0);

    const printed = await printCutList({
      customerName: job?.customerName,
      jobName: job?.name,
      items: cutList?.items || [],
      openingCount,
    });
    if (!printed) {
      showToast("No printable cut list sections found", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        Loading job...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400">Job not found.</div>
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
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Jobs
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {job.customerName}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {job.name}
              {" · "}
              Overlay: {selectedOverlayCategory?.name || "None"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void onCutListClick()}>
            <ListChecks size={16} className="mr-2" />
            {showCutList ? "Hide Cut List" : "Cut List"}
          </Button>
          <Button onClick={() => void saveDoors()} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save Doors"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Add Door
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1.2fr_0.45fr_0.6fr_0.6fr_1.8fr] gap-2">
            <Input
              label="Door Name"
              value={draftRow.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              placeholder="Base Left"
            />
            <Input
              label="Qty"
              type="text"
              inputMode="numeric"
              value={draftRow.qty}
              onChange={(event) =>
                updateDraft("qty", event.target.value.replace(/[^0-9]/g, ""))
              }
            />
            <Input
              label="Opening Width"
              className="max-w-28"
              type="text"
              inputMode="decimal"
              value={draftRow.opWidth}
              onChange={(event) => updateDraft("opWidth", event.target.value)}
              placeholder="15 1/2"
            />
            <Input
              label="Opening Height"
              className="max-w-28"
              type="text"
              inputMode="decimal"
              value={draftRow.opHeight}
              onChange={(event) => updateDraft("opHeight", event.target.value)}
              placeholder="30"
            />
            <div>
              {renderStyleSelectors(
                draftRow,
                updateDraft,
                styleFamilies,
                styleByID,
              )}
            </div>
          </div>

          {renderDoorSettings(
            draftRow,
            updateDraft,
            overlayItems,
            drawerFrontItems,
            Boolean(styleByID.get(draftRow.styleId)?.isSlab),
          )}

          <div className="flex justify-end">
            <Button onClick={() => void addDoorFromDraft()}>
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Door Entries
          </h3>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No doors yet. Add your first door entry.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Door
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Opening
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Finished Size
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Style
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const selectedStyle = findStyleById(doorStyles || [], row.styleId);
                    const styleName = selectedStyle ? getStyleDisplayName(selectedStyle) : "-";
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {getDoorQty(row)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.opWidth} x {row.opHeight}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.doorType === "butt" ? "Butt" : "Single"}
                          {!selectedStyle?.isSlab ? (
                            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                              {formatPanelLayout(row.panelLayout)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {getFinishedSizeSummary(row, job)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {styleName}
                          {selectedStyle?.isSlab ? (
                            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                              {formatSlabUse(row.overlayType)} | {formatSlabGrain(row.slabGrain)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(row)}
                              title="Edit door"
                            >
                              <Pencil
                                size={14}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void removeRow(row.id)}
                              title="Remove door"
                            >
                              <Trash2 size={14} className="text-rose-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Door"
        maxWidthClass="max-w-7xl"
      >
        {editRow ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1.2fr_0.45fr_0.6fr_0.6fr_1.8fr] gap-2">
              <Input
                label="Door Name"
                value={editRow.name}
                onChange={(event) => updateEdit("name", event.target.value)}
                placeholder="Base Left"
              />
              <Input
                label="Qty"
                type="text"
                inputMode="numeric"
                value={editRow.qty}
                onChange={(event) =>
                  updateEdit("qty", event.target.value.replace(/[^0-9]/g, ""))
                }
              />
              <Input
                label="Opening Width"
                className="max-w-28"
                type="text"
                inputMode="decimal"
                value={editRow.opWidth}
                onChange={(event) => updateEdit("opWidth", event.target.value)}
                placeholder="15 1/2"
              />
              <Input
                label="Opening Height"
                className="max-w-28"
                type="text"
                inputMode="decimal"
                value={editRow.opHeight}
                onChange={(event) => updateEdit("opHeight", event.target.value)}
                placeholder="30"
              />
              <div>
                {renderStyleSelectors(
                  editRow,
                  updateEdit,
                  styleFamilies,
                  styleByID,
                )}
              </div>
            </div>

            {renderDoorSettings(
              editRow,
              updateEdit,
              overlayItems,
              drawerFrontItems,
              Boolean(styleByID.get(editRow.styleId)?.isSlab),
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={() => void saveEditedDoor()} disabled={isSaving}>
                Save Door
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {showCutList ? (
        <Card className="print-cutlist-root">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Cut List
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-700">
                  {job.customerName} - {job.name}
                </p>
              </div>
              <div className="no-print flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handlePrintCutList}>
                  <Printer size={14} className="mr-1" />
                  Print
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchCutList({ reloadJob: true })}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingCutList ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Generating cut list...
              </p>
            ) : !cutList ||
              !cutList.items ||
              cutList.items.length === 0 ||
              printSections.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No cut list parts yet. Add doors and save to generate.
              </p>
            ) : (
              <>
                {printSections.map((section) => (
                  <div key={section.id} className="print-cutlist-section">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {section.title}
                      </h4>
                      <div className="flex items-center gap-4">
                        {section.id === "frame" && frameThicknessLabel ? (
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Thickness: {frameThicknessLabel}
                          </span>
                        ) : null}
                        {section.id === "slab" && slabThicknessLabel ? (
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Thickness: {slabThicknessLabel}
                          </span>
                        ) : null}
                        {section.id === "panel" && panelThicknessLabel ? (
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Thickness: {panelThicknessLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed print-cutlist-table">
                        <colgroup>
                          <col className="w-[20%]" />
                          <col className="w-[16%]" />
                          <col className="w-[26%]" />
                          <col className="w-[38%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              Part
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              Width
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              Length
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map((item, index) => (
                            <tr
                              key={`${item.part}-${item.label}-${index}`}
                              className="border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {getCutPartDisplay(item)}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                                {item.qty}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                                {item.widthFormatted || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                                {item.lengthFormatted}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {section.id === "frame" && frameLinearFeetLabel ? (
                      <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Linear Feet: {frameLinearFeetLabel}
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
