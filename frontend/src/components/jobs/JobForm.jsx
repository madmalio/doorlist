import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMeasurement } from '../ui/MeasurementProvider';
import { findStyleById, getStyleVariantLabel, groupStylesByFamily, styleMatchesOverlayType } from '../../lib/styleCatalog';
import { parseLengthInput } from '../../lib/units';

const emptyForm = {
  customerName: '',
  project: '',
  woodChoice: '',
  productionStatus: 'draft',
  defaultStyleId: '',
  defaultOverlayCategoryId: '',
};

const productionStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'in production', label: 'In Production' },
  { value: 'in finishing', label: 'In Finishing' },
  { value: 'complete', label: 'Complete' },
];

export function JobForm({ job, doorStyles, overlayCategories, woodPresets, onSubmit, onCancel, onOpenOverlayPresets }) {
  const { measurementSystem } = useMeasurement();
  const [formData, setFormData] = useState(emptyForm);
  const doorOnlyStyles = useMemo(
    () => (doorStyles || []).filter((style) => styleMatchesOverlayType(style, 'door', 'top')),
    [doorStyles],
  );
  const styleFamilies = useMemo(() => {
    const grouped = groupStylesByFamily(doorOnlyStyles || []);
    return grouped
      .map((group) => ({
        family: group.family,
        styles: (group.styles || []).filter((style) => styleMatchesOverlayType(style, 'door', 'top')),
      }))
      .filter((group) => group.styles.length > 0);
  }, [doorOnlyStyles]);
  const selectedStyle = useMemo(() => findStyleById(doorStyles || [], formData.defaultStyleId), [doorStyles, formData.defaultStyleId]);
  const selectedFamily = selectedStyle ? styleFamilies.find((group) => group.styles.some((style) => style.id === selectedStyle.id))?.family || '' : (styleFamilies[0]?.family || '');
  const selectedFamilyStyles = useMemo(() => styleFamilies.find((group) => group.family === selectedFamily)?.styles || [], [styleFamilies, selectedFamily]);
  const selectedOverlayCategory = useMemo(
    () => (overlayCategories || []).find((category) => category.id === formData.defaultOverlayCategoryId) || null,
    [overlayCategories, formData.defaultOverlayCategoryId],
  );
  const selectedOverlayDefault = useMemo(() => {
    const defaultValues = selectedOverlayCategory?.default;
    if (!defaultValues) {
      return null;
    }

    const left = parseLengthInput(defaultValues.left, measurementSystem);
    const right = parseLengthInput(defaultValues.right, measurementSystem);
    const top = parseLengthInput(defaultValues.top, measurementSystem);
    const bottom = parseLengthInput(defaultValues.bottom, measurementSystem);
    if (left === null || right === null || top === null || bottom === null) {
      return null;
    }

    return { left, right, top, bottom };
  }, [selectedOverlayCategory, measurementSystem]);
  const hasValidOverlayDefault = Boolean(selectedOverlayDefault);

  useEffect(() => {
    if (job) {
      setFormData({
        customerName: job.customerName || '',
        project: job.name || '',
        woodChoice: job.woodChoice || '',
        productionStatus: job.productionStatus || 'draft',
        defaultStyleId: job.defaultStyleId || '',
        defaultOverlayCategoryId: job.defaultOverlayCategoryId || '',
      });
      return;
    }

    setFormData({
      ...emptyForm,
      defaultStyleId: doorOnlyStyles?.[0]?.id || '',
      defaultOverlayCategoryId: overlayCategories?.[0]?.id || '',
    });
  }, [job, doorOnlyStyles, overlayCategories]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onFamilyChange = (event) => {
    const family = event.target.value;
    const firstStyle = styleFamilies.find((group) => group.family === family)?.styles?.[0] || null;
    setFormData((prev) => ({ ...prev, defaultStyleId: firstStyle?.id || '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !formData.customerName.trim() ||
      !formData.project.trim() ||
      !formData.defaultStyleId ||
      !formData.defaultOverlayCategoryId ||
      !selectedOverlayDefault
    ) {
      return;
    }

    onSubmit({
      customerName: formData.customerName.trim(),
      project: formData.project.trim(),
      woodChoice: formData.woodChoice.trim(),
      productionStatus: formData.productionStatus,
      defaultStyleId: formData.defaultStyleId,
      defaultOverlayCategoryId: formData.defaultOverlayCategoryId,
      useCustomOverlay: true,
      overlayLeft: selectedOverlayDefault.left,
      overlayRight: selectedOverlayDefault.right,
      overlayTop: selectedOverlayDefault.top,
      overlayBottom: selectedOverlayDefault.bottom,
      defaultOverlay: selectedOverlayDefault.left,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={onChange}
          placeholder="Customer name"
          required
        />
        <Input
          label="Project"
          name="project"
          value={formData.project}
          onChange={onChange}
          placeholder="Kitchen remodel"
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="woodChoice">Wood Choice</label>
          {Array.isArray(woodPresets) && woodPresets.length > 0 ? (
            <select
              id="woodChoice"
              name="woodChoice"
              value={formData.woodChoice}
              onChange={onChange}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">No wood selected</option>
              {!woodPresets.includes(formData.woodChoice) && formData.woodChoice ? (
                <option value={formData.woodChoice}>{formData.woodChoice}</option>
              ) : null}
              {woodPresets.map((wood) => (
                <option key={wood} value={wood}>
                  {wood}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="woodChoice"
              name="woodChoice"
              value={formData.woodChoice}
              onChange={onChange}
              placeholder="Enter wood choice"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="productionStatus">Production Status</label>
          <select
            id="productionStatus"
            name="productionStatus"
            value={formData.productionStatus}
            onChange={onChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {productionStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="defaultStyleFamily">
            Door Style Family
          </label>
          <select
            id="defaultStyleFamily"
            value={selectedFamily}
            onChange={onFamilyChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
          >
            <option value="" disabled>
              Select a style family
            </option>
            {styleFamilies.map((group) => (
              <option key={group.family} value={group.family}>
                {group.family}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="defaultStyleId">Frame</label>
          <select
            id="defaultStyleId"
            name="defaultStyleId"
            value={formData.defaultStyleId}
            onChange={onChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
          >
            <option value="" disabled>
              Select a frame
            </option>
            {selectedFamilyStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {getStyleVariantLabel(style)}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="defaultOverlayCategoryId">Overlay</label>
          <select
            id="defaultOverlayCategoryId"
            name="defaultOverlayCategoryId"
            value={formData.defaultOverlayCategoryId}
            onChange={onChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">No category selected</option>
            {(overlayCategories || []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!hasValidOverlayDefault ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <span>Overlay defaults are required for this category.</span>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenOverlayPresets}>
            Set Overlay Defaults
          </Button>
        </div>
      ) : null}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!hasValidOverlayDefault}>
          {job ? 'Update Job' : 'Create Job'}
        </Button>
      </div>
    </form>
  );
}
