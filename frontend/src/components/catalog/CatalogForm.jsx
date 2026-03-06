import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MeasurementInput } from '../ui/MeasurementInput';
import { formatMeasurement, parseMeasurement } from '../../lib/measurements';

const emptyForm = {
  family: '',
  variant: 'Standard',
  stileWidth: '2',
  railWidth: '2',
  tenonLength: '3/8',
  panelThickness: '1/4',
  panelGap: '1/8',
};

export function CatalogForm({ style, initialFamily = '', onSubmit, onCancel }) {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isSlabFamily = formData.family.trim().toLowerCase() === 'slab';

  useEffect(() => {
    if (!style) {
      setFormData({
        ...emptyForm,
        family: initialFamily || '',
      });
      setErrors({});
      return;
    }

    setFormData({
      family: style.family || style.name || '',
      variant: style.variant || 'Standard',
      stileWidth: formatMeasurement(style.stileWidth),
      railWidth: formatMeasurement(style.railWidth),
      tenonLength: formatMeasurement(style.tenonLength),
      panelThickness: formatMeasurement(style.panelThickness),
      panelGap: formatMeasurement(style.panelGap),
    });
  }, [style, initialFamily]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.family.trim()) {
      return;
    }

    const parsed = {
      stileWidth: parseMeasurement(formData.stileWidth),
      railWidth: parseMeasurement(formData.railWidth),
      tenonLength: parseMeasurement(formData.tenonLength),
      panelThickness: parseMeasurement(formData.panelThickness),
      panelGap: parseMeasurement(formData.panelGap),
    };

    const nextErrors = {
      stileWidth: parsed.stileWidth === null ? 'Enter a fraction or decimal value' : '',
      railWidth: parsed.railWidth === null ? 'Enter a fraction or decimal value' : '',
      tenonLength: parsed.tenonLength === null ? 'Enter a fraction or decimal value' : '',
      panelThickness: parsed.panelThickness === null ? 'Enter a fraction or decimal value' : '',
      panelGap: parsed.panelGap === null ? 'Enter a fraction or decimal value' : '',
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    onSubmit({
      family: formData.family.trim(),
      variant: isSlabFamily ? '' : (formData.variant.trim() || 'Standard'),
      stileWidth: parsed.stileWidth,
      railWidth: parsed.railWidth,
      tenonLength: parsed.tenonLength,
      panelThickness: parsed.panelThickness,
      panelGap: parsed.panelGap,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Style Family" name="family" value={formData.family} onChange={onChange} required placeholder="Shaker" />
        <Input
          label="Variant"
          name="variant"
          value={isSlabFamily ? '' : formData.variant}
          onChange={onChange}
          placeholder={isSlabFamily ? 'Not used for Slab' : '2 1/4'}
          disabled={isSlabFamily}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Use fractions like 1 1/2 or decimals like 1.5.</p>
      <div className="grid grid-cols-2 gap-3">
        <MeasurementInput
          label="Stile Width"
          name="stileWidth"
          value={formData.stileWidth}
          onChange={onChange}
          error={errors.stileWidth}
          placeholder="2 1/4"
        />
        <MeasurementInput
          label="Rail Width"
          name="railWidth"
          value={formData.railWidth}
          onChange={onChange}
          error={errors.railWidth}
          placeholder="2"
        />
        <MeasurementInput
          label="Tenon Length"
          name="tenonLength"
          value={formData.tenonLength}
          onChange={onChange}
          error={errors.tenonLength}
          placeholder="3/8"
        />
        <MeasurementInput
          label="Panel Thickness"
          name="panelThickness"
          value={formData.panelThickness}
          onChange={onChange}
          error={errors.panelThickness}
          placeholder="1/4"
        />
        <MeasurementInput
          label="Panel Gap"
          name="panelGap"
          value={formData.panelGap}
          onChange={onChange}
          error={errors.panelGap}
          placeholder="1/8"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{style ? 'Update Style' : 'Create Style'}</Button>
      </div>
    </form>
  );
}
