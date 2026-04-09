import { Fragment } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel
                className={twMerge(
                  'w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all',
                  sizeMap[size],
                  className
                )}
              >
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {title && (
                        <DialogTitle
                          as="h3"
                          className="text-xl font-semibold text-gray-900"
                        >
                          {title}
                        </DialogTitle>
                      )}
                      {description && (
                        <DialogDescription
                          as="p"
                          className="mt-1 text-sm text-gray-500"
                        >
                          {description}
                        </DialogDescription>
                      )}
                    </div>
                    {showCloseButton && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="ml-4 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </motion.button>
                    )}
                  </div>
                )}

                <div className={clsx(title && !showCloseButton && 'mt-4')}>
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
