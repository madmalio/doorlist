import { Button } from './Button';
import { Modal } from './Modal';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-zinc-700 dark:text-zinc-300">{message}</p>
        {warning ? <p className="text-sm text-rose-500 dark:text-rose-300">{warning}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
