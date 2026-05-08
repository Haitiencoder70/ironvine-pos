import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Modal } from './Modal';
import { TouchButton } from './TouchButton';
import { useConfirmStore } from '../../hooks/useConfirm';

export function ConfirmDialog() {
  const {
    isOpen,
    title,
    description,
    confirmText,
    cancelText,
    variant,
    closeConfirm,
  } = useConfirmStore();

  const handleConfirm = () => {
    closeConfirm(true);
  };

  const handleCancel = () => {
    closeConfirm(false);
  };

  const Icon =
    variant === 'danger'
      ? ExclamationTriangleIcon
      : variant === 'warning'
      ? ExclamationTriangleIcon
      : InformationCircleIcon;

  const iconColor =
    variant === 'danger'
      ? 'text-red-400'
      : variant === 'warning'
      ? 'text-amber-400'
      : 'text-orange-400';

  const iconBg =
    variant === 'danger'
      ? 'bg-red-500/10'
      : variant === 'warning'
      ? 'bg-amber-500/10'
      : 'bg-orange-500/10';

  const confirmVariant =
    variant === 'danger'
      ? 'danger'
      : variant === 'warning'
      ? 'warning'
      : 'primary';

  return (
    <Modal
      open={isOpen}
      onClose={handleCancel}
      size="sm"
      closeOnOverlayClick={false}
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconBg} mb-4`}
        >
          <Icon className={`h-8 w-8 ${iconColor}`} aria-hidden="true" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-100 mb-2">
          {title}
        </h3>

        <p className="text-sm text-secondary mb-8">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <TouchButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleCancel}
          >
            {cancelText}
          </TouchButton>
          <TouchButton
            variant={confirmVariant}
            size="lg"
            fullWidth
            onClick={handleConfirm}
          >
            {confirmText}
          </TouchButton>
        </div>
      </div>
    </Modal>
  );
}
