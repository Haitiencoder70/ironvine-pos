import { forwardRef, memo, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface TouchButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { className: string; style: React.CSSProperties }> = {
  primary: {
    className: 'text-white font-bold active:scale-[0.97]',
    style: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)',
      boxShadow: '0 0 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2)',
      border: '1px solid rgba(59,130,246,0.5)',
    },
  },
  secondary: {
    className: 'text-gray-200 font-semibold hover:text-white transition-colors',
    style: {
      background: 'linear-gradient(160deg, rgba(14,14,26,0.80) 0%, rgba(8,8,18,0.88) 100%)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderTopColor: 'rgba(255,255,255,0.14)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4)',
    },
  },
  success: {
    className: 'text-white font-bold active:scale-[0.97]',
    style: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      boxShadow: '0 0 20px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      border: '1px solid rgba(16,185,129,0.4)',
    },
  },
  danger: {
    className: 'text-white font-bold active:scale-[0.97]',
    style: {
      background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      boxShadow: '0 0 20px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      border: '1px solid rgba(244,63,94,0.4)',
    },
  },
  warning: {
    className: 'text-white font-bold active:scale-[0.97]',
    style: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      boxShadow: '0 0 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      border: '1px solid rgba(245,158,11,0.4)',
    },
  },
  ghost: {
    className: 'text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors font-medium',
    style: {},
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-4 text-[13px] rounded-xl',
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
    const vStyle = variantStyles[variant];

    return (
      <motion.button
        ref={ref}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            'relative inline-flex items-center justify-center gap-2 transition-all duration-150 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
            vStyle.className,
            sizeStyles[size],
            fullWidth && 'w-full',
            (disabled || loading) && 'opacity-50 cursor-not-allowed',
            className
          )
        )}
        style={{ ...vStyle.style, ...style }}
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
