import { forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || useId();
    const hasError = Boolean(error);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'flex w-full rounded-xl border bg-white px-4 py-2 text-base shadow-sm transition-colors',
                'min-h-[44px]',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1',
                hasError
                  ? 'border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300'
                  : 'border-gray-300 focus:ring-blue-500',
                icon && iconPosition === 'left' && 'pl-10',
                icon && iconPosition === 'right' && 'pr-10',
                props.disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
                className
              )
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            className={clsx(
              'text-sm',
              hasError ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

TouchInput.displayName = 'TouchInput';
