import { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface TouchCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white shadow-sm',
  elevated: 'bg-white shadow-lg',
  outlined: 'bg-white border border-gray-200 shadow-none',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const TouchCard = forwardRef<HTMLDivElement, TouchCardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      interactive = false,
      selected = false,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        onClick={onClick}
        className={twMerge(
          clsx(
            'rounded-2xl transition-shadow',
            variantStyles[variant],
            paddingStyles[padding],
            interactive && 'cursor-pointer hover:shadow-md active:shadow-sm',
            selected && 'ring-2 ring-blue-500 ring-offset-1',
            className
          )
        )}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);

TouchCard.displayName = 'TouchCard';
