import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { CreateDoorStyle, DeleteDoorStyle, LoadDoorStyles, SaveDoorStyleOrder, UpdateDoorStyle } from '../../../wailsjs/go/main/App';
import { CatalogForm } from './CatalogForm';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatMeasurement } from '../../lib/measurements';
import { getStyleFamily, getStyleUse, getStyleVariant, getStyleVariantLabel, groupStylesByFamily } from '../../lib/styleCatalog';

const collapsedFamiliesStorageKey = 'doorlist:catalog:collapsed-families';

function readCollapsedFamilies() {
  try {
    const raw = localStorage.getItem(collapsedFamiliesStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => String(entry));
  } catch {
    return [];
  }
}

function getStyleUseLabel(style) {
  const use = getStyleUse(style);
  if (use === 'door') {
    return 'Door';
  }
  if (use === 'drawer-front') {
    return 'Drawer Front';
  }
  return 'Both';
}

export function CatalogView() {
  const [styles, setStyles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedStyles, setHasLoadedStyles] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [createFamily, setCreateFamily] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState(null);
  const [draggedStyleID, setDraggedStyleID] = useState('');
  const [dragOverStyleID, setDragOverStyleID] = useState('');
  const [draggedFamily, setDraggedFamily] = useState('');
  const [collapsedFamilies, setCollapsedFamilies] = useState(() => readCollapsedFamilies());
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  const groupedFamilies = useMemo(() => groupStylesByFamily(styles), [styles]);
  const filteredFamilies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return groupedFamilies;
    }

    return groupedFamilies
      .map((group) => {
        const familyMatch = group.family.toLowerCase().includes(query);
        if (familyMatch) {
          return group;
        }

        const matchedStyles = group.styles.filter((style) => {
          const variant = getStyleVariant(style).toLowerCase();
          return variant.includes(query);
        });
        return { ...group, styles: matchedStyles };
      })
      .filter((group) => group.styles.length > 0);
  }, [groupedFamilies, search]);

  const moveStyle = (list, sourceID, targetID) => {
    if (!sourceID || !targetID || sourceID === targetID) {
      return list;
    }

    const sourceIndex = list.findIndex((style) => style.id === sourceID);
    const targetIndex = list.findIndex((style) => style.id === targetID);
    if (sourceIndex < 0 || targetIndex < 0) {
      return list;
    }

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const loadStyles = async () => {
    setIsLoading(true);
    try {
      const response = await LoadDoorStyles();
      setStyles(response || []);
    } catch (error) {
      showToast('Failed to load door styles', 'error');
    } finally {
      setIsLoading(false);
      setHasLoadedStyles(true);
    }
  };

  useEffect(() => {
    void loadStyles();
  }, []);

  useEffect(() => {
    if (!hasLoadedStyles) {
      return;
    }

    setCollapsedFamilies((previous) => {
      const validFamilies = new Set(groupedFamilies.map((group) => group.family));
      return previous.filter((family) => validFamilies.has(family));
    });
  }, [groupedFamilies, hasLoadedStyles]);

  useEffect(() => {
    if (!hasLoadedStyles) {
      return;
    }

    localStorage.setItem(collapsedFamiliesStorageKey, JSON.stringify(collapsedFamilies));
  }, [collapsedFamilies, hasLoadedStyles]);

  const closeModal = () => {
    setEditingStyle(null);
    setCreateFamily('');
    setIsModalOpen(false);
  };

  const openCreate = (family = '') => {
    setEditingStyle(null);
    setCreateFamily(family);
    setIsModalOpen(true);
  };

  const openEdit = (style) => {
    setEditingStyle(style);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingStyle) {
        await UpdateDoorStyle(editingStyle.id, payload);
        showToast('Door style updated', 'success');
      } else {
        await CreateDoorStyle(payload);
        showToast('Door style created', 'success');
      }
      closeModal();
      await loadStyles();
    } catch (error) {
      showToast('Failed to save door style', 'error');
    }
  };

  const openDeleteModal = (style) => {
    setStyleToDelete(style);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setStyleToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!styleToDelete) {
      return;
    }

    try {
      await DeleteDoorStyle(styleToDelete.id);
      showToast('Door style deleted', 'success');
      closeDeleteModal();
      await loadStyles();
    } catch (error) {
      showToast('Failed to delete door style', 'error');
    }
  };

  const persistStyleOrder = async (nextStyles) => {
    try {
      const saved = await SaveDoorStyleOrder(nextStyles.map((style) => style.id));
      setStyles(saved || nextStyles);
      showToast('Door style order saved', 'success');
    } catch (error) {
      await loadStyles();
      showToast('Failed to save style order', 'error');
    }
  };

  const onRowDragStart = (event, style) => {
    const styleID = style.id;
    setDraggedStyleID(styleID);
    setDraggedFamily(getStyleFamily(style));
    setDragOverStyleID('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', styleID);
  };

  const onRowDragOver = (event, style) => {
    const styleID = style.id;
    if (draggedFamily && draggedFamily !== getStyleFamily(style)) {
      return;
    }
    event.preventDefault();
    if (draggedStyleID && draggedStyleID !== styleID) {
      setDragOverStyleID(styleID);
    }
  };

  const onRowDrop = async (event, style) => {
    const styleID = style.id;
    event.preventDefault();
    const sourceID = event.dataTransfer.getData('text/plain') || draggedStyleID;
    setDragOverStyleID('');
    setDraggedStyleID('');
    setDraggedFamily('');
    if (!sourceID || sourceID === styleID) {
      return;
    }

    const sourceStyle = styles.find((entry) => entry.id === sourceID);
    if (!sourceStyle || getStyleFamily(sourceStyle) !== getStyleFamily(style)) {
      return;
    }

    const reordered = moveStyle(styles, sourceID, styleID);
    if (reordered === styles) {
      return;
    }

    setStyles(reordered);
    await persistStyleOrder(reordered);
  };

  const onRowDragEnd = () => {
    setDragOverStyleID('');
    setDraggedStyleID('');
    setDraggedFamily('');
  };

  const toggleFamilyCollapsed = (family) => {
    setCollapsedFamilies((previous) => (previous.includes(family) ? previous.filter((entry) => entry !== family) : [...previous, family]));
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">Loading door styles...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Catalog</h2>
        <Button onClick={() => openCreate()}>
          <Plus size={16} className="mr-2" />
          Add Door Style
        </Button>
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search styles by family or variant"
      />

      {styles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            No styles yet. Add your first catalog style to get started.
          </CardContent>
        </Card>
      ) : filteredFamilies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            No catalog styles match your search.
          </CardContent>
        </Card>
      ) : (
        filteredFamilies.map((group) => {
          const isCollapsed = collapsedFamilies.includes(group.family);
          const familyType = group.styles.every((style) => style.isSlab) ? 'Slab' : 'Frame';
          return (
            <Card key={group.family}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleFamilyCollapsed(group.family)}
                    className="inline-flex items-center gap-2 text-left"
                  >
                    {isCollapsed ? <ChevronRight size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{group.family}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${familyType === 'Slab' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                      {familyType}
                    </span>
                  </button>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{group.styles.length} variants</span>
                </div>
              </CardHeader>
              {isCollapsed ? null : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                          <th className="w-10 px-2 py-3" />
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Variant</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Applies To</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Stile</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Rail</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Tenon</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Panel Thickness</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Panel Gap</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.styles.map((style) => {
                          const isLocked = style.id === 'default-slab-style';
                          return (
                            <tr
                              key={style.id}
                              draggable={!isLocked}
                              onDragStart={(event) => onRowDragStart(event, style)}
                              onDragOver={(event) => onRowDragOver(event, style)}
                              onDrop={(event) => void onRowDrop(event, style)}
                              onDragEnd={onRowDragEnd}
                              className={`border-b border-zinc-200 dark:border-zinc-800 ${draggedStyleID === style.id ? 'opacity-50' : ''} ${dragOverStyleID === style.id ? 'bg-zinc-200 dark:bg-zinc-700' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                              <td className="px-2 py-3 text-zinc-400 dark:text-zinc-500">
                                {isLocked ? null : (
                                  <div className="flex items-center justify-center" title="Drag to reorder within family">
                                    <GripVertical size={14} />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                <span>{getStyleVariantLabel(style)}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{getStyleUseLabel(style)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.stileWidth)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.railWidth)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.tenonLength)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatMeasurement(style.panelThickness)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.panelGap)}</td>
                              <td className="px-4 py-3">
                                {isLocked ? null : (
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(style)} title="Edit style">
                                      <Pencil size={14} className="text-zinc-500 dark:text-zinc-400" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openDeleteModal(style)} title="Delete style">
                                      <Trash2 size={14} className="text-rose-400" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => openCreate(group.family)} className="w-full">
                      <Plus size={14} className="mr-1" />
                      Add Variant
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStyle ? 'Edit Door Style' : 'Create Door Style'}>
        <CatalogForm style={editingStyle} initialFamily={createFamily} onSubmit={handleSubmit} onCancel={closeModal} />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Door Style"
        message={`Are you sure you want to delete${styleToDelete ? ` "${styleToDelete.name}"` : ' this door style'}?`}
        warning="This action permanently removes the style from your catalog."
        confirmLabel="Delete Style"
      />
    </section>
  );
}
