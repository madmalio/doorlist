import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { GetOverlayCategories, SaveOverlayCategories, UpdateSettings } from '../../../wailsjs/go/main/App';
import { parseLengthInput } from '../../lib/units';

function createCategoryId() {
  return `onboarding-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function WelcomeModal({
  isOpen,
  onClose,
  onDismiss,
  onSetupCompleted,
  onMeasurementConfirmed,
  onOverlayDefaultsSaved,
}) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [measurementSystem, setMeasurementSystem] = useState('imperial');
  const [categoryName, setCategoryName] = useState('');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const placeholder = measurementSystem === 'metric' ? '13' : '1/2';
  const unitLabel = measurementSystem === 'metric' ? 'mm' : 'in';

  const parsedDefaults = useMemo(() => ({
    left: parseLengthInput(left, measurementSystem),
    right: parseLengthInput(right, measurementSystem),
    top: parseLengthInput(top, measurementSystem),
    bottom: parseLengthInput(bottom, measurementSystem),
  }), [left, right, top, bottom, measurementSystem]);

  const canContinueOverlay = [parsedDefaults.left, parsedDefaults.right, parsedDefaults.top, parsedDefaults.bottom]
    .every((value) => value !== null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setStep(1);
    setMeasurementSystem('imperial');
    setCategoryName('');
    setLeft('');
    setRight('');
    setTop('');
    setBottom('');
  }, [isOpen]);

  const finishSetup = async () => {
    if (!canContinueOverlay) {
      showToast('Enter valid Left/Right/Top/Bottom overlay values', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await UpdateSettings({ measurementSystem, measurementConfirmed: true });
      onMeasurementConfirmed?.();

      const category = {
        id: createCategoryId(),
        name: categoryName.trim() || 'Full Overlay',
        default: {
          left: parsedDefaults.left,
          right: parsedDefaults.right,
          top: parsedDefaults.top,
          bottom: parsedDefaults.bottom,
        },
        doorItems: [],
        drawerFrontItems: [],
      };

      const existing = await GetOverlayCategories();
      const categories = Array.isArray(existing) ? [...existing, category] : [category];
      const savedCategories = await SaveOverlayCategories(categories);
      onOverlayDefaultsSaved?.(savedCategories || []);

      await UpdateSettings({ onboardingDismissed: true });
      setStep(3);
    } catch {
      showToast('Failed to complete setup', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateJob = () => {
    onSetupCompleted?.(true);
  };

  const handleDone = () => {
    onSetupCompleted?.(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to CutLogic" maxWidthClass="max-w-2xl" centered>
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Step 1 of 3 — Choose your measurement system.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant={measurementSystem === 'imperial' ? 'primary' : 'secondary'} onClick={() => setMeasurementSystem('imperial')}>
              Imperial (in)
            </Button>
            <Button variant={measurementSystem === 'metric' ? 'primary' : 'secondary'} onClick={() => setMeasurementSystem('metric')}>
              Metric (mm)
            </Button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">This controls how values are interpreted in forms.</p>
          <div className="flex justify-between pt-1">
            <Button variant="secondary" onClick={onDismiss}>Skip for now</Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Step 2 of 3 — Set a default overlay category for new jobs.</p>
          <Input
            label="Category Name"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Full Overlay"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={`Left (${unitLabel})`} value={left} onChange={(event) => setLeft(event.target.value)} placeholder={placeholder} />
            <Input label={`Right (${unitLabel})`} value={right} onChange={(event) => setRight(event.target.value)} placeholder={placeholder} />
            <Input label={`Top (${unitLabel})`} value={top} onChange={(event) => setTop(event.target.value)} placeholder={placeholder} />
            <Input label={`Bottom (${unitLabel})`} value={bottom} onChange={(event) => setBottom(event.target.value)} placeholder={placeholder} />
          </div>
          <div className="flex justify-between pt-1">
            <Button variant="secondary" onClick={() => setStep(1)} disabled={isSaving}>Back</Button>
            <Button onClick={() => void finishSetup()} disabled={isSaving || !canContinueOverlay}>
              {isSaving ? 'Saving...' : 'Finish Setup'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Step 3 of 3 — Setup complete. Ready to create your first job?</p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={handleDone}>Done</Button>
            <Button onClick={handleCreateJob}>Create First Job</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
