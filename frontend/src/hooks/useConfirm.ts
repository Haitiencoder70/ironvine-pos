import { create } from 'zustand';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: 'primary' | 'danger' | 'warning';
  resolve: (value: boolean) => void;
}

interface ConfirmStore extends ConfirmDialogState {
  openConfirm: (options: Omit<ConfirmDialogState, 'isOpen' | 'resolve'>) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
}

const initialState: Omit<ConfirmDialogState, 'resolve'> = {
  isOpen: false,
  title: '',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'primary',
};

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  ...initialState,
  resolve: () => {}, // placeholder
  openConfirm: (options) => {
    return new Promise((resolve) => {
      set({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  },
  closeConfirm: (result: boolean) => {
    get().resolve(result);
    set({ isOpen: false });
  },
}));

export function useConfirm() {
  const { openConfirm } = useConfirmStore();

  const confirm = async (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'warning';
  }) => {
    return await openConfirm({
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      variant: options.variant ?? 'primary',
    });
  };

  return { confirm };
}
