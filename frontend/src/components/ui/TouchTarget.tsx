import { clsx } from 'clsx';
import type { JSX } from 'react';

interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: keyof JSX.IntrinsicElements;
}

export function TouchTarget({ children, className, onClick, as: Tag = 'div' }: TouchTargetProps): JSX.Element {
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'relative flex items-center justify-center',
        'min-h-[44px] min-w-[44px]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </Tag>
  );
}
