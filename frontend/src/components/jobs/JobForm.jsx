import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { findStyleById, getStyleVariantLabel, groupStylesByFamily } from '../../lib/styleCatalog';

const emptyForm = {
  customerName: '',
  project: '',
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

export function JobForm({ job, doorStyles, overlayCategories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(emptyForm);
  const styleFamilies = useMemo(() => groupStylesByFamily(doorStyles || []), [doorStyles]);
  const selectedStyle = useMemo(() => findStyleById(doorStyles || [], formData.defaultStyleId), [doorStyles, formData.defaultStyleId]);
  const selectedFamily = selectedStyle ? styleFamilies.find((group) => group.styles.some((style) => style.id === selectedStyle.id))?.family || '' : (styleFamilies[0]?.family || '');
  const selectedFamilyStyles = useMemo(() => styleFamilies.find((group) => group.family === selectedFamily)?.styles || [], [styleFamilies, selectedFamily]);

  useEffect(() => {
    if (job) {
      setFormData({
        customerName: job.customerName || '',
        project: job.name || '',
        productionStatus: job.productionStatus || 'draft',
        defaultStyleId: job.defaultStyleId || '',
        defaultOverlayCategoryId: job.defaultOverlayCategoryId || '',
      });
      return;
    }

    setFormData({
      ...emptyForm,
      defaultStyleId: doorStyles?.[0]?.id || '',
      defaultOverlayCategoryId: overlayCategories?.[0]?.id || '',
    });
  }, [job, doorStyles, overlayCategories]);

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
    if (!formData.customerName.trim() || !formData.project.trim() || !formData.defaultStyleId) {
      return;
    }

    onSubmit({
      customerName: formData.customerName.trim(),
      project: formData.project.trim(),
      productionStatus: formData.productionStatus,
      defaultStyleId: formData.defaultStyleId,
      defaultOverlayCategoryId: formData.defaultOverlayCategoryId,
      defaultOverlay: job?.defaultOverlay ?? 0.5,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="defaultStyleId">Variant</label>
        <select
          id="defaultStyleId"
          name="defaultStyleId"
          value={formData.defaultStyleId}
          onChange={onChange}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          required
        >
          <option value="" disabled>
            Select a variant
          </option>
          {selectedFamilyStyles.map((style) => (
            <option key={style.id} value={style.id}>
              {getStyleVariantLabel(style)}
            </option>
          ))}
        </select>
      </div>
      <div>
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
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{job ? 'Update Job' : 'Create Job'}</Button>
      </div>
    </form>
  );
}
