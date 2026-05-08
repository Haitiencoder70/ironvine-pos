import { Fragment, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from '@headlessui/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { SearchInput } from './SearchInput';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number | string[] | number[];
  onChange?: (value: string | number | string[] | number[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiSelect?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  searchable = false,
  multiSelect = false,
  className,
}: SelectProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const getDisplayValue = (): string => {
    if (multiSelect && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      const selectedLabels = options
        .filter((opt) => (value as (string | number)[]).includes(opt.value))
        .map((opt) => opt.label);
      return selectedLabels.join(', ');
    }

    if (value === undefined || value === null || value === '') {
      return placeholder;
    }

    const selected = options.find((opt) => opt.value === value);
    return selected?.label ?? placeholder;
  };

  const isSelected = (optionValue: string | number): boolean => {
    if (multiSelect && Array.isArray(value)) {
      return (value as (string | number)[]).includes(optionValue);
    }
    return value === optionValue;
  };

  const toggleOption = (optionValue: string | number): void => {
    if (!multiSelect) {
      onChange?.(optionValue);
      return;
    }

    const current: (string | number)[] = Array.isArray(value) ? (value as (string | number)[]) : [];
    if (current.includes(optionValue)) {
      onChange?.(current.filter((v) => v !== optionValue) as string[] | number[]);
    } else {
      onChange?.([...current, optionValue] as string[] | number[]);
    }
  };

  return (
    <div className={twMerge('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-secondary mb-1.5">
          {label}
        </label>
      )}

      <Listbox
        value={value}
        onChange={(v) => onChange?.(v as string | number | string[] | number[])}
        multiple={multiSelect}
        disabled={disabled}
      >
        <div className="relative">
          <ListboxButton
            className={clsx(
              'relative w-full min-h-[44px] rounded-xl border bg-white/5 px-4 py-2 text-left text-slate-100',
              'cursor-pointer select-none',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent',
              error
                ? 'border-red-500/60 focus:ring-red-500/60'
                : 'border-white/10 hover:border-white/20',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <span className="block truncate text-sm">{getDisplayValue()}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl glass-panel py-1 text-sm shadow-xl focus:outline-none">
              {searchable && (
                <div className="sticky top-0 z-10 bg-[#0e0e1a] px-2 py-2 border-b border-white/10">
                  <SearchInput
                    value={searchQuery}
                    onChange={(v) => setSearchQuery(v)}
                    placeholder="Search..."
                    className="min-h-[44px]"
                  />
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-secondary">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={({ focus }) =>
                      clsx(
                        'relative cursor-pointer select-none py-3 pl-4 pr-9 min-h-[44px] flex items-center',
                        focus ? 'bg-orange-500/15 text-orange-200' : 'text-slate-200',
                        option.disabled && 'cursor-not-allowed opacity-50'
                      )
                    }
                    onClick={() => toggleOption(option.value)}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={clsx(
                            selected ? 'font-semibold' : 'font-normal',
                            'block truncate'
                          )}
                        >
                          {option.label}
                        </span>

                        {(isSelected(option.value) || selected) && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-400">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                ))
              )}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>

      {error && (
        <p className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
