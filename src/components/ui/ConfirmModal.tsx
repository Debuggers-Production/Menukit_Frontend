import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false
}: ConfirmModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={isLoading ? () => {} : onClose} 
      className="max-w-sm sm:max-w-md"
      footer={
        <div className="flex gap-3 w-full">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="flex-1 text-xs sm:text-sm font-bold py-2.5"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? "danger" : "primary"} 
            onClick={onConfirm} 
            className="flex-1 text-xs sm:text-sm font-bold py-2.5"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-foreground font-heading">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
