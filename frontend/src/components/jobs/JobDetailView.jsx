import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ListChecks, Pencil, Plus, Printer, RefreshCw, Save, Trash2 } from 'lucide-react';
import { GenerateCutList, GetJob, GetOverlayCategories, LoadDoorStyles, SaveJob } from '../../../wailsjs/go/main/App';
import { formatMeasurement, parseMeasurement } from '../../lib/measurements';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { findStyleById, getStyleDisplayName, getStyleFamily, getStyleVariant, getStyleVariantLabel, groupStylesByFamily } from '../../lib/styleCatalog';

function createDoorDraft(defaultStyleId, defaultOverlay) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    qty: '1',
    opWidth: '',
    opHeight: '',
    styleId: defaultStyleId || '',
    overlayType: 'door',
    overlaySubcategoryId: '',
    customOverlay: formatMeasurement(defaultOverlay ?? 0.5),
    doorType: 'single',
    buttGap: '1/8',
    useCustomOverlay: false,
    overlayLeft: formatMeasurement(defaultOverlay ?? 0.5),
    overlayRight: formatMeasurement(defaultOverlay ?? 0.5),
    overlayTop: formatMeasurement(defaultOverlay ?? 0.5),
    overlayBottom: formatMeasurement(defaultOverlay ?? 0.5),
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
    name: door.name || '',
    qty: String(door.qty || 1),
    opWidth: formatMeasurement(door.opWidth),
    opHeight: formatMeasurement(door.opHeight),
    styleId: door.styleId || fallbackStyleId || '',
    overlayType: door.overlayType === 'drawer-front' ? 'drawer-front' : 'door',
    overlaySubcategoryId: door.overlaySubcategoryId || '',
    customOverlay: formatMeasurement(resolvedOverlay),
    doorType: door.doorType || 'single',
    buttGap: formatMeasurement(door.buttGap || 0.125),
    useCustomOverlay: Boolean(door.useCustomOverlay),
    overlayLeft: formatMeasurement(hasStoredSides ? door.overlayLeft : resolvedOverlay),
    overlayRight: formatMeasurement(hasStoredSides ? door.overlayRight : resolvedOverlay),
    overlayTop: formatMeasurement(hasStoredSides ? door.overlayTop : resolvedOverlay),
    overlayBottom: formatMeasurement(hasStoredSides ? door.overlayBottom : resolvedOverlay),
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

  if (!row.name.trim() || !row.styleId || opWidth === null || opHeight === null) {
    return { error: 'Each door needs name, style, and opening sizes' };
  }

  const hasSelectedItem = Boolean(row.overlaySubcategoryId);
  const useSideOverlays = row.useCustomOverlay || hasSelectedItem;

  if (useSideOverlays) {
    if (overlayLeft === null || overlayRight === null || overlayTop === null || overlayBottom === null) {
      return { error: 'Custom overlays require left/right/top/bottom values' };
    }
  } else if (uniformOverlay === null) {
    return { error: 'Each door needs a valid overlay value' };
  }

  if (row.doorType === 'butt' && buttGap === null) {
    return { error: 'Butt doors require a valid butt gap' };
  }

  return {
    door: {
      id: row.id,
      name: row.name.trim(),
      qty,
      opWidth,
      opHeight,
      styleId: row.styleId,
      overlayType: row.overlayType === 'drawer-front' ? 'drawer-front' : 'door',
      overlaySubcategoryId: row.overlaySubcategoryId || '',
      customOverlay: useSideOverlays ? 0 : uniformOverlay,
      doorType: row.doorType,
      buttGap: row.doorType === 'butt' ? buttGap : 0.125,
      useCustomOverlay: row.useCustomOverlay,
      overlayLeft: useSideOverlays ? overlayLeft : 0,
      overlayRight: useSideOverlays ? overlayRight : 0,
      overlayTop: useSideOverlays ? overlayTop : 0,
      overlayBottom: useSideOverlays ? overlayBottom : 0,
    },
  };
}

