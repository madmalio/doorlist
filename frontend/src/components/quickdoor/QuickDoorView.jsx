import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { GenerateQuickDoorCutList, GetOverlayCategories, LoadDoorStyles } from '../../../wailsjs/go/main/App';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { useMeasurement } from '../ui/MeasurementProvider';
import { formatMeasurement } from '../../lib/measurements';
import { formatLengthDisplay, formatLengthInput, parseLengthInput } from '../../lib/units';
import { getStyleVariantLabel, groupStylesByFamily, styleMatchesOverlayType } from '../../lib/styleCatalog';
import { printQuickDoorSheet } from '../../lib/quickDoorPrint';

const emptyDraft = {
  name: '',
  qty: '1',
  opWidth: '',
  opHeight: '',
  styleFamily: '',
  styleId: '',
  usePreset: false,
  overlayCategoryId: '',
  overlayPresetId: '',
  overlayLeft: '',
  overlayRight: '',
  overlayTop: '',
  overlayBottom: '',
  doorType: 'single',
  buttGap: '',
  panelLayout: 'single',
  slabGrain: 'mdf',
};

function fmtLength(inches, measurementSystem) {
  return formatLengthDisplay(formatMeasurement(Number(inches) || 0), measurementSystem);
}

function getDoorCountNote(report) {
  const qty = Number(report?.qty) || 0;
  if (report?.overlayType === 'drawer-front') {
    return `Creates ${qty} drawer front${qty === 1 ? '' : 's'}`;
  }
  if (report?.doorType === 'butt') {
    return `Creates ${qty} set${qty === 1 ? '' : 's'} of double doors`;
  }
  return `Creates ${qty} door${qty === 1 ? '' : 's'}`;
}

function formatSlabGrain(value) {
  if (value === 'vertical') {
    return 'Vertical';
  }
  if (value === 'horizontal') {
    return 'Horizontal';
  }
  return 'MDF';
}

function QuickDoorDiagram({ report, measurementSystem }) {
  if (!report) {
    return null;
  }

  const widthLabel = report.doorType === 'butt' && report.leafWidth > 0
    ? fmtLength(report.leafWidth, measurementSystem)
    : fmtLength(report.finishedWidth, measurementSystem);

  return (
    <div className="p-1 text-zinc-900 dark:text-zinc-100">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Door Diagram</p>
      {report.isSlab ? (
        <svg viewBox="0 0 220 320" className="mx-auto h-72 w-full max-w-[220px]" role="img" aria-label="Door diagram">
          <rect x="30" y="20" width="160" height="260" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text x="110" y="155" textAnchor="middle" fontSize="16" fill="currentColor">A</text>
          <text x="110" y="302" textAnchor="middle" fontSize="12" fill="currentColor">{widthLabel}</text>
          <text x="206" y="150" textAnchor="middle" fontSize="12" fill="currentColor" transform="rotate(90 206 150)">{fmtLength(report.finishedHeight, measurementSystem)}</text>
        </svg>
      ) : report.panelLayout === 'two-panel-vertical' ? (
        <svg viewBox="0 0 220 320" className="mx-auto h-72 w-full max-w-[220px]" role="img" aria-label="Door diagram">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="30" y="20" width="160" height="260" />
            <rect x="66" y="57" width="88" height="72" />
            <rect x="66" y="171" width="88" height="72" />
            <line x1="66" y1="20" x2="66" y2="57" />
            <line x1="154" y1="20" x2="154" y2="57" />
            <line x1="66" y1="129" x2="66" y2="171" />
            <line x1="154" y1="129" x2="154" y2="171" />
            <line x1="66" y1="243" x2="66" y2="280" />
            <line x1="154" y1="243" x2="154" y2="280" />
          </g>
          <text x="110" y="42" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <text x="110" y="155" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <text x="110" y="268" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <text x="48" y="156" textAnchor="middle" fontSize="14" fill="currentColor">B</text>
          <text x="172" y="156" textAnchor="middle" fontSize="14" fill="currentColor">B</text>
          <text x="110" y="94" textAnchor="middle" fontSize="16" fill="currentColor">C</text>
          <text x="110" y="207" textAnchor="middle" fontSize="16" fill="currentColor">C</text>
          <text x="110" y="302" textAnchor="middle" fontSize="12" fill="currentColor">{widthLabel}</text>
          <text x="206" y="150" textAnchor="middle" fontSize="12" fill="currentColor" transform="rotate(90 206 150)">{fmtLength(report.finishedHeight, measurementSystem)}</text>
        </svg>
      ) : (
        <svg viewBox="0 0 220 320" className="mx-auto h-72 w-full max-w-[220px]" role="img" aria-label="Door diagram">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="30" y="20" width="160" height="260" />
            <rect x="66" y="57" width="88" height="185" />
            <line x1="66" y1="20" x2="66" y2="57" />
            <line x1="154" y1="20" x2="154" y2="57" />
            <line x1="66" y1="242" x2="66" y2="280" />
            <line x1="154" y1="242" x2="154" y2="280" />
          </g>
          <text x="110" y="42" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <text x="110" y="268" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <text x="48" y="156" textAnchor="middle" fontSize="14" fill="currentColor">B</text>
          <text x="172" y="156" textAnchor="middle" fontSize="14" fill="currentColor">B</text>
          <text x="110" y="160" textAnchor="middle" fontSize="16" fill="currentColor">C</text>
          <text x="110" y="302" textAnchor="middle" fontSize="12" fill="currentColor">{widthLabel}</text>
          <text x="206" y="150" textAnchor="middle" fontSize="12" fill="currentColor" transform="rotate(90 206 150)">{fmtLength(report.finishedHeight, measurementSystem)}</text>
        </svg>
      )}
    </div>
  );
}

