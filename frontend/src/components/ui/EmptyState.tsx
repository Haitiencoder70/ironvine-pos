import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TouchButton } from './TouchButton';
import { Link } from 'react-router-dom';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: ReactNode;
  };
  className?: string;
  minHeight?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  minHeight = 'min-h-[400px]',
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 bg-white border border-gray-100 rounded-2xl shadow-sm',
          minHeight,
          className
        )
      )}
    >
      {icon && (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4 text-gray-400">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
        {description}
      </p>

      {action && (
        <div>
          {action.href ? (
            <Link to={action.href}>
              <TouchButton variant="primary" size="lg" icon={action.icon}>
                {action.label}
              </TouchButton>
            </Link>
          ) : (
            <TouchButton variant="primary" size="lg" icon={action.icon} onClick={action.onClick}>
              {action.label}
            </TouchButton>
          )}
        </div>
      )}
    </div>
  );
}