function getFinishedSizeSummary(row) {
  const opWidth = parseMeasurement(row.opWidth);
  const opHeight = parseMeasurement(row.opHeight);
  if (opWidth === null || opHeight === null) {
    return '-';
  }

  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;

  if (row.useCustomOverlay || row.overlaySubcategoryId) {
    left = parseMeasurement(row.overlayLeft);
    right = parseMeasurement(row.overlayRight);
    top = parseMeasurement(row.overlayTop);
    bottom = parseMeasurement(row.overlayBottom);
  } else {
    const overlay = parseMeasurement(row.customOverlay);
    left = overlay;
    right = overlay;
    top = overlay;
    bottom = overlay;
  }

  if ([left, right, top, bottom].some((value) => value === null)) {
    return '-';
  }

  const finishedHeight = opHeight + top + bottom;
  if (row.doorType === 'butt') {
    const gap = parseMeasurement(row.buttGap);
    if (gap === null) {
      return '-';
    }

    const clearOpeningWidth = opWidth - gap;
    if (clearOpeningWidth <= 0 || finishedHeight <= 0) {
      return '-';
    }

    const halfClear = clearOpeningWidth / 2;
    const leftWidth = halfClear + left;
    const rightWidth = halfClear + right;
    const leftSize = `${formatMeasurement(leftWidth)} x ${formatMeasurement(finishedHeight)}`;
    const rightSize = `${formatMeasurement(rightWidth)} x ${formatMeasurement(finishedHeight)}`;
    if (leftSize === rightSize) {
      return leftSize;
    }
    return `${leftSize} / ${rightSize}`;
  }

  const finishedWidth = opWidth + left + right;
  if (finishedWidth <= 0 || finishedHeight <= 0) {
    return '-';
  }

  return `${formatMeasurement(finishedWidth)} x ${formatMeasurement(finishedHeight)}`;
}

function getDoorQty(row) {
  const qty = parseInt(row.qty, 10) || 0;
  if (row.doorType === 'butt') {
    return qty * 2;
  }
  return qty;
}

