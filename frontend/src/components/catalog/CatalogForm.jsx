import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MeasurementInput } from '../ui/MeasurementInput';
import { useMeasurement } from '../ui/MeasurementProvider';
import { formatLengthInput, parseLengthInput } from '../../lib/units';

const emptyForm = {
  family: '',
  variant: 'Standard',
  styleUse: 'door',
  stileWidth: '2',
  railWidth: '2',
  tenonLength: '3/8',
  panelThickness: '1/4',
  panelGap: '1/8',
};

export function CatalogForm({ style, initialFamily = '', initialStyleUse = 'door', onSubmit, onCancel }) {
  const { measurementSystem } = useMeasurement();
  const unitLabel = measurementSystem === 'metric' ? 'mm' : 'in';
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const familyValue = typeof formData.family === 'string' ? formData.family : '';
  const isSlabFamily = familyValue.trim().toLowerCase() === 'slab';

  useEffect(() => {
    if (!style) {
      setFormData({
        ...emptyForm,
        stileWidth: formatLengthInput(2, measurementSystem),
        railWidth: formatLengthInput(2, measurementSystem),
        tenonLength: formatLengthInput(0.375, measurementSystem),
        panelThickness: formatLengthInput(0.25, measurementSystem),
        panelGap: formatLengthInput(0.125, measurementSystem),
        family: typeof initialFamily === 'string' ? initialFamily : '',
        styleUse: initialStyleUse === 'drawer-front' ? 'drawer-front-top' : (typeof initialStyleUse === 'string' ? initialStyleUse : 'door'),
      });
      setErrors({});
      return;
    }

    setFormData({
      family: style.family || style.name || '',
      variant: style.variant || 'Standard',
      styleUse: style.styleUse === 'drawer-front' ? 'drawer-front-top' : (style.styleUse || 'door'),
      stileWidth: formatLengthInput(style.stileWidth, measurementSystem),
      railWidth: formatLengthInput(style.railWidth, measurementSystem),
      tenonLength: formatLengthInput(style.tenonLength, measurementSystem),
      panelThickness: formatLengthInput(style.panelThickness, measurementSystem),
      panelGap: formatLengthInput(style.panelGap, measurementSystem),
    });
  }, [style, initialFamily, initialStyleUse, measurementSystem]);

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
      stileWidth: parseLengthInput(formData.stileWidth, measurementSystem),
      railWidth: parseLengthInput(formData.railWidth, measurementSystem),
      tenonLength: parseLengthInput(formData.tenonLength, measurementSystem),
      panelThickness: parseLengthInput(formData.panelThickness, measurementSystem),
      panelGap: parseLengthInput(formData.panelGap, measurementSystem),
    };

    const nextErrors = {
      stileWidth: parsed.stileWidth === null ? 'Enter a valid measurement' : '',
      railWidth: parsed.railWidth === null ? 'Enter a valid measurement' : '',
      tenonLength: parsed.tenonLength === null ? 'Enter a valid measurement' : '',
      panelThickness: parsed.panelThickness === null ? 'Enter a valid measurement' : '',
      panelGap: parsed.panelGap === null ? 'Enter a valid measurement' : '',
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    onSubmit({
      family: formData.family.trim(),
      variant: isSlabFamily ? '' : (formData.variant.trim() || 'Standard'),
      styleUse: isSlabFamily ? 'both' : (formData.styleUse || 'door'),
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
          label="Frame"
          name="variant"
          value={isSlabFamily ? '' : formData.variant}
          onChange={onChange}
          placeholder={isSlabFamily ? 'Not used for Slab' : '2 1/4'}
          disabled={isSlabFamily}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {measurementSystem === 'metric'
          ? 'Use millimeters (decimals allowed).'
          : 'Use fractions like 1 1/2 or decimals like 1.5.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MeasurementInput
          label="Stile Width"
          name="stileWidth"
          value={formData.stileWidth}
          onChange={onChange}
          error={errors.stileWidth}
          suffix={unitLabel}
          placeholder={measurementSystem === 'metric' ? '57' : '2 1/4'}
        />
        <MeasurementInput
          label="Rail Width"
          name="railWidth"
          value={formData.railWidth}
          onChange={onChange}
          error={errors.railWidth}
          suffix={unitLabel}
          placeholder={measurementSystem === 'metric' ? '51' : '2'}
        />
        <MeasurementInput
          label="Tenon Length"
          name="tenonLength"
          value={formData.tenonLength}
          onChange={onChange}
          error={errors.tenonLength}
          suffix={unitLabel}
          placeholder={measurementSystem === 'metric' ? '10' : '3/8'}
        />
        <MeasurementInput
          label="Panel Thickness"
          name="panelThickness"
          value={formData.panelThickness}
          onChange={onChange}
          error={errors.panelThickness}
          suffix={unitLabel}
          placeholder={measurementSystem === 'metric' ? '6' : '1/4'}
        />
        <MeasurementInput
          label="Panel Gap"
          name="panelGap"
          value={formData.panelGap}
          onChange={onChange}
          error={errors.panelGap}
          suffix={unitLabel}
          placeholder={measurementSystem === 'metric' ? '3' : '1/8'}
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
