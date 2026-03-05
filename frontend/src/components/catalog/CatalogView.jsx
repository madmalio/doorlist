import { useEffect, useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { CreateDoorStyle, DeleteDoorStyle, LoadDoorStyles, SaveDoorStyleOrder, UpdateDoorStyle } from '../../../wailsjs/go/main/App';
import { CatalogForm } from './CatalogForm';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatMeasurement } from '../../lib/measurements';

export function CatalogView() {
  const [styles, setStyles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState(null);
  const [draggedStyleID, setDraggedStyleID] = useState('');
  const [dragOverStyleID, setDragOverStyleID] = useState('');
  const { showToast } = useToast();

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
    }
  };

  useEffect(() => {
    void loadStyles();
  }, []);

  const closeModal = () => {
    setEditingStyle(null);
    setIsModalOpen(false);
  };

  const openCreate = () => {
    setEditingStyle(null);
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

  const onRowDragStart = (event, styleID) => {
    setDraggedStyleID(styleID);
    setDragOverStyleID('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', styleID);
  };

  const onRowDragOver = (event, styleID) => {
    event.preventDefault();
    if (draggedStyleID && draggedStyleID !== styleID) {
      setDragOverStyleID(styleID);
    }
  };

  const onRowDrop = async (event, styleID) => {
    event.preventDefault();
    const sourceID = event.dataTransfer.getData('text/plain') || draggedStyleID;
    setDragOverStyleID('');
    setDraggedStyleID('');
    if (!sourceID || sourceID === styleID) {
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
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">Loading door styles...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Catalog</h2>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Door Style
        </Button>
      </div>

      {styles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            No styles yet. Add your first catalog style to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Door Styles</h3>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="w-10 px-2 py-3" />
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Stile</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Rail</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Tenon</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Panel Thickness</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Panel Gap</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((style) => (
                  <tr
                    key={style.id}
                    draggable
                    onDragStart={(event) => onRowDragStart(event, style.id)}
                    onDragOver={(event) => onRowDragOver(event, style.id)}
                    onDrop={(event) => void onRowDrop(event, style.id)}
                    onDragEnd={onRowDragEnd}
                    className={`border-b border-zinc-200 dark:border-zinc-800 ${draggedStyleID === style.id ? 'opacity-50' : ''} ${dragOverStyleID === style.id ? 'bg-zinc-200 dark:bg-zinc-700' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <td className="px-2 py-3 text-zinc-400 dark:text-zinc-500">
                      <div className="flex items-center justify-center" title="Drag to reorder">
                        <GripVertical size={14} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      <span>{style.name}</span>
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.isSlab ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {style.isSlab ? 'Slab' : 'Frame'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.stileWidth)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.railWidth)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.tenonLength)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatMeasurement(style.panelThickness)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{style.isSlab ? '' : formatMeasurement(style.panelGap)}</td>
                    <td className="px-4 py-3">
                      {style.id === 'default-slab-style' ? null : (
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStyle ? 'Edit Door Style' : 'Create Door Style'}>
        <CatalogForm style={editingStyle} onSubmit={handleSubmit} onCancel={closeModal} />
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
