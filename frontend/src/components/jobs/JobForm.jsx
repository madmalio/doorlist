import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const emptyForm = {
  customerName: '',
  project: '',
  defaultStyleId: '',
  defaultOverlayCategoryId: '',
};

export function JobForm({ job, doorStyles, overlayCategories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (job) {
      setFormData({
        customerName: job.customerName || '',
        project: job.name || '',
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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.customerName.trim() || !formData.project.trim() || !formData.defaultStyleId) {
      return;
    }

    onSubmit({
      customerName: formData.customerName.trim(),
      project: formData.project.trim(),
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
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="defaultStyleId">
          Door Style
        </label>
        <select
          id="defaultStyleId"
          name="defaultStyleId"
          value={formData.defaultStyleId}
          onChange={onChange}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          required
        >
          <option value="" disabled>
            Select a door style
          </option>
          {(doorStyles || []).map((style) => (
            <option key={style.id} value={style.id}>
              {style.name}
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
