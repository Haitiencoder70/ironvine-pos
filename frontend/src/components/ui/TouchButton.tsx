import { forwardRef, memo, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface TouchButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onAnimationStart'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'btn-primary text-white font-bold active:scale-[0.97]',
  secondary: 'btn-secondary text-gray-200 font-semibold hover:text-white transition-colors',
  success:   'btn-success text-white font-bold active:scale-[0.97]',
  danger:    'btn-danger text-white font-bold active:scale-[0.97]',
  warning:   'btn-warning text-white font-bold active:scale-[0.97]',
  ghost:     'text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors font-medium',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 text-[13px] rounded-xl',
  md: 'min-h-[44px] px-6 text-[14px] rounded-xl',
  lg: 'min-h-[52px] px-8 text-base rounded-xl',
  xl: 'min-h-[60px] px-10 text-lg rounded-xl',
};

export const TouchButton = memo(forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      icon,
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            'relative inline-flex items-center justify-center gap-2 transition-all duration-150 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && 'w-full',
            (disabled || loading) && 'opacity-50 cursor-not-allowed',
            className
          )
        )}
        style={style}
        {...props}
      >
        {loading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </motion.button>
    );
  }
));

TouchButton.displayName = 'TouchButton';
