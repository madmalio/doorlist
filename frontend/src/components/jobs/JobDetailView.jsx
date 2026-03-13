import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Printer,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  GenerateQuickDoorCutList,
  GetJob,
  GetOverlayCategories,
  LoadDoorStyles,
  SaveJob,
} from "../../../wailsjs/go/main/App";
import { formatMeasurement } from "../../lib/measurements";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { useMeasurement } from "../ui/MeasurementProvider";
import { useLicense } from "../ui/LicenseProvider";
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
import { printQuickDoorSheet } from "../../lib/quickDoorPrint";
import { formatLengthDisplay, formatLengthInput, parseLengthInput } from "../../lib/units";

function createDoorDraft(defaultStyleId, defaultOverlay, measurementSystem) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: "",
    qty: "1",
    opWidth: "",
    opHeight: "",
    styleId: defaultStyleId || "",
    overlayType: "door",
    overlaySubcategoryId: "",
    customOverlay: formatLengthInput(defaultOverlay ?? 0.5, measurementSystem),
    doorType: "single",
    drawerFrontPosition: "top",
    buttGap: formatLengthInput(0.125, measurementSystem),
    useCustomOverlay: false,
    overlayLeft: formatLengthInput(defaultOverlay ?? 0.5, measurementSystem),
    overlayRight: formatLengthInput(defaultOverlay ?? 0.5, measurementSystem),
    overlayTop: formatLengthInput(defaultOverlay ?? 0.5, measurementSystem),
    overlayBottom: formatLengthInput(defaultOverlay ?? 0.5, measurementSystem),
    panelLayout: "single",
    slabGrain: "mdf",
  };
}