export function QuickDoorView({ isOpen, onClose }) {
  const { measurementSystem } = useMeasurement();
  const { showToast } = useToast();
  const [styles, setStyles] = useState([]);
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const doorStyles = useMemo(() => (styles || []).filter((style) => styleMatchesOverlayType(style, 'door', 'top')), [styles]);
  const styleFamilies = useMemo(() => groupStylesByFamily(doorStyles || []), [doorStyles]);
  const selectedFamilyStyles = useMemo(
    () => styleFamilies.find((group) => group.family === draft.styleFamily)?.styles || [],
    [styleFamilies, draft.styleFamily],
  );
  const isSlabFamily = useMemo(
    () => selectedFamilyStyles.length > 0 && selectedFamilyStyles.every((style) => style.isSlab),
    [selectedFamilyStyles],
  );
  const selectedStyle = useMemo(() => doorStyles.find((style) => style.id === draft.styleId) || null, [doorStyles, draft.styleId]);
  const selectedCategory = useMemo(() => overlayCategories.find((category) => category.id === draft.overlayCategoryId) || null, [overlayCategories, draft.overlayCategoryId]);
  const overlayPresets = useMemo(() => selectedCategory?.doorItems || selectedCategory?.items || [], [selectedCategory]);
  const selectedPreset = useMemo(() => overlayPresets.find((preset) => preset.id === draft.overlayPresetId) || null, [overlayPresets, draft.overlayPresetId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedStyles, loadedCategories] = await Promise.all([LoadDoorStyles(), GetOverlayCategories()]);
        setStyles(loadedStyles || []);
        setOverlayCategories(loadedCategories || []);
      } catch {
        showToast('Failed to load quick door data', 'error');
      } finally {
        setHasLoadedData(true);
      }
    };
    void load();
  }, [showToast]);

  useEffect(() => {
    if (!isOpen) {
      setIsSetupOpen(false);
      setIsPreviewOpen(false);
      return;
    }

    if (!hasLoadedData) {
      return;
    }

    if (!doorStyles.length) {
      showToast('Create a catalog door style first', 'error');
      onClose?.();
      return;
    }
    setDraft({
      ...emptyDraft,
      buttGap: formatLengthInput(0.125, measurementSystem),
      overlayLeft: formatLengthInput(0.5, measurementSystem),
      overlayRight: formatLengthInput(0.5, measurementSystem),
      overlayTop: formatLengthInput(0.5, measurementSystem),
      overlayBottom: formatLengthInput(0.5, measurementSystem),
    });
    setValidationErrors({});
    setReport(null);
    setIsPreviewOpen(false);
    setIsSetupOpen(true);
  }, [isOpen, doorStyles, measurementSystem, hasLoadedData, onClose, showToast]);

  useEffect(() => {
    if (!isSlabFamily) {
      return;
    }
    const slabStyleId = selectedFamilyStyles[0]?.id || '';
    if (!slabStyleId || draft.styleId === slabStyleId) {
      return;
    }
    setDraft((prev) => ({ ...prev, styleId: slabStyleId }));
    setValidationErrors((prev) => ({ ...prev, styleId: '' }));
  }, [isSlabFamily, selectedFamilyStyles, draft.styleId]);

  const closeAll = () => {
    setIsSetupOpen(false);
    setIsPreviewOpen(false);
    onClose?.();
  };

  const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleFamilyChange = (family) => {
    setDraft((prev) => ({
      ...prev,
      styleFamily: family,
      styleId: '',
    }));
    setValidationErrors((prev) => ({ ...prev, styleFamily: '', styleId: '' }));
  };

  const handleCategoryChange = (categoryId) => {
    const category = overlayCategories.find((entry) => entry.id === categoryId) || null;
    setDraft((prev) => ({
      ...prev,
      overlayCategoryId: categoryId,
      overlayPresetId: '',
      overlayLeft: category?.default ? formatLengthInput(category.default.left, measurementSystem) : '',
      overlayRight: category?.default ? formatLengthInput(category.default.right, measurementSystem) : '',
      overlayTop: category?.default ? formatLengthInput(category.default.top, measurementSystem) : '',
      overlayBottom: category?.default ? formatLengthInput(category.default.bottom, measurementSystem) : '',
    }));
    setValidationErrors((prev) => ({ ...prev, overlayCategoryId: '', overlayPresetId: '' }));
  };

  const handlePresetChange = (presetId) => {
    const preset = overlayPresets.find((item) => item.id === presetId) || null;
    setDraft((prev) => ({
      ...prev,
      overlayPresetId: presetId,
      overlayLeft: preset ? formatLengthInput(preset.left, measurementSystem) : prev.overlayLeft,
      overlayRight: preset ? formatLengthInput(preset.right, measurementSystem) : prev.overlayRight,
      overlayTop: preset ? formatLengthInput(preset.top, measurementSystem) : prev.overlayTop,
      overlayBottom: preset ? formatLengthInput(preset.bottom, measurementSystem) : prev.overlayBottom,
    }));
    setValidationErrors((prev) => ({ ...prev, overlayPresetId: '' }));
  };

  const generate = async () => {
    const qty = Number.parseInt(draft.qty, 10);
    const opWidth = parseLengthInput(draft.opWidth, measurementSystem);
    const opHeight = parseLengthInput(draft.opHeight, measurementSystem);
    const buttGap = parseLengthInput(draft.buttGap, measurementSystem);
    const overlayLeftInput = parseLengthInput(draft.overlayLeft, measurementSystem);
    const overlayRightInput = parseLengthInput(draft.overlayRight, measurementSystem);
    const overlayTopInput = parseLengthInput(draft.overlayTop, measurementSystem);
    const overlayBottomInput = parseLengthInput(draft.overlayBottom, measurementSystem);
    const nextErrors = {};
    if (!draft.styleFamily) {
      nextErrors.styleFamily = 'Select a style family';
    }
    if (!draft.styleId) {
      nextErrors.styleId = 'Select a style';
    }
    if (draft.usePreset && !draft.overlayCategoryId) {
      nextErrors.overlayCategoryId = 'Select an overlay category';
    }
    if (draft.usePreset && !draft.overlayPresetId) {
      nextErrors.overlayPresetId = 'Select an overlay preset';
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Complete required selections', 'error');
      return;
    }

    if (!qty || qty <= 0 || opWidth === null || opHeight === null || !draft.styleId) {
      showToast('Fill required door values', 'error');
      return;
    }
    if (!draft.usePreset && (
      overlayLeftInput === null ||
      overlayRightInput === null ||
      overlayTopInput === null ||
      overlayBottomInput === null
    )) {
      showToast('Enter valid overlay values', 'error');
      return;
    }

    if (draft.usePreset && !selectedPreset) {
      showToast('Select an overlay preset or uncheck preset mode', 'error');
      return;
    }

    const overlayLeft = overlayLeftInput;
    const overlayRight = overlayRightInput;
    const overlayTop = overlayTopInput;
    const overlayBottom = overlayBottomInput;

    setIsGenerating(true);
    try {
      const response = await GenerateQuickDoorCutList({
        name: draft.name || 'Quick Door',
        qty,
        opWidth,
        opHeight,
        styleId: draft.styleId,
        doorType: draft.doorType,
        buttGap: buttGap === null ? 0.125 : buttGap,
        overlayType: 'door',
        drawerFrontPosition: 'top',
        panelLayout: draft.panelLayout,
        slabGrain: draft.slabGrain,
        useCustomOverlay: true,
        overlayLeft,
        overlayRight,
        overlayTop,
        overlayBottom,
      });

      setReport({
        ...response,
        name: draft.name || 'Quick Door',
        styleName: selectedStyle?.name || 'N/A',
        isSlab: Boolean(selectedStyle?.isSlab),
        panelLayout: draft.panelLayout,
        doorType: draft.doorType,
        qty,
        opening: `${fmtLength(opWidth, measurementSystem)} x ${fmtLength(opHeight, measurementSystem)}`,
        finished: `${fmtLength(draft.doorType === 'butt' && response.leafWidth > 0 ? response.leafWidth : response.finishedWidth, measurementSystem)} x ${fmtLength(response.finishedHeight, measurementSystem)}`,
        overlaySummary: `L ${fmtLength(overlayLeft, measurementSystem)} | R ${fmtLength(overlayRight, measurementSystem)} | T ${fmtLength(overlayTop, measurementSystem)} | B ${fmtLength(overlayBottom, measurementSystem)}`,
      });
      setIsSetupOpen(false);
      setIsPreviewOpen(true);
    } catch {
      showToast('Failed to generate quick door sheet', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const printSheet = async () => {
    if (!report) {
      return;
    }
    await printQuickDoorSheet({ report, measurementSystem });
  };

  const frameItems = useMemo(() => (report?.items || []).filter((item) => item.part === 'Stile' || item.part === 'Rail' || item.part === 'Vertical Rail'), [report]);
  const panelItems = useMemo(() => (report?.items || []).filter((item) => item.part === 'Panel'), [report]);
  const slabItems = useMemo(() => (report?.items || []).filter((item) => item.part === 'Slab'), [report]);
  const frameLengthLabel = useMemo(() => {
    if (!frameItems.length) {
      return '';
    }
    const totalFeet = frameItems.reduce((sum, item) => {
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + (length * qty) / 12;
    }, 0);
    if (measurementSystem === 'metric') {
      return `Total Length: ${(totalFeet * 0.3048).toFixed(2)} m`;
    }
    return `Linear Feet: ${totalFeet.toFixed(2)}`;
  }, [frameItems, measurementSystem]);
  const panelAreaLabel = useMemo(() => {
    if (!panelItems.length) {
      return '';
    }
    const totalSquareFeet = panelItems.reduce((sum, item) => {
      const width = Number(item.width) || 0;
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + ((width * length) / 144) * qty;
    }, 0);
    if (measurementSystem === 'metric') {
      return `Total Area: ${(totalSquareFeet * 0.092903).toFixed(2)} m^2`;
    }
    return `Square Feet: ${totalSquareFeet.toFixed(2)}`;
  }, [panelItems, measurementSystem]);
  const slabAreaLabel = useMemo(() => {
    if (!slabItems.length) {
      return '';
    }
    const totalSquareFeet = slabItems.reduce((sum, item) => {
      const width = Number(item.width) || 0;
      const length = Number(item.length) || 0;
      const qty = Number(item.qty) || 0;
      return sum + ((width * length) / 144) * qty;
    }, 0);
    if (measurementSystem === 'metric') {
      return `Total Area: ${(totalSquareFeet * 0.092903).toFixed(2)} m^2`;
    }
    return `Square Feet: ${totalSquareFeet.toFixed(2)}`;
  }, [slabItems, measurementSystem]);
  const reopenEditor = () => {
    setIsPreviewOpen(false);
    setIsSetupOpen(true);
  };

  return (
    <>
      <Modal isOpen={isSetupOpen} onClose={closeAll} title="Quick Door Setup" maxWidthClass="max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Pantry Left Door" />
          <Input label="Qty" value={draft.qty} onChange={(event) => updateDraft('qty', event.target.value)} inputMode="numeric" />
          <Input label={`Opening Width (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.opWidth} onChange={(event) => updateDraft('opWidth', event.target.value)} inputMode="decimal" />
          <Input label={`Opening Height (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.opHeight} onChange={(event) => updateDraft('opHeight', event.target.value)} inputMode="decimal" />
          <div className="md:col-span-2 grid gap-4 md:grid-cols-12">
            <div className={draft.doorType === 'butt' ? 'md:col-span-5' : 'md:col-span-6'}>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Door Type</label>
              <select value={draft.doorType} onChange={(event) => updateDraft('doorType', event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="single">Single</option>
                <option value="butt">Butt</option>
              </select>
            </div>
            {draft.doorType === 'butt' ? (
              <div className="md:col-span-2">
                <Input label={`Butt Gap (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.buttGap} onChange={(event) => updateDraft('buttGap', event.target.value)} inputMode="decimal" />
              </div>
            ) : null}
            <div className={draft.doorType === 'butt' ? 'md:col-span-5' : 'md:col-span-6'}>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Style Family</label>
              <select value={draft.styleFamily} onChange={(event) => handleFamilyChange(event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="" disabled>Select style family</option>
                {styleFamilies.map((group) => (
                  <option key={group.family} value={group.family}>{group.family}</option>
                ))}
              </select>
              {validationErrors.styleFamily ? <p className="mt-1 text-xs text-rose-500">{validationErrors.styleFamily}</p> : null}
            </div>
          </div>
          {!isSlabFamily ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Style</label>
              <select value={draft.styleId} onChange={(event) => { updateDraft('styleId', event.target.value); setValidationErrors((prev) => ({ ...prev, styleId: '' })); }} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="" disabled>Select style</option>
                {selectedFamilyStyles.map((style) => (
                  <option key={style.id} value={style.id}>{getStyleVariantLabel(style)}</option>
                ))}
              </select>
              {validationErrors.styleId ? <p className="mt-1 text-xs text-rose-500">{validationErrors.styleId}</p> : null}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Style</label>
              <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                {getStyleVariantLabel(selectedFamilyStyles[0])}
              </div>
            </div>
          )}
          {selectedStyle?.isSlab ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Slab Grain</label>
              <select value={draft.slabGrain} onChange={(event) => updateDraft('slabGrain', event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="mdf">MDF</option>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Panel Layout</label>
              <select value={draft.panelLayout} onChange={(event) => updateDraft('panelLayout', event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="single">Single</option>
                <option value="two-panel-vertical">Two Panel Vertical</option>
              </select>
            </div>
          )}
          <div className="md:col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Overlays</p>
            {!draft.usePreset ? (
              <div className="grid gap-3 md:grid-cols-4">
                <Input label={`Left (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.overlayLeft} onChange={(event) => updateDraft('overlayLeft', event.target.value)} />
                <Input label={`Right (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.overlayRight} onChange={(event) => updateDraft('overlayRight', event.target.value)} />
                <Input label={`Top (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.overlayTop} onChange={(event) => updateDraft('overlayTop', event.target.value)} />
                <Input label={`Bottom (${measurementSystem === 'metric' ? 'mm' : 'in'})`} value={draft.overlayBottom} onChange={(event) => updateDraft('overlayBottom', event.target.value)} />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Overlay Category</label>
                  <select value={draft.overlayCategoryId} onChange={(event) => handleCategoryChange(event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                    <option value="" disabled>Select category</option>
                    {overlayCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {validationErrors.overlayCategoryId ? <p className="mt-1 text-xs text-rose-500">{validationErrors.overlayCategoryId}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Overlay Preset</label>
                  <select value={draft.overlayPresetId} onChange={(event) => handlePresetChange(event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                    <option value="" disabled>Select preset</option>
                    {overlayPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                  {validationErrors.overlayPresetId ? <p className="mt-1 text-xs text-rose-500">{validationErrors.overlayPresetId}</p> : null}
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <input id="quick-use-preset" type="checkbox" checked={draft.usePreset} onChange={(event) => updateDraft('usePreset', event.target.checked)} />
              <label htmlFor="quick-use-preset" className="text-sm text-zinc-700 dark:text-zinc-300">Use overlay preset</label>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeAll}>Cancel</Button>
          <Button onClick={() => void generate()} disabled={isGenerating}>{isGenerating ? 'Generating...' : 'Generate Sheet'}</Button>
        </div>
      </Modal>

      <Modal isOpen={isPreviewOpen} onClose={closeAll} title={report?.name || 'Quick Door'} maxWidthClass="max-w-4xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{report?.styleName} · {report?.doorType}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={reopenEditor}>Back to Edit</Button>
              <Button onClick={() => void printSheet()}>
                <Printer size={16} className="mr-2" />
                Print Sheet
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"><strong>Opening</strong><br />{report?.opening}</div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"><strong>Finished</strong><br />{report?.finished}</div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"><strong>Overlay</strong><br />{report?.overlaySummary}</div>
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{getDoorCountNote(report)}</p>
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <QuickDoorDiagram report={report} measurementSystem={measurementSystem} />
            <div className="space-y-4">
              {[['frame', 'Stiles & Rails', frameItems], ['panel', 'Panels', panelItems], ['slab', 'Slabs', slabItems]].map(([sectionId, title, items]) => (
                items.length ? (
                  <div key={title}>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                            <th className="px-3 py-2 text-left text-xs">Part</th>
                            {sectionId === 'slab' ? <th className="px-3 py-2 text-left text-xs">Grain</th> : null}
                            <th className="px-3 py-2 text-left text-xs">Qty</th>
                            <th className="px-3 py-2 text-left text-xs">Thickness</th>
                            <th className="px-3 py-2 text-left text-xs">Width</th>
                            <th className="px-3 py-2 text-left text-xs">Length</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={`${title}-${item.part}-${idx}`} className="border-b border-zinc-200 dark:border-zinc-800">
                              <td className="px-3 py-2 text-sm">{item.part}</td>
                              {sectionId === 'slab' ? <td className="px-3 py-2 text-sm">{formatSlabGrain(item.slabGrain)}</td> : null}
                              <td className="px-3 py-2 text-sm">{item.qty}</td>
                              <td className="px-3 py-2 text-sm">{fmtLength(item.thickness, measurementSystem)}</td>
                              <td className="px-3 py-2 text-sm">{fmtLength(item.width, measurementSystem)}</td>
                              <td className="px-3 py-2 text-sm">{fmtLength(item.length, measurementSystem)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sectionId === 'frame' && frameLengthLabel ? (
                      <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {frameLengthLabel}
                      </div>
                    ) : null}
                    {sectionId === 'panel' && panelAreaLabel ? (
                      <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {panelAreaLabel}
                      </div>
                    ) : null}
                    {sectionId === 'slab' && slabAreaLabel ? (
                      <div className="mt-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {slabAreaLabel}
                      </div>
                    ) : null}
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
