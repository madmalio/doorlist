import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Database, DoorOpen, Download, Monitor, Moon, Pencil, Plus, Save, Sun, SunMoon, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useTheme } from '../ui/ThemeProvider';
import { cn } from '../../lib/utils';
import { ExportAllData, ExportCatalogData, ExportOverlayData, GetOverlayCategories, ImportAllData, ImportCatalogData, ImportOverlayData, SaveOverlayCategories, WipeAllData } from '../../../wailsjs/go/main/App';
import { formatMeasurement, parseMeasurement } from '../../lib/measurements';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';

const themeOptions = [
  { value: 'light', label: 'Light', description: 'Bright interface for daytime use.', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-glare interface for darker spaces.', Icon: Moon },
  { value: 'system', label: 'System', description: 'Automatically match your OS preference.', Icon: Monitor },
];

const themePreviewPalettes = {
  light: { bg: '#fafafa', panel: '#f4f4f5', panelAlt: '#e4e4e7', border: '#d4d4d8', heading: '#18181b' },
  dark: { bg: '#09090c', panel: '#18181b', panelAlt: '#27272a', border: '#3f3f46', heading: '#f4f4f5' },
  system: { bg: 'linear-gradient(90deg, #fafafa 0%, #f4f4f5 48%, #18181b 52%, #09090c 100%)', panel: '#f4f4f5', panelAlt: '#27272a', border: '#71717a', heading: '#27272a' },
};

function createCategory() {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    doorItems: [],
    drawerFrontItems: [],
  };
}

function createOverlayItem() {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    left: '1/2',
    right: '1/2',
    top: '1/2',
    bottom: '1/2',
  };
}

const overlayCollapsedStorageKey = 'doorlist:overlay-defaults:collapsed-categories';
const wipeConfirmPhrase = 'WIPE ALL DATA';

function readCollapsedCategoryIds(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((value) => String(value));
  } catch {
    return [];
  }
}

function normalizeCategory(category) {
  const mapItems = (items) => (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    name: item.name,
    left: formatMeasurement(item.left),
    right: formatMeasurement(item.right),
    top: formatMeasurement(item.top),
    bottom: formatMeasurement(item.bottom),
  }));

  return {
    id: category.id,
    name: category.name,
    doorItems: mapItems(category.doorItems || category.items),
    drawerFrontItems: mapItems(category.drawerFrontItems),
  };
}

