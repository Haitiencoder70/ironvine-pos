import { forwardRef, memo, HTMLAttributes } from 'react';
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
  glow?: boolean;
  glowColor?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantBaseStyle: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: 'linear-gradient(160deg, rgba(12,12,24,0.80) 0%, rgba(6,6,16,0.88) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderTopColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(20px) saturate(1.7)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.7)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.45)',
  },
  elevated: {
    background: 'linear-gradient(160deg, rgba(14,14,28,0.86) 0%, rgba(6,6,16,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderTopColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(28px) saturate(1.9)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)',
  },
  outlined: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: 'none',
  },
};

export const TouchCard = memo(forwardRef<HTMLDivElement, TouchCardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      interactive = false,
      selected = false,
      glow = false,
      glowColor = 'rgba(59,130,246,0.18)',
      onClick,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyle = variantBaseStyle[variant];
    const glowStyle: React.CSSProperties = glow
      ? { boxShadow: `${baseStyle.boxShadow ?? ''}, 0 0 24px ${glowColor}`.replace(/^, /, '') }
      : {};
    const selectedStyle: React.CSSProperties = selected
      ? { boxShadow: `${baseStyle.boxShadow ?? ''}, 0 0 0 2px rgba(59,130,246,0.6)`.replace(/^, /, '') }
      : {};

    return (
      <motion.div
        ref={ref}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        onClick={onClick}
        className={twMerge(
          clsx(
            'rounded-2xl',
            paddingStyles[padding],
            interactive && 'cursor-pointer hover:brightness-110 transition-[filter] duration-150',
            className
          )
        )}
        style={{ ...baseStyle, ...glowStyle, ...selectedStyle, ...style }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
));

TouchCard.displayName = 'TouchCard';