function renderStyleSelectors(row, updateRow, styleFamilies, styleByID) {
  const selectedStyle = styleByID.get(row.styleId) || null;
  const selectedFamily = selectedStyle ? getStyleFamily(selectedStyle) : (styleFamilies[0]?.family || '');
  const familyStyles = styleFamilies.find((group) => group.family === selectedFamily)?.styles || [];

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Style Family</label>
        <select
          value={selectedFamily}
          onChange={(event) => {
            const nextFamily = event.target.value;
            const nextStyle = styleFamilies.find((group) => group.family === nextFamily)?.styles?.[0] || null;
            updateRow('styleId', nextStyle?.id || '');
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {styleFamilies.map((group) => (
            <option key={group.family} value={group.family}>{group.family}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Variant</label>
        <select
          value={row.styleId}
          onChange={(event) => updateRow('styleId', event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {familyStyles.map((style) => (
            <option key={style.id} value={style.id}>{getStyleVariantLabel(style)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function renderDoorSettings(row, updateRow, doorOverlayItems, drawerFrontItems) {
  const overlayType = row.overlayType === 'drawer-front' ? 'drawer-front' : 'door';
  const activeItems = overlayType === 'drawer-front' ? (drawerFrontItems || []) : (doorOverlayItems || []);
  const selectedItemId = row.overlaySubcategoryId || '';

  const applyItemValues = (items, itemId) => {
    const selected = (items || []).find((item) => item.id === itemId);
    if (!selected) {
      return;
    }

    updateRow('customOverlay', formatMeasurement(selected.left));
    updateRow('overlayLeft', formatMeasurement(selected.left));
    updateRow('overlayRight', formatMeasurement(selected.right));
    updateRow('overlayTop', formatMeasurement(selected.top));
    updateRow('overlayBottom', formatMeasurement(selected.bottom));
  };

  const applyOverlayItem = (itemId) => {
    updateRow('overlaySubcategoryId', itemId);
    applyItemValues(activeItems, itemId);
  };

  const switchOverlayType = (nextType) => {
    const normalizedType = nextType === 'drawer-front' ? 'drawer-front' : 'door';
    updateRow('overlayType', normalizedType);
    updateRow('overlaySubcategoryId', '');
  };

  return (
    <div className="grid gap-4 rounded-lg border border-zinc-200 p-3 md:grid-cols-[220px_150px_1fr] dark:border-zinc-700">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Item</p>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={overlayType === 'door'} onChange={() => switchOverlayType('door')} />
            Door
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={overlayType === 'drawer-front'} onChange={() => switchOverlayType('drawer-front')} />
            Drawer Front
          </label>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Door Type</p>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={row.doorType === 'single'} onChange={() => updateRow('doorType', 'single')} />
            Single
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={row.doorType === 'butt'} onChange={() => updateRow('doorType', 'butt')} />
            Butt
          </label>
        </div>

      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Butt Gap</label>
        <input
          type="text"
          inputMode="decimal"
          value={row.buttGap}
          onChange={(event) => updateRow('buttGap', event.target.value)}
          disabled={row.doorType !== 'butt'}
          placeholder="1/8"
          className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {overlayType === 'drawer-front' ? 'Drawer Front' : 'Door'}
          </label>
          <select
            value={selectedItemId}
            onChange={(event) => applyOverlayItem(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="" disabled>Select Type</option>
            {activeItems.length === 0 ? <option value="">No items available</option> : null}
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
              updateRow('useCustomOverlay', event.target.checked);
              if (!event.target.checked) {
                updateRow('overlaySubcategoryId', '');
              }
            }}
          />
          Customize overlay
        </label>

        {row.useCustomOverlay ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Left', 'overlayLeft'],
              ['Right', 'overlayRight'],
              ['Top', 'overlayTop'],
              ['Bottom', 'overlayBottom'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</label>
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
  const [draftRow, setDraftRow] = useState(createDoorDraft('', 0.5));
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

  const styleFamilies = useMemo(() => groupStylesByFamily(doorStyles || []), [doorStyles]);
  const styleByID = useMemo(() => {
    const byID = new Map();
    for (const style of doorStyles || []) {
      byID.set(style.id, style);
    }
    return byID;
  }, [doorStyles]);
  const selectedOverlayCategory = useMemo(
    () => overlayCategories.find((category) => category.id === job?.defaultOverlayCategoryId) || null,
    [overlayCategories, job?.defaultOverlayCategoryId],
  );
  const overlayItems = useMemo(() => (selectedOverlayCategory?.doorItems || []), [selectedOverlayCategory]);
  const drawerFrontItems = useMemo(() => (selectedOverlayCategory?.drawerFrontItems || []), [selectedOverlayCategory]);
  const frameItems = useMemo(() => (cutList?.items || []).filter((item) => item.part === 'Stile' || item.part === 'Rail'), [cutList]);
  const panelItems = useMemo(() => (cutList?.items || []).filter((item) => item.part === 'Panel'), [cutList]);
  const slabItems = useMemo(() => (cutList?.items || []).filter((item) => item.part === 'Slab'), [cutList]);
  const getThicknessLabel = (items) => {
    if (!items.length) {
      return '';
    }

    const values = Array.from(new Set(items.map((item) => item.thicknessFormatted || '').filter(Boolean)));
    if (values.length === 0) {
      return '';
    }

    return values.join(', ');
  };
  const frameThicknessLabel = useMemo(() => getThicknessLabel(frameItems), [frameItems]);
  const frameLinearFeetLabel = useMemo(() => {
    if (!frameItems.length) {
      return '';
    }

    const totalFeet = frameItems.reduce((sum, item) => {
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + (length * qty) / 12;
    }, 0);

    return totalFeet.toFixed(2);
  }, [frameItems]);
  const slabThicknessLabel = useMemo(() => getThicknessLabel(slabItems), [slabItems]);
  const panelThicknessLabel = useMemo(() => getThicknessLabel(panelItems), [panelItems]);
  const printSections = useMemo(
    () => [
      { id: 'frame', title: 'Stiles & Rails', items: frameItems },
      { id: 'slab', title: 'Slabs', items: slabItems },
      { id: 'panel', title: 'Panels', items: panelItems },
    ].filter((section) => section.items.length > 0),
    [frameItems, panelItems, slabItems],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [jobData, styles, categories] = await Promise.all([GetJob(jobId), LoadDoorStyles(), GetOverlayCategories()]);
        setJob(jobData);
        setDoorStyles(styles || []);
        setOverlayCategories(categories || []);
        setRows((jobData?.doors || []).map((door) => mapDoorToRow(door, jobData.defaultStyleId, jobData.defaultOverlay)));
        setDraftRow(createDoorDraft(jobData.defaultStyleId, jobData.defaultOverlay));
      } catch (error) {
        showToast('Failed to load job details', 'error');
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
      showToast(parsed.error, 'error');
      return;
    }

    const nextRows = [...rows, draftRow];
    const saved = await saveDoors(nextRows, { successMessage: 'Door added' });
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
    const saved = await saveDoors(nextRows, { successMessage: 'Door removed' });
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
    const saved = await saveDoors(nextRows, { successMessage: 'Door updated' });
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
    setRows((latestJob?.doors || []).map((door) => mapDoorToRow(door, latestJob.defaultStyleId, latestJob.defaultOverlay)));
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
      showToast('Unable to generate cut list for this job', 'error');
    } finally {
      setIsLoadingCutList(false);
    }
  };

  const saveDoors = async (rowsToSave = rows, { silentSuccess = false, successMessage = 'Doors saved' } = {}) => {
    if (!job) {
      return false;
    }

    const doors = [];
    for (const row of rowsToSave) {
      const parsed = parseDoorRow(row);
      if (parsed.error) {
        showToast(parsed.error, 'error');
        return false;
      }
      doors.push(parsed.door);
    }

    setIsSaving(true);
    try {
      const updated = await SaveJob({ ...job, doors });
      setJob(updated);
      setRows((updated?.doors || []).map((door) => mapDoorToRow(door, updated.defaultStyleId, updated.defaultOverlay)));
      if (!silentSuccess) {
        showToast(successMessage, 'success');
      }
      return true;
    } catch (error) {
      showToast('Failed to save doors', 'error');
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

  const handlePrintCutList = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">Loading job...</div>;
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
            Back to Jobs
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{job.customerName}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {job.name}
              {' · '}
              Overlay: {selectedOverlayCategory?.name || 'None'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void onCutListClick()}>
            <ListChecks size={16} className="mr-2" />
            {showCutList ? 'Hide Cut List' : 'Cut List'}
          </Button>
          <Button onClick={() => void saveDoors()} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Doors'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Add Door</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1.2fr_0.45fr_0.6fr_0.6fr_1.8fr] gap-2">
            <Input label="Door Name" value={draftRow.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Base Left" />
            <Input label="Qty" type="text" inputMode="numeric" value={draftRow.qty} onChange={(event) => updateDraft('qty', event.target.value.replace(/[^0-9]/g, ''))} />
            <Input label="Opening Width" className="max-w-28" type="text" inputMode="decimal" value={draftRow.opWidth} onChange={(event) => updateDraft('opWidth', event.target.value)} placeholder="15 1/2" />
            <Input label="Opening Height" className="max-w-28" type="text" inputMode="decimal" value={draftRow.opHeight} onChange={(event) => updateDraft('opHeight', event.target.value)} placeholder="30" />
            <div>
                {renderStyleSelectors(draftRow, updateDraft, styleFamilies, styleByID)}
            </div>
          </div>

          {renderDoorSettings(draftRow, updateDraft, overlayItems, drawerFrontItems)}

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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Door Entries</h3>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No doors yet. Add your first door entry.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Door</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Opening</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Finished Size</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Style</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const styleName = (() => {
                      const selectedStyle = findStyleById(doorStyles || [], row.styleId);
                      if (!selectedStyle) {
                        return '-';
                      }
                      return getStyleDisplayName(selectedStyle);
                    })();
                    return (
                      <tr key={row.id} className="border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{getDoorQty(row)}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{row.opWidth} x {row.opHeight}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{row.doorType === 'butt' ? 'Butt' : 'Single'}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{getFinishedSizeSummary(row)}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{styleName}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(row)} title="Edit door">
                              <Pencil size={14} className="text-zinc-500 dark:text-zinc-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void removeRow(row.id)} title="Remove door">
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

      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Door" maxWidthClass="max-w-7xl">
        {editRow ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1.2fr_0.45fr_0.6fr_0.6fr_1.8fr] gap-2">
              <Input label="Door Name" value={editRow.name} onChange={(event) => updateEdit('name', event.target.value)} placeholder="Base Left" />
              <Input label="Qty" type="text" inputMode="numeric" value={editRow.qty} onChange={(event) => updateEdit('qty', event.target.value.replace(/[^0-9]/g, ''))} />
              <Input label="Opening Width" className="max-w-28" type="text" inputMode="decimal" value={editRow.opWidth} onChange={(event) => updateEdit('opWidth', event.target.value)} placeholder="15 1/2" />
              <Input label="Opening Height" className="max-w-28" type="text" inputMode="decimal" value={editRow.opHeight} onChange={(event) => updateEdit('opHeight', event.target.value)} placeholder="30" />
              <div>
                {renderStyleSelectors(editRow, updateEdit, styleFamilies, styleByID)}
              </div>
            </div>

            {renderDoorSettings(editRow, updateEdit, overlayItems, drawerFrontItems)}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
              <Button onClick={() => void saveEditedDoor()} disabled={isSaving}>Save Door</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {showCutList ? (
        <Card className="print-cutlist-root">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cut List</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-700">
                  {job.customerName} - {job.name}
                </p>
              </div>
              <div className="no-print flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handlePrintCutList}>
                  <Printer size={14} className="mr-1" />
                  Print
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void fetchCutList({ reloadJob: true })}>
                  <RefreshCw size={14} className="mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingCutList ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating cut list...</p>
            ) : !cutList || !cutList.items || cutList.items.length === 0 || printSections.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No cut list parts yet. Add doors and save to generate.</p>
            ) : (
              <>
                {printSections.map((section) => (
                <div key={section.id} className="print-cutlist-section">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{section.title}</h4>
                    <div className="flex items-center gap-4">
                      {section.id === 'frame' && frameThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {frameThicknessLabel}</span> : null}
                      {section.id === 'slab' && slabThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {slabThicknessLabel}</span> : null}
                      {section.id === 'panel' && panelThicknessLabel ? <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thickness: {panelThicknessLabel}</span> : null}
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
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Part</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Qty</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Width</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Length</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item, index) => (
                          <tr key={`${item.part}-${item.label}-${index}`} className="border-b border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                            <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.part}</td>
                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{item.qty}</td>
                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{item.widthFormatted || '-'}</td>
                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{item.lengthFormatted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {section.id === 'frame' && frameLinearFeetLabel ? (
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