function categoryItemKey(categoryId, group, itemId) {
  return `${categoryId}:${group}:${itemId}`;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('theme');
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(() => readCollapsedCategoryIds(overlayCollapsedStorageKey));
  const [overlayLoaded, setOverlayLoaded] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState('');

  const [addingItemTarget, setAddingItemTarget] = useState(null);
  const [newItemDraft, setNewItemDraft] = useState(createOverlayItem());

  const [editingItemKey, setEditingItemKey] = useState(null);
  const [editingItemDraft, setEditingItemDraft] = useState(null);

  const [isSavingOverlays, setIsSavingOverlays] = useState(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);
  const [isImportingOverlay, setIsImportingOverlay] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportKind, setPendingImportKind] = useState('');
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [isWipingData, setIsWipingData] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const catalogImportRef = useRef(null);
  const overlayImportRef = useRef(null);
  const backupImportRef = useRef(null);
  const { showToast } = useToast();
  const isWipeConfirmed = wipeConfirmText.trim() === wipeConfirmPhrase;

  useEffect(() => {
    const loadOverlayCategories = async () => {
      try {
        const categories = await GetOverlayCategories();
        const safe = Array.isArray(categories) ? categories : [];
        setOverlayCategories(safe.map((category) => normalizeCategory(category)));
      } catch (error) {
        setOverlayCategories([]);
        showToast('Failed to load overlay defaults', 'error');
      } finally {
        setOverlayLoaded(true);
      }
    };

    void loadOverlayCategories();
  }, [showToast]);

  useEffect(() => {
    localStorage.setItem(overlayCollapsedStorageKey, JSON.stringify(collapsedCategoryIds));
  }, [collapsedCategoryIds]);

  useEffect(() => {
    if (!overlayLoaded) {
      return;
    }
    const validIds = new Set(overlayCategories.map((category) => category.id));
    setCollapsedCategoryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [overlayCategories, overlayLoaded]);

  const updateCategory = (categoryId, updater) => {
    setOverlayCategories((prev) => prev.map((category) => (category.id === categoryId ? updater(category) : category)));
  };

  const addCategory = () => {
    const category = createCategory();
    setOverlayCategories((prev) => [...prev, category]);
    setCollapsedCategoryIds((prev) => prev.filter((id) => id !== category.id));
    setEditingCategoryId(category.id);
    setCategoryNameDraft('');
  };

  const removeCategory = (categoryId) => {
    setOverlayCategories((prev) => prev.filter((category) => category.id !== categoryId));
    if (editingCategoryId === categoryId) {
      setEditingCategoryId(null);
      setCategoryNameDraft('');
    }
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategoryIds((prev) => (prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]));
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryNameDraft(category.name || '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryNameDraft('');
  };

  const saveEditCategory = (categoryId, { notifyOnEmpty = true } = {}) => {
    if (!categoryNameDraft.trim()) {
      if (notifyOnEmpty) {
        showToast('Category name is required', 'error');
      }
      return;
    }

    updateCategory(categoryId, (category) => ({ ...category, name: categoryNameDraft.trim() }));
    cancelEditCategory();
  };

  const getCategoryItems = (category, group) => (group === 'drawerFrontItems' ? (category.drawerFrontItems || []) : (category.doorItems || []));

  const setCategoryItems = (categoryId, group, updater) => {
    updateCategory(categoryId, (category) => {
      const nextItems = updater(getCategoryItems(category, group));
      if (group === 'drawerFrontItems') {
        return { ...category, drawerFrontItems: nextItems };
      }
      return { ...category, doorItems: nextItems };
    });
  };

  const startAddItem = (categoryId, group) => {
    setAddingItemTarget({ categoryId, group });
    setNewItemDraft(createOverlayItem());
  };

  const cancelAddItem = () => {
    setAddingItemTarget(null);
    setNewItemDraft(createOverlayItem());
  };

  const commitAddItem = (categoryId, group) => {
    if (!newItemDraft.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    const left = parseMeasurement(newItemDraft.left);
    const right = parseMeasurement(newItemDraft.right);
    const top = parseMeasurement(newItemDraft.top);
    const bottom = parseMeasurement(newItemDraft.bottom);
    if (left === null || right === null || top === null || bottom === null) {
      showToast('Item overlay values must be valid fractions or decimals', 'error');
      return;
    }

    setCategoryItems(categoryId, group, (items) => items.concat({
      ...newItemDraft,
      name: newItemDraft.name.trim(),
    }));
    cancelAddItem();
  };

  const removeItem = (categoryId, group, itemId) => {
    setCategoryItems(categoryId, group, (items) => items.filter((item) => item.id !== itemId));
  };

  const startEditItem = (categoryId, group, item) => {
    setEditingItemKey(categoryItemKey(categoryId, group, item.id));
    setEditingItemDraft({ ...item });
  };

  const cancelEditItem = () => {
    setEditingItemKey(null);
    setEditingItemDraft(null);
  };

  const saveEditItem = (categoryId, group, itemId) => {
    if (!editingItemDraft) {
      return;
    }

    if (!editingItemDraft.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    const left = parseMeasurement(editingItemDraft.left);
    const right = parseMeasurement(editingItemDraft.right);
    const top = parseMeasurement(editingItemDraft.top);
    const bottom = parseMeasurement(editingItemDraft.bottom);
    if (left === null || right === null || top === null || bottom === null) {
      showToast('Item overlay values must be valid fractions or decimals', 'error');
      return;
    }

    setCategoryItems(categoryId, group, (items) => items.map((item) => (item.id === itemId ? { ...editingItemDraft, name: editingItemDraft.name.trim() } : item)));
    cancelEditItem();
  };

  const saveOverlayDefaults = async () => {
    const payload = [];

    for (const category of overlayCategories) {
      if (!category.name.trim()) {
        showToast('Each category needs a name', 'error');
        return;
      }

      const mapItems = (items) => {
        const normalized = [];
        for (const item of items) {
          if (!item.name.trim()) {
            throw new Error('Each item needs a name');
          }

          const left = parseMeasurement(item.left);
          const right = parseMeasurement(item.right);
          const top = parseMeasurement(item.top);
          const bottom = parseMeasurement(item.bottom);
          if (left === null || right === null || top === null || bottom === null) {
            throw new Error('Overlay values must be valid fractions or decimals');
          }

          normalized.push({ id: item.id, name: item.name.trim(), left, right, top, bottom });
        }

        return normalized;
      };

      try {
        payload.push({
          id: category.id,
          name: category.name.trim(),
          doorItems: mapItems(category.doorItems || []),
          drawerFrontItems: mapItems(category.drawerFrontItems || []),
        });
      } catch (error) {
        showToast(error.message || 'Invalid overlay item', 'error');
        return;
      }
    }

    setIsSavingOverlays(true);
    try {
      const saved = await SaveOverlayCategories(payload);
      const safe = Array.isArray(saved) ? saved : [];
      setOverlayCategories(safe.map((category) => normalizeCategory(category)));
      showToast('Overlay defaults saved', 'success');
    } catch (error) {
      showToast('Failed to save overlay defaults', 'error');
    } finally {
      setIsSavingOverlays(false);
    }
  };

  const downloadJson = (filenamePrefix, payload) => {
    const dateText = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}-${dateText}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCatalog = async () => {
    try {
      const payload = await ExportCatalogData();
      downloadJson('cutlogic-catalog', payload);
      showToast('Catalog exported', 'success');
    } catch (error) {
      showToast('Failed to export catalog', 'error');
    }
  };

  const startImportConfirmation = (kind, file) => {
    if (!file) {
      return;
    }

    setPendingImportKind(kind);
    setPendingImportFile(file);
    setIsImportConfirmOpen(true);
  };

  const handleImportCatalogFile = async (file) => {
    if (!file) {
      return;
    }

    setIsImportingCatalog(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const styles = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.styles) ? parsed.styles : []);
      await ImportCatalogData({ version: 1, styles, exportedAt: parsed?.exportedAt || undefined });
      showToast('Catalog imported', 'success');
    } catch (error) {
      showToast('Failed to import catalog JSON', 'error');
    } finally {
      setIsImportingCatalog(false);
      if (catalogImportRef.current) {
        catalogImportRef.current.value = '';
      }
    }
  };

  const handleExportOverlay = async () => {
    try {
      const payload = await ExportOverlayData();
      downloadJson('cutlogic-overlay', payload);
      showToast('Overlay defaults exported', 'success');
    } catch (error) {
      showToast('Failed to export overlay defaults', 'error');
    }
  };

  const handleImportOverlayFile = async (file) => {
    if (!file) {
      return;
    }

    setIsImportingOverlay(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const categories = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.overlayCategories) ? parsed.overlayCategories : []);
      const saved = await ImportOverlayData({ version: 1, overlayCategories: categories, exportedAt: parsed?.exportedAt || undefined });
      setOverlayCategories((saved || []).map((category) => normalizeCategory(category)));
      showToast('Overlay defaults imported', 'success');
    } catch (error) {
      showToast('Failed to import overlay defaults JSON', 'error');
    } finally {
      setIsImportingOverlay(false);
      if (overlayImportRef.current) {
        overlayImportRef.current.value = '';
      }
    }
  };

  const handleExportAllData = async () => {
    try {
      const payload = await ExportAllData();
      downloadJson('cutlogic-backup', payload);
      showToast('Full backup exported', 'success');
    } catch (error) {
      showToast('Failed to export full backup', 'error');
    }
  };

  const handleImportAllDataFile = async (file) => {
    if (!file) {
      return;
    }

    setIsImportingBackup(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await ImportAllData(parsed);
      const categories = await GetOverlayCategories();
      setOverlayCategories((categories || []).map((category) => normalizeCategory(category)));
      showToast('Full backup imported', 'success');
    } catch (error) {
      showToast('Failed to import full backup JSON', 'error');
    } finally {
      setIsImportingBackup(false);
      if (backupImportRef.current) {
        backupImportRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    const kind = pendingImportKind;
    const file = pendingImportFile;

    setIsImportConfirmOpen(false);
    setPendingImportKind('');
    setPendingImportFile(null);

    if (!file) {
      return;
    }

    if (kind === 'catalog') {
      await handleImportCatalogFile(file);
      return;
    }
    if (kind === 'overlay') {
      await handleImportOverlayFile(file);
      return;
    }
    if (kind === 'backup') {
      await handleImportAllDataFile(file);
    }
  };

  const handleWipeAllData = async () => {
    setIsWipingData(true);
    try {
      await WipeAllData();
      const categories = await GetOverlayCategories();
      setOverlayCategories((categories || []).map((category) => normalizeCategory(category)));
      setWipeConfirmText('');
      setIsWipeModalOpen(false);
      showToast('All app data wiped', 'success');
    } catch (error) {
      showToast('Failed to wipe all app data', 'error');
    } finally {
      setIsWipingData(false);
    }
  };

  const renderItemList = (category, group, title) => {
    const items = getCategoryItems(category, group);
    const showAddingRow = addingItemTarget?.categoryId === category.id && addingItemTarget?.group === group;

    return (
      <div className="rounded-md border border-zinc-200 bg-white/80 p-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{items.length} items</span>
        </div>

        <div className="space-y-1.5">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No items yet.</p>
          ) : (
            items.map((item) => {
              const rowKey = categoryItemKey(category.id, group, item.id);
              const isEditingItem = editingItemKey === rowKey;

              return (
                <div key={item.id} className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/50">
                  {isEditingItem ? (
                    <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]">
                      <Input label="Item" value={editingItemDraft?.name || ''} onChange={(event) => setEditingItemDraft((prev) => ({ ...(prev || item), name: event.target.value }))} placeholder="Base" />
                      <Input label="Left" value={editingItemDraft?.left || ''} onChange={(event) => setEditingItemDraft((prev) => ({ ...(prev || item), left: event.target.value }))} placeholder="1/2" />
                      <Input label="Right" value={editingItemDraft?.right || ''} onChange={(event) => setEditingItemDraft((prev) => ({ ...(prev || item), right: event.target.value }))} placeholder="1/2" />
                      <Input label="Top" value={editingItemDraft?.top || ''} onChange={(event) => setEditingItemDraft((prev) => ({ ...(prev || item), top: event.target.value }))} placeholder="1/2" />
                      <Input label="Bottom" value={editingItemDraft?.bottom || ''} onChange={(event) => setEditingItemDraft((prev) => ({ ...(prev || item), bottom: event.target.value }))} placeholder="1/2" />
                      <div className="flex items-end">
                        <Button variant="ghost" size="sm" onClick={() => saveEditItem(category.id, group, item.id)}>
                          <Check size={14} className="text-emerald-500" />
                        </Button>
                      </div>
                      <div className="flex items-end">
                        <Button variant="ghost" size="sm" onClick={cancelEditItem}>
                          <X size={14} className="text-zinc-500" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid items-center gap-3 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
                      <span className="text-zinc-700 dark:text-zinc-300">L {item.left}</span>
                      <span className="text-zinc-700 dark:text-zinc-300">R {item.right}</span>
                      <span className="text-zinc-700 dark:text-zinc-300">T {item.top}</span>
                      <span className="text-zinc-700 dark:text-zinc-300">B {item.bottom}</span>
                      <Button variant="ghost" size="sm" onClick={() => startEditItem(category.id, group, item)}>
                        <Pencil size={14} className="text-zinc-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(category.id, group, item.id)}>
                        <Trash2 size={14} className="text-rose-500" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {showAddingRow ? (
            <div className="rounded bg-zinc-50 p-2 dark:bg-zinc-800/50">
              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]">
                <Input label="Item" value={newItemDraft.name} onChange={(event) => setNewItemDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="Upper" />
                <Input label="Left" value={newItemDraft.left} onChange={(event) => setNewItemDraft((prev) => ({ ...prev, left: event.target.value }))} placeholder="1/2" />
                <Input label="Right" value={newItemDraft.right} onChange={(event) => setNewItemDraft((prev) => ({ ...prev, right: event.target.value }))} placeholder="1/2" />
                <Input label="Top" value={newItemDraft.top} onChange={(event) => setNewItemDraft((prev) => ({ ...prev, top: event.target.value }))} placeholder="1/2" />
                <Input label="Bottom" value={newItemDraft.bottom} onChange={(event) => setNewItemDraft((prev) => ({ ...prev, bottom: event.target.value }))} placeholder="1/2" />
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => commitAddItem(category.id, group)}>
                    <Check size={14} className="text-emerald-500" />
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={cancelAddItem}>
                    <X size={14} className="text-zinc-500" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => startAddItem(category.id, group)} className="w-full">
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Sections</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              type="button"
              onClick={() => setActiveSection('theme')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'theme'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )}
            >
              <SunMoon size={16} />
              Theme
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('overlay-defaults')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'overlay-defaults'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )}
            >
              <DoorOpen size={16} />
              Overlay Defaults
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('data')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'data'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )}
            >
              <Database size={16} />
              Data
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSection === 'theme' ? 'Theme' : activeSection === 'data' ? 'Data Management' : 'Overlay Defaults'}</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSection === 'theme' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map(({ value, label, description, Icon }) => {
                    const isSelected = theme === value;
                    const previewPalette = themePreviewPalettes[value];

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-all',
                          'hover:border-zinc-400 hover:bg-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
                          isSelected
                            ? 'border-zinc-300 bg-zinc-100 text-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,0.2)] dark:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                            : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300',
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon size={16} />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          {isSelected ? <Check size={16} className="text-emerald-500 dark:text-green-400" /> : null}
                        </div>
                        <div className="mb-3 h-12 rounded-md border p-1" style={{ borderColor: previewPalette.border, background: previewPalette.bg }}>
                          <div className="h-2 w-10 rounded-sm" style={{ background: previewPalette.heading }} />
                          <div className="mt-1 grid grid-cols-2 gap-1">
                            <span className="h-6 rounded-sm" style={{ background: previewPalette.panel }} />
                            <span className="h-6 rounded-sm" style={{ background: previewPalette.panelAlt }} />
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Theme previews apply instantly and save automatically.</p>
              </>
            ) : activeSection === 'data' ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Catalog JSON</h4>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Export or import catalog styles (door style families and variants).</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleExportCatalog()}>
                      <Download size={16} className="mr-2" />
                      Export JSON
                    </Button>
                    <Button variant="secondary" onClick={() => catalogImportRef.current?.click()} disabled={isImportingCatalog}>
                      <Upload size={16} className="mr-2" />
                      {isImportingCatalog ? 'Importing...' : 'Import JSON'}
                    </Button>
                    <input
                      ref={catalogImportRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        startImportConfirmation('catalog', file || null);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Overlay JSON</h4>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Export or import overlay default categories and their door/drawer items.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleExportOverlay()}>
                      <Download size={16} className="mr-2" />
                      Export JSON
                    </Button>
                    <Button variant="secondary" onClick={() => overlayImportRef.current?.click()} disabled={isImportingOverlay}>
                      <Upload size={16} className="mr-2" />
                      {isImportingOverlay ? 'Importing...' : 'Import JSON'}
                    </Button>
                    <input
                      ref={overlayImportRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        startImportConfirmation('overlay', file || null);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Full Backup JSON</h4>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Export all app data to one file. Import replaces current jobs, catalog, and overlays.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleExportAllData()}>
                      <Download size={16} className="mr-2" />
                      Export All Data
                    </Button>
                    <Button variant="secondary" onClick={() => backupImportRef.current?.click()} disabled={isImportingBackup}>
                      <Upload size={16} className="mr-2" />
                      {isImportingBackup ? 'Importing Backup...' : 'Import All Data'}
                    </Button>
                    <input
                      ref={backupImportRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        startImportConfirmation('backup', file || null);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-rose-300/80 bg-rose-50 p-4 dark:border-rose-900/80 dark:bg-rose-950/20">
                  <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Danger Zone</h4>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Permanently wipe all jobs, catalog styles, and overlay defaults.</p>
                  <div className="mt-4">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setWipeConfirmText('');
                        setIsWipeModalOpen(true);
                      }}
                      disabled={isWipingData || isImportingBackup}
                    >
                      <AlertTriangle size={16} className="mr-2" />
                      {isWipingData ? 'Wiping Data...' : 'Wipe All Data'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Create overlay categories. Each category contains a Doors list and a Drawer Fronts list.</p>
                  <Button variant="secondary" size="sm" onClick={addCategory}>
                    <Plus size={14} className="mr-1" />
                    Add Category
                  </Button>
                </div>

                <div className="space-y-2">
                  {overlayCategories.length === 0 ? (
                    <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                      No categories yet. Click <span className="font-medium">Add Category</span>.
                    </div>
                  ) : null}

                  {overlayCategories.map((category) => (
                    <div key={category.id} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-200 p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          {collapsedCategoryIds.includes(category.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {editingCategoryId === category.id ? (
                          <>
                            <Input
                              value={categoryNameDraft}
                              onChange={(event) => setCategoryNameDraft(event.target.value)}
                              onBlur={() => saveEditCategory(category.id, { notifyOnEmpty: false })}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  saveEditCategory(category.id);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelEditCategory();
                                }
                              }}
                              placeholder="Overlay Category"
                              className="flex-1"
                            />
                            <Button variant="ghost" size="sm" onClick={() => saveEditCategory(category.id)}>
                              <Check size={14} className="text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEditCategory}>
                              <X size={14} className="text-zinc-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.name || 'Untitled Category'}</span>
                            <Button variant="ghost" size="sm" onClick={() => startEditCategory(category)}>
                              <Pencil size={14} className="text-zinc-500" />
                            </Button>
                          </>
                        )}

                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {(category.doorItems || []).length} door / {(category.drawerFrontItems || []).length} drawer
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => removeCategory(category.id)}>
                          <Trash2 size={14} className="text-rose-500" />
                        </Button>
                      </div>

                      {!collapsedCategoryIds.includes(category.id) ? (
                        <div className="space-y-3 pt-2">
                          {renderItemList(category, 'doorItems', 'Doors')}
                          {renderItemList(category, 'drawerFrontItems', 'Drawer Fronts')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void saveOverlayDefaults()} disabled={isSavingOverlays}>
                    <Save size={16} className="mr-2" />
                    {isSavingOverlays ? 'Saving...' : 'Save Overlay Defaults'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          if (!isImportingCatalog && !isImportingOverlay && !isImportingBackup) {
            setIsImportConfirmOpen(false);
            setPendingImportKind('');
            setPendingImportFile(null);
          }
        }}
        title="Confirm Import"
      >
        <div className="space-y-4">
          <p className="text-zinc-700 dark:text-zinc-300">
            {pendingImportKind === 'catalog'
              ? 'Importing catalog JSON will replace all existing catalog styles.'
              : pendingImportKind === 'overlay'
                ? 'Importing overlay JSON will replace all existing overlay defaults.'
                : 'Importing full backup will replace all current app data.'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsImportConfirmOpen(false);
                setPendingImportKind('');
                setPendingImportFile(null);
              }}
              disabled={isImportingCatalog || isImportingOverlay || isImportingBackup}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmImport()}
              disabled={isImportingCatalog || isImportingOverlay || isImportingBackup}
            >
              {isImportingCatalog || isImportingOverlay || isImportingBackup ? 'Importing...' : 'Import and Replace'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isWipeModalOpen}
        onClose={() => {
          if (!isWipingData) {
            setWipeConfirmText('');
            setIsWipeModalOpen(false);
          }
        }}
        title="Wipe All Data"
      >
        <div className="space-y-4">
          <p className="text-zinc-700 dark:text-zinc-300">
            This permanently deletes all jobs, catalog styles, and overlay defaults.
          </p>
          <Input
            label={`Type ${wipeConfirmPhrase} to confirm`}
            value={wipeConfirmText}
            onChange={(event) => setWipeConfirmText(event.target.value)}
            placeholder={wipeConfirmPhrase}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setWipeConfirmText('');
                setIsWipeModalOpen(false);
              }}
              disabled={isWipingData}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleWipeAllData()} disabled={isWipingData || !isWipeConfirmed}>
              {isWipingData ? 'Wiping Data...' : 'Wipe All Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
