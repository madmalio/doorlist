import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, DoorOpen, Monitor, Moon, PanelTop, Pencil, Plus, Save, Sun, SunMoon, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useTheme } from '../ui/ThemeProvider';
import { cn } from '../../lib/utils';
import { GetDrawerFrontCategories, GetOverlayCategories, SaveDrawerFrontCategories, SaveOverlayCategories } from '../../../wailsjs/go/main/App';
import { formatMeasurement, parseMeasurement } from '../../lib/measurements';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

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
    items: [],
  };
}

function createSubcategory() {
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
const drawerCollapsedStorageKey = 'doorlist:drawer-defaults:collapsed-categories';

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

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('theme');
  const [overlayCategories, setOverlayCategories] = useState([]);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(() => readCollapsedCategoryIds(overlayCollapsedStorageKey));
  const [overlayLoaded, setOverlayLoaded] = useState(false);
  const [addingItemForCategoryId, setAddingItemForCategoryId] = useState(null);
  const [newItemDraft, setNewItemDraft] = useState(createSubcategory());
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState('');
  const [editingItemKey, setEditingItemKey] = useState(null);
  const [editingItemDraft, setEditingItemDraft] = useState(null);
  const [isSavingOverlays, setIsSavingOverlays] = useState(false);

  const [drawerFrontCategories, setDrawerFrontCategories] = useState([]);
  const [drawerCollapsedCategoryIds, setDrawerCollapsedCategoryIds] = useState(() => readCollapsedCategoryIds(drawerCollapsedStorageKey));
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const [drawerAddingItemForCategoryId, setDrawerAddingItemForCategoryId] = useState(null);
  const [drawerNewItemDraft, setDrawerNewItemDraft] = useState(createSubcategory());
  const [drawerEditingCategoryId, setDrawerEditingCategoryId] = useState(null);
  const [drawerCategoryNameDraft, setDrawerCategoryNameDraft] = useState('');
  const [drawerEditingItemKey, setDrawerEditingItemKey] = useState(null);
  const [drawerEditingItemDraft, setDrawerEditingItemDraft] = useState(null);
  const [isSavingDrawerDefaults, setIsSavingDrawerDefaults] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const loadOverlayCategories = async () => {
      try {
        const categories = await GetOverlayCategories();
        const safe = Array.isArray(categories) ? categories : [];
        setOverlayCategories(
          safe.map((category) => ({
            id: category.id,
            name: category.name,
            items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
              id: item.id,
              name: item.name,
              left: formatMeasurement(item.left),
              right: formatMeasurement(item.right),
              top: formatMeasurement(item.top),
              bottom: formatMeasurement(item.bottom),
            })),
          })),
        );
      } catch (error) {
        setOverlayCategories([]);
        showToast('Failed to load door defaults', 'error');
      } finally {
        setOverlayLoaded(true);
      }
    };

    void loadOverlayCategories();
  }, [showToast]);

  useEffect(() => {
    const loadDrawerCategories = async () => {
      try {
        const categories = await GetDrawerFrontCategories();
        const safe = Array.isArray(categories) ? categories : [];
        setDrawerFrontCategories(
          safe.map((category) => ({
            id: category.id,
            name: category.name,
            items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
              id: item.id,
              name: item.name,
              left: formatMeasurement(item.left),
              right: formatMeasurement(item.right),
              top: formatMeasurement(item.top),
              bottom: formatMeasurement(item.bottom),
            })),
          })),
        );
      } catch (error) {
        setDrawerFrontCategories([]);
        showToast('Failed to load drawer defaults', 'error');
      } finally {
        setDrawerLoaded(true);
      }
    };

    void loadDrawerCategories();
  }, [showToast]);

  useEffect(() => {
    localStorage.setItem(overlayCollapsedStorageKey, JSON.stringify(collapsedCategoryIds));
  }, [collapsedCategoryIds]);

  useEffect(() => {
    localStorage.setItem(drawerCollapsedStorageKey, JSON.stringify(drawerCollapsedCategoryIds));
  }, [drawerCollapsedCategoryIds]);

  useEffect(() => {
    if (!overlayLoaded) {
      return;
    }
    const validIds = new Set(overlayCategories.map((category) => category.id));
    setCollapsedCategoryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [overlayCategories, overlayLoaded]);

  useEffect(() => {
    if (!drawerLoaded) {
      return;
    }
    const validIds = new Set(drawerFrontCategories.map((category) => category.id));
    setDrawerCollapsedCategoryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [drawerFrontCategories, drawerLoaded]);

  const addCategory = () => {
    const category = createCategory();
    setOverlayCategories((prev) => [...prev, category]);
    setCollapsedCategoryIds((prev) => prev.filter((id) => id !== category.id));
    setEditingCategoryId(category.id);
    setCategoryNameDraft('');
  };
  const removeCategory = (categoryId) => setOverlayCategories((prev) => prev.filter((category) => category.id !== categoryId));
  const updateCategoryName = (categoryId, name) => {
    setOverlayCategories((prev) => prev.map((category) => (category.id === categoryId ? { ...category, name } : category)));
  };
  const removeSubcategory = (categoryId, itemId) => {
    setOverlayCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.filter((item) => item.id !== itemId),
            }
          : category,
      ),
    );
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

    updateCategoryName(categoryId, categoryNameDraft);
    cancelEditCategory();
  };

  const startEditItem = (categoryId, item) => {
    setEditingItemKey(`${categoryId}:${item.id}`);
    setEditingItemDraft({ ...item });
  };

  const cancelEditItem = () => {
    setEditingItemKey(null);
    setEditingItemDraft(null);
  };

  const saveEditItem = (categoryId, itemId) => {
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

    setOverlayCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId
                  ? {
                      ...editingItemDraft,
                      name: editingItemDraft.name.trim(),
                    }
                  : item,
              ),
            }
          : category,
      ),
    );

    cancelEditItem();
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const beginAddItem = (categoryId) => {
    setAddingItemForCategoryId(categoryId);
    setNewItemDraft(createSubcategory());
  };

  const cancelAddItem = () => {
    setAddingItemForCategoryId(null);
    setNewItemDraft(createSubcategory());
  };

  const commitAddItem = (categoryId) => {
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

    setOverlayCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.concat({
                ...newItemDraft,
                name: newItemDraft.name.trim(),
              }),
            }
          : category,
      ),
    );
    cancelAddItem();
  };

  const saveDoorDefaults = async () => {
    const payload = [];

    for (const category of overlayCategories) {
      if (!category.name.trim()) {
        showToast('Each category needs a name', 'error');
        return;
      }

      const items = [];
      for (const item of category.items) {
        if (!item.name.trim()) {
          showToast('Each item needs a name', 'error');
          return;
        }

        const left = parseMeasurement(item.left);
        const right = parseMeasurement(item.right);
        const top = parseMeasurement(item.top);
        const bottom = parseMeasurement(item.bottom);
        if (left === null || right === null || top === null || bottom === null) {
          showToast('Overlay values must be valid fractions or decimals', 'error');
          return;
        }

        items.push({ id: item.id, name: item.name.trim(), left, right, top, bottom });
      }

      payload.push({ id: category.id, name: category.name.trim(), items });
    }

    setIsSavingOverlays(true);
    try {
      const saved = await SaveOverlayCategories(payload);
      const safe = Array.isArray(saved) ? saved : [];
      setOverlayCategories(
        safe.map((category) => ({
          id: category.id,
          name: category.name,
          items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
            id: item.id,
            name: item.name,
            left: formatMeasurement(item.left),
            right: formatMeasurement(item.right),
            top: formatMeasurement(item.top),
            bottom: formatMeasurement(item.bottom),
          })),
        })),
      );
      showToast('Door defaults saved', 'success');
    } catch (error) {
      showToast('Failed to save door defaults', 'error');
    } finally {
      setIsSavingOverlays(false);
    }
  };

  const addDrawerCategory = () => {
    const category = createCategory();
    setDrawerFrontCategories((prev) => [...prev, category]);
    setDrawerCollapsedCategoryIds((prev) => prev.filter((id) => id !== category.id));
    setDrawerEditingCategoryId(category.id);
    setDrawerCategoryNameDraft('');
  };

  const removeDrawerCategory = (categoryId) => setDrawerFrontCategories((prev) => prev.filter((category) => category.id !== categoryId));

  const updateDrawerCategoryName = (categoryId, name) => {
    setDrawerFrontCategories((prev) => prev.map((category) => (category.id === categoryId ? { ...category, name } : category)));
  };

  const removeDrawerSubcategory = (categoryId, itemId) => {
    setDrawerFrontCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.filter((item) => item.id !== itemId),
            }
          : category,
      ),
    );
  };

  const toggleDrawerCategory = (categoryId) => {
    setDrawerCollapsedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const startEditDrawerCategory = (category) => {
    setDrawerEditingCategoryId(category.id);
    setDrawerCategoryNameDraft(category.name || '');
  };

  const cancelEditDrawerCategory = () => {
    setDrawerEditingCategoryId(null);
    setDrawerCategoryNameDraft('');
  };

  const saveEditDrawerCategory = (categoryId, { notifyOnEmpty = true } = {}) => {
    if (!drawerCategoryNameDraft.trim()) {
      if (notifyOnEmpty) {
        showToast('Category name is required', 'error');
      }
      return;
    }

    updateDrawerCategoryName(categoryId, drawerCategoryNameDraft);
    cancelEditDrawerCategory();
  };

  const startEditDrawerItem = (categoryId, item) => {
    setDrawerEditingItemKey(`${categoryId}:${item.id}`);
    setDrawerEditingItemDraft({ ...item });
  };

  const cancelEditDrawerItem = () => {
    setDrawerEditingItemKey(null);
    setDrawerEditingItemDraft(null);
  };

  const saveEditDrawerItem = (categoryId, itemId) => {
    if (!drawerEditingItemDraft) {
      return;
    }

    if (!drawerEditingItemDraft.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    const left = parseMeasurement(drawerEditingItemDraft.left);
    const right = parseMeasurement(drawerEditingItemDraft.right);
    const top = parseMeasurement(drawerEditingItemDraft.top);
    const bottom = parseMeasurement(drawerEditingItemDraft.bottom);
    if (left === null || right === null || top === null || bottom === null) {
      showToast('Item overlay values must be valid fractions or decimals', 'error');
      return;
    }

    setDrawerFrontCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId
                  ? {
                      ...drawerEditingItemDraft,
                      name: drawerEditingItemDraft.name.trim(),
                    }
                  : item,
              ),
            }
          : category,
      ),
    );

    cancelEditDrawerItem();
  };

  const beginAddDrawerItem = (categoryId) => {
    setDrawerAddingItemForCategoryId(categoryId);
    setDrawerNewItemDraft(createSubcategory());
  };

  const cancelAddDrawerItem = () => {
    setDrawerAddingItemForCategoryId(null);
    setDrawerNewItemDraft(createSubcategory());
  };

  const commitAddDrawerItem = (categoryId) => {
    if (!drawerNewItemDraft.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    const left = parseMeasurement(drawerNewItemDraft.left);
    const right = parseMeasurement(drawerNewItemDraft.right);
    const top = parseMeasurement(drawerNewItemDraft.top);
    const bottom = parseMeasurement(drawerNewItemDraft.bottom);
    if (left === null || right === null || top === null || bottom === null) {
      showToast('Item overlay values must be valid fractions or decimals', 'error');
      return;
    }

    setDrawerFrontCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.concat({
                ...drawerNewItemDraft,
                name: drawerNewItemDraft.name.trim(),
              }),
            }
          : category,
      ),
    );
    cancelAddDrawerItem();
  };

  const saveDrawerDefaults = async () => {
    const payload = [];

    for (const category of drawerFrontCategories) {
      if (!category.name.trim()) {
        showToast('Each category needs a name', 'error');
        return;
      }

      const items = [];
      for (const item of category.items) {
        if (!item.name.trim()) {
          showToast('Each item needs a name', 'error');
          return;
        }

        const left = parseMeasurement(item.left);
        const right = parseMeasurement(item.right);
        const top = parseMeasurement(item.top);
        const bottom = parseMeasurement(item.bottom);
        if (left === null || right === null || top === null || bottom === null) {
          showToast('Overlay values must be valid fractions or decimals', 'error');
          return;
        }

        items.push({ id: item.id, name: item.name.trim(), left, right, top, bottom });
      }

      payload.push({ id: category.id, name: category.name.trim(), items });
    }

    setIsSavingDrawerDefaults(true);
    try {
      const saved = await SaveDrawerFrontCategories(payload);
      const safe = Array.isArray(saved) ? saved : [];
      setDrawerFrontCategories(
        safe.map((category) => ({
          id: category.id,
          name: category.name,
          items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
            id: item.id,
            name: item.name,
            left: formatMeasurement(item.left),
            right: formatMeasurement(item.right),
            top: formatMeasurement(item.top),
            bottom: formatMeasurement(item.bottom),
          })),
        })),
      );
      showToast('Drawer front defaults saved', 'success');
    } catch (error) {
      showToast('Failed to save drawer defaults', 'error');
    } finally {
      setIsSavingDrawerDefaults(false);
    }
  };

  const showingDrawerDefaults = activeSection === 'drawer-defaults';
  const defaultsConfig = showingDrawerDefaults
    ? {
        description: 'Create categories, then define drawer front items with overlay values.',
        addCategory: addDrawerCategory,
        categories: drawerFrontCategories,
        collapsedIds: drawerCollapsedCategoryIds,
        toggleCategory: toggleDrawerCategory,
        editingCategoryId: drawerEditingCategoryId,
        categoryNameDraft: drawerCategoryNameDraft,
        setCategoryNameDraft: setDrawerCategoryNameDraft,
        saveEditCategory: saveEditDrawerCategory,
        cancelEditCategory,
        startEditCategory: startEditDrawerCategory,
        removeCategory: removeDrawerCategory,
        editingItemKey: drawerEditingItemKey,
        editingItemDraft: drawerEditingItemDraft,
        setEditingItemDraft: setDrawerEditingItemDraft,
        saveEditItem: saveEditDrawerItem,
        cancelEditItem: cancelEditDrawerItem,
        startEditItem: startEditDrawerItem,
        removeSubcategory: removeDrawerSubcategory,
        addingItemForCategoryId: drawerAddingItemForCategoryId,
        newItemDraft: drawerNewItemDraft,
        setNewItemDraft: setDrawerNewItemDraft,
        commitAddItem: commitAddDrawerItem,
        cancelAddItem: cancelAddDrawerItem,
        beginAddItem: beginAddDrawerItem,
        saveAll: saveDrawerDefaults,
        isSaving: isSavingDrawerDefaults,
        saveLabel: 'Save Drawer Front Defaults',
      }
    : {
        description: 'Create categories, then define subcategories with overlay values.',
        addCategory,
        categories: overlayCategories,
        collapsedIds: collapsedCategoryIds,
        toggleCategory,
        editingCategoryId,
        categoryNameDraft,
        setCategoryNameDraft,
        saveEditCategory,
        cancelEditCategory,
        startEditCategory,
        removeCategory,
        editingItemKey,
        editingItemDraft,
        setEditingItemDraft,
        saveEditItem,
        cancelEditItem,
        startEditItem,
        removeSubcategory,
        addingItemForCategoryId,
        newItemDraft,
        setNewItemDraft,
        commitAddItem,
        cancelAddItem,
        beginAddItem,
        saveAll: saveDoorDefaults,
        isSaving: isSavingOverlays,
        saveLabel: 'Save Door Defaults',
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
              onClick={() => setActiveSection('door-defaults')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'door-defaults'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )}
            >
              <DoorOpen size={16} />
              Door Defaults
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('drawer-defaults')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'drawer-defaults'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )}
            >
              <PanelTop size={16} />
              Drawer Front Defaults
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {activeSection === 'theme' ? 'Theme' : activeSection === 'door-defaults' ? 'Door Defaults' : 'Drawer Front Defaults'}
            </h3>
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
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{defaultsConfig.description}</p>
                  <Button variant="secondary" size="sm" onClick={defaultsConfig.addCategory}>
                    <Plus size={14} className="mr-1" />
                    Add Category
                  </Button>
                </div>

                <div className="space-y-2">
                  {defaultsConfig.categories.length === 0 ? (
                    <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                      No categories yet. Click <span className="font-medium">Add Category</span>.
                    </div>
                  ) : null}

                  {defaultsConfig.categories.map((category) => (
                    <div key={category.id} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-200 p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={() => defaultsConfig.toggleCategory(category.id)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          {defaultsConfig.collapsedIds.includes(category.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {defaultsConfig.editingCategoryId === category.id ? (
                          <>
                            <Input
                              value={defaultsConfig.categoryNameDraft}
                              onChange={(event) => defaultsConfig.setCategoryNameDraft(event.target.value)}
                              onBlur={() => defaultsConfig.saveEditCategory(category.id, { notifyOnEmpty: false })}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  defaultsConfig.saveEditCategory(category.id);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  defaultsConfig.cancelEditCategory();
                                }
                              }}
                              placeholder="Overlay Category"
                              className="flex-1"
                            />
                            <Button variant="ghost" size="sm" onClick={() => defaultsConfig.saveEditCategory(category.id)}>
                              <Check size={14} className="text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={defaultsConfig.cancelEditCategory}>
                              <X size={14} className="text-zinc-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.name || 'Untitled Category'}</span>
                            <Button variant="ghost" size="sm" onClick={() => defaultsConfig.startEditCategory(category)}>
                              <Pencil size={14} className="text-zinc-500" />
                            </Button>
                          </>
                        )}

                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{category.items.length} items</span>
                        <Button variant="ghost" size="sm" onClick={() => defaultsConfig.removeCategory(category.id)}>
                          <Trash2 size={14} className="text-rose-500" />
                        </Button>
                      </div>

                      {!defaultsConfig.collapsedIds.includes(category.id) ? (
                        <div className="space-y-1.5 pt-2">
                          {category.items.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No items yet.</p>
                          ) : (
                            category.items.map((item) => {
                              const rowKey = `${category.id}:${item.id}`;
                              const isEditingItem = defaultsConfig.editingItemKey === rowKey;
                              return (
                                <div key={item.id} className="rounded bg-white/80 p-2 dark:bg-zinc-900">
                                  {isEditingItem ? (
                                    <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]">
                                      <Input label="Item" value={defaultsConfig.editingItemDraft?.name || ''} onChange={(event) => defaultsConfig.setEditingItemDraft((prev) => ({ ...(prev || item), name: event.target.value }))} placeholder="Base" />
                                      <Input label="Left" value={defaultsConfig.editingItemDraft?.left || ''} onChange={(event) => defaultsConfig.setEditingItemDraft((prev) => ({ ...(prev || item), left: event.target.value }))} placeholder="1/2" />
                                      <Input label="Right" value={defaultsConfig.editingItemDraft?.right || ''} onChange={(event) => defaultsConfig.setEditingItemDraft((prev) => ({ ...(prev || item), right: event.target.value }))} placeholder="1/2" />
                                      <Input label="Top" value={defaultsConfig.editingItemDraft?.top || ''} onChange={(event) => defaultsConfig.setEditingItemDraft((prev) => ({ ...(prev || item), top: event.target.value }))} placeholder="1/2" />
                                      <Input label="Bottom" value={defaultsConfig.editingItemDraft?.bottom || ''} onChange={(event) => defaultsConfig.setEditingItemDraft((prev) => ({ ...(prev || item), bottom: event.target.value }))} placeholder="1/2" />
                                      <div className="flex items-end">
                                        <Button variant="ghost" size="sm" onClick={() => defaultsConfig.saveEditItem(category.id, item.id)}>
                                          <Check size={14} className="text-emerald-500" />
                                        </Button>
                                      </div>
                                      <div className="flex items-end">
                                        <Button variant="ghost" size="sm" onClick={defaultsConfig.cancelEditItem}>
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
                                      <Button variant="ghost" size="sm" onClick={() => defaultsConfig.startEditItem(category.id, item)}>
                                        <Pencil size={14} className="text-zinc-500" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => defaultsConfig.removeSubcategory(category.id, item.id)}>
                                        <Trash2 size={14} className="text-rose-500" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {defaultsConfig.addingItemForCategoryId === category.id ? (
                            <div className="rounded bg-white/80 p-2 dark:bg-zinc-900">
                              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]">
                                <Input label="Item" value={defaultsConfig.newItemDraft.name} onChange={(event) => defaultsConfig.setNewItemDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="Upper" />
                                <Input label="Left" value={defaultsConfig.newItemDraft.left} onChange={(event) => defaultsConfig.setNewItemDraft((prev) => ({ ...prev, left: event.target.value }))} placeholder="1/2" />
                                <Input label="Right" value={defaultsConfig.newItemDraft.right} onChange={(event) => defaultsConfig.setNewItemDraft((prev) => ({ ...prev, right: event.target.value }))} placeholder="1/2" />
                                <Input label="Top" value={defaultsConfig.newItemDraft.top} onChange={(event) => defaultsConfig.setNewItemDraft((prev) => ({ ...prev, top: event.target.value }))} placeholder="1/2" />
                                <Input label="Bottom" value={defaultsConfig.newItemDraft.bottom} onChange={(event) => defaultsConfig.setNewItemDraft((prev) => ({ ...prev, bottom: event.target.value }))} placeholder="1/2" />
                                <div className="flex items-end">
                                  <Button variant="ghost" size="sm" onClick={() => defaultsConfig.commitAddItem(category.id)}>
                                    <Check size={14} className="text-emerald-500" />
                                  </Button>
                                </div>
                                <div className="flex items-end">
                                  <Button variant="ghost" size="sm" onClick={defaultsConfig.cancelAddItem}>
                                    <X size={14} className="text-zinc-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => defaultsConfig.beginAddItem(category.id)} className="w-full">
                              <Plus size={14} className="mr-1" />
                              Add Item
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void defaultsConfig.saveAll()} disabled={defaultsConfig.isSaving}>
                    <Save size={16} className="mr-2" />
                    {defaultsConfig.isSaving ? 'Saving...' : defaultsConfig.saveLabel}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