function mapDoorToRow(door, fallbackStyleId, fallbackOverlay, measurementSystem) {
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
    opWidth: formatLengthInput(door.opWidth, measurementSystem),
    opHeight: formatLengthInput(door.opHeight, measurementSystem),
    styleId: door.styleId || fallbackStyleId || "",
    overlayType: door.overlayType === "drawer-front" ? "drawer-front" : "door",
    drawerFrontPosition:
      door.drawerFrontPosition === "middle" || door.drawerFrontPosition === "bottom"
        ? door.drawerFrontPosition
        : "top",
    overlaySubcategoryId: door.overlaySubcategoryId || "",
    customOverlay: formatLengthInput(resolvedOverlay, measurementSystem),
    doorType: door.doorType || "single",
    buttGap: formatLengthInput(door.buttGap || 0.125, measurementSystem),
    useCustomOverlay: Boolean(door.useCustomOverlay),
    overlayLeft: formatLengthInput(
      hasStoredSides ? door.overlayLeft : resolvedOverlay,
      measurementSystem,
    ),
    overlayRight: formatLengthInput(
      hasStoredSides ? door.overlayRight : resolvedOverlay,
      measurementSystem,
    ),
    overlayTop: formatLengthInput(
      hasStoredSides ? door.overlayTop : resolvedOverlay,
      measurementSystem,
    ),
    overlayBottom: formatLengthInput(
      hasStoredSides ? door.overlayBottom : resolvedOverlay,
      measurementSystem,
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

function parseDoorRow(row, measurementSystem) {
  const opWidth = parseLengthInput(row.opWidth, measurementSystem);
  const opHeight = parseLengthInput(row.opHeight, measurementSystem);
  const uniformOverlay = parseLengthInput(row.customOverlay, measurementSystem);
  const buttGap = parseLengthInput(row.buttGap, measurementSystem);
  const overlayLeft = parseLengthInput(row.overlayLeft, measurementSystem);
  const overlayRight = parseLengthInput(row.overlayRight, measurementSystem);
  const overlayTop = parseLengthInput(row.overlayTop, measurementSystem);
  const overlayBottom = parseLengthInput(row.overlayBottom, measurementSystem);
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
      drawerFrontPosition:
        row.drawerFrontPosition === "middle" || row.drawerFrontPosition === "bottom"
          ? row.drawerFrontPosition
          : "top",
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

function resolvePreviewOverlays(row, job, measurementSystem) {
  if (row.useCustomOverlay || row.overlaySubcategoryId) {
    const left = parseLengthInput(row.overlayLeft, measurementSystem);
    const right = parseLengthInput(row.overlayRight, measurementSystem);
    const top = parseLengthInput(row.overlayTop, measurementSystem);
    const bottom = parseLengthInput(row.overlayBottom, measurementSystem);
    if ([left, right, top, bottom].some((value) => value === null)) {
      return null;
    }
    return { left, right, top, bottom };
  }

  const uniformOverlay = parseLengthInput(row.customOverlay, measurementSystem);
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

function getFinishedSizeSummary(row, job, measurementSystem) {
  const opWidth = parseLengthInput(row.opWidth, measurementSystem);
  const opHeight = parseLengthInput(row.opHeight, measurementSystem);
  if (opWidth === null || opHeight === null) {
    return "-";
  }

  const overlays = resolvePreviewOverlays(row, job, measurementSystem);
  if (!overlays) {
    return "-";
  }

  const { left, right, top, bottom } = overlays;

  const finishedHeight = opHeight + top + bottom;
  if (row.doorType === "butt") {
    let gap = parseLengthInput(row.buttGap, measurementSystem);
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
    return `${formatLengthDisplay(formatMeasurement(leafWidth), measurementSystem)} x ${formatLengthDisplay(formatMeasurement(finishedHeight), measurementSystem)}`;
  }

  const finishedWidth = opWidth + left + right;
  if (finishedWidth <= 0 || finishedHeight <= 0) {
    return "-";
  }

  return `${formatLengthDisplay(formatMeasurement(finishedWidth), measurementSystem)} x ${formatLengthDisplay(formatMeasurement(finishedHeight), measurementSystem)}`;
}

function getDoorQty(row) {
  const qty = parseInt(row.qty, 10) || 0;
  if (row.doorType === "butt") {
    return qty * 2;
  }
  return qty;
}

function formatRowMeasurement(value, measurementSystem) {
  const inches = parseLengthInput(value, measurementSystem);
  if (inches === null) {
    return "-";
  }
  return formatLengthDisplay(formatMeasurement(inches), measurementSystem);
}

function formatInches(value, measurementSystem) {
  return formatLengthDisplay(formatMeasurement(Number(value) || 0), measurementSystem);
}

function renderStyleSelectors(row, updateRow, styleFamilies, styleByID) {
  const selectedStyle = styleByID.get(row.styleId) || null;
  const overlayType = row.overlayType === "drawer-front" ? "drawer-front" : "door";
  const drawerFrontPosition =
    row.drawerFrontPosition === "middle" || row.drawerFrontPosition === "bottom"
      ? row.drawerFrontPosition
      : "top";
  const selectedFamily = selectedStyle ? getStyleFamily(selectedStyle) : "";

  const compatibleFamilies = styleFamilies
    .map((group) => ({
      family: group.family,
      styles: (group.styles || []).filter((style) => styleMatchesOverlayType(style, overlayType, drawerFrontPosition)),
    }))
    .filter((group) => group.styles.length > 0);

  let availableFamilies = compatibleFamilies;
  const selectedStyleAllowed = selectedStyle ? styleMatchesOverlayType(selectedStyle, overlayType, drawerFrontPosition) : false;
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
          Frame
        </label>
        <select
          value={selectedStyleId}
          onChange={(event) => updateRow("styleId", event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {familyStyles.map((style) => (
            <option key={style.id} value={style.id}>
              {getStyleVariantLabel(style)}
              {styleMatchesOverlayType(style, overlayType, drawerFrontPosition) ? "" : ` (Current: ${getStyleUse(style)})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ensureCompatibleStyleSelection(row, styleFamilies, styleByID) {
  if (!row) {
    return row;
  }

  const overlayType = row.overlayType === "drawer-front" ? "drawer-front" : "door";
  const drawerFrontPosition =
    row.drawerFrontPosition === "middle" || row.drawerFrontPosition === "bottom"
      ? row.drawerFrontPosition
      : "top";

  const selectedStyle = styleByID.get(row.styleId) || null;
  const selectedStyleAllowed = selectedStyle
    ? styleMatchesOverlayType(selectedStyle, overlayType, drawerFrontPosition)
    : false;
  if (selectedStyleAllowed) {
    return row;
  }

  const compatibleFamilies = styleFamilies
    .map((group) => ({
      family: group.family,
      styles: (group.styles || []).filter((style) =>
        styleMatchesOverlayType(style, overlayType, drawerFrontPosition),
      ),
    }))
    .filter((group) => group.styles.length > 0);

  if (compatibleFamilies.length === 0) {
    return row;
  }

  const compatibleStyles = compatibleFamilies.flatMap((group) => group.styles || []);
  const selectedVariant = selectedStyle ? getStyleVariant(selectedStyle) : "";

  const pickBy = (predicate) => compatibleStyles.find((style) => predicate(style)) || null;

  const byFamilyAndVariant = pickBy(
    (style) =>
      selectedStyle &&
      getStyleFamily(style) === getStyleFamily(selectedStyle) &&
      getStyleVariant(style) === selectedVariant,
  );
  const byVariant = pickBy((style) => selectedVariant && getStyleVariant(style) === selectedVariant);

  const selectedFamily = selectedStyle ? getStyleFamily(selectedStyle) : "";
  const preferredGroup = compatibleFamilies.find((group) => group.family === selectedFamily) || compatibleFamilies[0];
  const byFamily = preferredGroup?.styles?.[0] || null;
  const fallback = compatibleStyles[0] || null;
  const nextStyleID = (byFamilyAndVariant || byVariant || byFamily || fallback)?.id || "";
  if (!nextStyleID || nextStyleID === row.styleId) {
    return row;
  }

  return { ...row, styleId: nextStyleID };
}

function renderDoorSettings(
  row,
  updateRow,
  doorOverlayItems,
  drawerFrontItems,
  isSlab,
  jobOverlay,
  measurementSystem,
) {
  const unitLabel = measurementSystem === "metric" ? "mm" : "in";
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

    updateRow("customOverlay", formatLengthInput(selected.left, measurementSystem));
    updateRow("overlayLeft", formatLengthInput(selected.left, measurementSystem));
    updateRow("overlayRight", formatLengthInput(selected.right, measurementSystem));
    updateRow("overlayTop", formatLengthInput(selected.top, measurementSystem));
    updateRow("overlayBottom", formatLengthInput(selected.bottom, measurementSystem));
  };

  const applyOverlayItem = (itemId) => {
    updateRow("overlaySubcategoryId", itemId);
    applyItemValues(activeItems, itemId);
  };

  const switchOverlayType = (nextType) => {
    const normalizedType =
      nextType === "drawer-front" ? "drawer-front" : "door";
    updateRow("overlayType", normalizedType);
    if (normalizedType === "drawer-front") {
      updateRow("doorType", "single");
      updateRow("drawerFrontPosition", row.drawerFrontPosition || "top");
    }
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

        {overlayType === "door" ? (
          <>
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
          </>
        ) : null}

        {overlayType === "drawer-front" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Drawer Position
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ].map((option) => {
                const isActive = (row.drawerFrontPosition || "top") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateRow("drawerFrontPosition", option.value)}
                    className={`flex min-h-[42px] items-center justify-center rounded-md border px-2 py-1 text-center text-xs font-medium transition-colors ${
                      isActive
                        ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {!isSlab && overlayType === "door" ? (
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
        {overlayType === "door" ? (
          <>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Butt Gap
            </label>
            <div className="relative w-24">
              <input
                type="text"
                inputMode="decimal"
                value={row.buttGap}
                onChange={(event) => updateRow("buttGap", event.target.value)}
                disabled={row.doorType !== "butt"}
                placeholder={measurementSystem === "metric" ? "3" : "1/8"}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {unitLabel}
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Job Overlay
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            L {formatLengthDisplay(formatMeasurement(jobOverlay?.left ?? 0), measurementSystem)} | R {formatLengthDisplay(formatMeasurement(jobOverlay?.right ?? 0), measurementSystem)} | T {formatLengthDisplay(formatMeasurement(jobOverlay?.top ?? 0), measurementSystem)} | B {formatLengthDisplay(formatMeasurement(jobOverlay?.bottom ?? 0), measurementSystem)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Applied automatically unless preset or custom overlay is selected.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {overlayType === "drawer-front" ? "Drawer Front Overlay Preset" : "Door Overlay Preset"}
          </label>
          <select
            value={selectedItemId}
            onChange={(event) => applyOverlayItem(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="" disabled>
              Optional preset
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
                <div className="relative w-24">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row[key]}
                    onChange={(event) => updateRow(key, event.target.value)}
                    placeholder={measurementSystem === "metric" ? "13" : "1/2"}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {unitLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function JobDetailView({ jobId, onBack, onOpenCutList, onRequireLicense }) {
  const { measurementSystem } = useMeasurement();
  const unitLabel = measurementSystem === "metric" ? "mm" : "in";
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([]);
  const [draftRow, setDraftRow] = useState(createDoorDraft("", 0.5, measurementSystem));
  const [doorStyles, setDoorStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintingRowId, setIsPrintingRowId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const { showToast } = useToast();
  const { can, capabilityKeys, getCapabilityMessage } = useLicense();
  const canEditData = can(capabilityKeys.editData);
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
  const selectedFrameName = useMemo(() => {
    const style = styleByID.get(job?.defaultStyleId);
    return style ? getStyleDisplayName(style) : "N/A";
  }, [styleByID, job?.defaultStyleId]);
  const jobOverlay = useMemo(() => {
    if (job?.useCustomOverlay) {
      const left = Number(job.overlayLeft);
      const right = Number(job.overlayRight);
      const top = Number(job.overlayTop);
      const bottom = Number(job.overlayBottom);
      if ([left, right, top, bottom].every((value) => Number.isFinite(value))) {
        return { left, right, top, bottom };
      }
    }

    const fallback = Number(job?.defaultOverlay);
    const value = Number.isFinite(fallback) ? fallback : 0.5;
    return { left: value, right: value, top: value, bottom: value };
  }, [job]);

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
            mapDoorToRow(door, jobData.defaultStyleId, jobData.defaultOverlay, measurementSystem),
          ),
        );
        setDraftRow(
          createDoorDraft(jobData.defaultStyleId, jobData.defaultOverlay, measurementSystem),
        );
      } catch (error) {
        showToast("Failed to load job details", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [jobId, showToast, measurementSystem]);

  const updateDraft = (field, value) => {
    setDraftRow((prev) =>
      ensureCompatibleStyleSelection(
        { ...prev, [field]: value },
        styleFamilies,
        styleByID,
      ),
    );
  };

  const addDoorFromDraft = async () => {
    if (!requireCapability(capabilityKeys.editData)) {
      return;
    }
    const parsed = parseDoorRow(draftRow, measurementSystem);
    if (parsed.error) {
      showToast(parsed.error, "error");
      return;
    }

    const nextRows = [...rows, draftRow];
    const saved = await saveDoors(nextRows, { successMessage: "Door added" });
    if (!saved) {
      return;
    }

    setDraftRow(createDoorDraft(job?.defaultStyleId, job?.defaultOverlay, measurementSystem));
  };

  const removeRow = async (id) => {
    if (!requireCapability(capabilityKeys.editData)) {
      return;
    }
    const nextRows = rows.filter((row) => row.id !== id);
    await saveDoors(nextRows, { successMessage: "Door removed" });
  };

  const openEditModal = (row) => {
    if (!requireCapability(capabilityKeys.editData)) {
      return;
    }
    setEditRow({ ...row });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditRow(null);
    setIsEditModalOpen(false);
  };

  const updateEdit = (field, value) => {
    setEditRow((prev) =>
      prev
        ? ensureCompatibleStyleSelection(
            { ...prev, [field]: value },
            styleFamilies,
            styleByID,
          )
        : prev,
    );
  };

  useEffect(() => {
    setDraftRow((prev) => ensureCompatibleStyleSelection(prev, styleFamilies, styleByID));
    setEditRow((prev) =>
      prev ? ensureCompatibleStyleSelection(prev, styleFamilies, styleByID) : prev,
    );
  }, [styleFamilies, styleByID]);

  const saveEditedDoor = async () => {
    if (!requireCapability(capabilityKeys.editData)) {
      return;
    }
    if (!editRow) {
      return;
    }

    const nextRows = rows.map((row) => (row.id === editRow.id ? editRow : row));
    const saved = await saveDoors(nextRows, { successMessage: "Door updated" });
    if (!saved) {
      return;
    }

    closeEditModal();
  };

  const saveDoors = async (
    rowsToSave = rows,
    { silentSuccess = false, successMessage = "Doors saved" } = {},
  ) => {
    if (!requireCapability(capabilityKeys.editData)) {
      return false;
    }
    if (!job) {
      return false;
    }

    const doors = [];
    for (const row of rowsToSave) {
      const parsed = parseDoorRow(row, measurementSystem);
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
          mapDoorToRow(door, updated.defaultStyleId, updated.defaultOverlay, measurementSystem),
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

  const handlePrintRow = async (row) => {
    if (!job || !row?.id || isPrintingRowId) {
      return;
    }
    if (!requireCapability(capabilityKeys.generate)) {
      return;
    }
    if (!requireCapability(capabilityKeys.print)) {
      return;
    }

    const parsed = parseDoorRow(row, measurementSystem);
    if (parsed.error) {
      showToast(parsed.error, "error");
      return;
    }

    const overlays = resolvePreviewOverlays(row, job, measurementSystem);
    if (!overlays) {
      showToast("Enter valid overlay values before printing", "error");
      return;
    }

    const opWidth = parseLengthInput(row.opWidth, measurementSystem);
    const opHeight = parseLengthInput(row.opHeight, measurementSystem);
    if (opWidth === null || opHeight === null) {
      showToast("Enter valid opening sizes before printing", "error");
      return;
    }

    setIsPrintingRowId(row.id);
    try {
      const response = await GenerateQuickDoorCutList({
        name: row.name || "Door Entry",
        qty: parseInt(row.qty, 10) || 1,
        opWidth,
        opHeight,
        styleId: parsed.door.styleId,
        doorType: parsed.door.doorType,
        buttGap: parsed.door.doorType === "butt" ? parsed.door.buttGap : 0.125,
        overlayType: parsed.door.overlayType,
        drawerFrontPosition: parsed.door.drawerFrontPosition,
        panelLayout: parsed.door.panelLayout,
        slabGrain: parsed.door.slabGrain,
        useCustomOverlay: true,
        overlayLeft: overlays.left,
        overlayRight: overlays.right,
        overlayTop: overlays.top,
        overlayBottom: overlays.bottom,
      });

      const selectedStyle = styleByID.get(parsed.door.styleId) || null;
      const printed = await printQuickDoorSheet({
        report: {
          ...response,
          name: row.name || "Door Entry",
          styleName: selectedStyle ? getStyleDisplayName(selectedStyle) : "N/A",
          isSlab: Boolean(selectedStyle?.isSlab),
          panelLayout: parsed.door.panelLayout,
          doorType: parsed.door.doorType,
          overlayType: parsed.door.overlayType,
          drawerFrontPosition: parsed.door.drawerFrontPosition,
          qty: parseInt(row.qty, 10) || 1,
          opening: `${formatInches(opWidth, measurementSystem)} x ${formatInches(opHeight, measurementSystem)}`,
          finished: `${formatInches(parsed.door.doorType === "butt" && response.leafWidth > 0 ? response.leafWidth : response.finishedWidth, measurementSystem)} x ${formatInches(response.finishedHeight, measurementSystem)}`,
          overlaySummary: `L ${formatInches(overlays.left, measurementSystem)} | R ${formatInches(overlays.right, measurementSystem)} | T ${formatInches(overlays.top, measurementSystem)} | B ${formatInches(overlays.bottom, measurementSystem)}`,
        },
        measurementSystem,
      });

      if (!printed) {
        showToast("No printable cut list sections found", "error");
      }
    } catch (error) {
      showToast("Unable to generate row cut sheet", "error");
    } finally {
      setIsPrintingRowId(null);
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
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedFrameName}</span>
              {" · "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{job.woodChoice || "None"}</span>
              {" · "}
              Overlay: {selectedOverlayCategory?.name || "None"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (!requireCapability(capabilityKeys.generate)) {
                return;
              }
              onOpenCutList?.(job.id);
            }}
          >
            Cut List
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
              suffix={unitLabel}
              value={draftRow.opWidth}
              onChange={(event) => updateDraft("opWidth", event.target.value)}
            />
            <Input
              label="Opening Height"
              className="max-w-28"
              type="text"
              inputMode="decimal"
              suffix={unitLabel}
              value={draftRow.opHeight}
              onChange={(event) => updateDraft("opHeight", event.target.value)}
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
            jobOverlay,
            measurementSystem,
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
                      Item Type
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
                          {formatRowMeasurement(row.opWidth, measurementSystem)} x {formatRowMeasurement(row.opHeight, measurementSystem)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {row.overlayType === "drawer-front" ? "Drawer Front" : "Door"}
                          </span>
                          {row.overlayType === "door" ? (
                            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                              {row.doorType === "butt" ? "Butt" : "Single"}
                              {!selectedStyle?.isSlab ? ` | ${formatPanelLayout(row.panelLayout)}` : ""}
                            </span>
                          ) : (
                            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                              {formatDrawerFrontPosition(row.drawerFrontPosition)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {getFinishedSizeSummary(row, job, measurementSystem)}
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
                              onClick={() => void handlePrintRow(row)}
                              title={row.overlayType === "drawer-front" ? "Print drawer front sheet" : "Print door sheet"}
                              disabled={Boolean(isPrintingRowId)}
                            >
                              <Printer
                                size={14}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
                            </Button>
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
                suffix={unitLabel}
                value={editRow.opWidth}
                onChange={(event) => updateEdit("opWidth", event.target.value)}
              />
              <Input
                label="Opening Height"
                className="max-w-28"
                type="text"
                inputMode="decimal"
                suffix={unitLabel}
                value={editRow.opHeight}
                onChange={(event) => updateEdit("opHeight", event.target.value)}
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
              jobOverlay,
              measurementSystem,
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

    </div>
  );
}
