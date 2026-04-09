# UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three broken/incomplete UI components — migrate Modal and Select from HeadlessUI v1 API to v2 API, and add missing status colors to StatusBadge.

**Architecture:** All 8 UI components already exist in `frontend/src/components/ui/`. TouchButton, TouchCard, TouchInput, Table, SearchInput, and the index barrel are fully spec-compliant and require no changes. Modal and Select use the v1 HeadlessUI dot-notation API (`Dialog.Panel`, `Listbox.Button`, `Transition.Child`) which was removed in v2 — they will crash at runtime with `@headlessui/react@2.2.0`. StatusBadge is missing color entries for two statuses added to `types/index.ts` in the previous session.

**Tech Stack:** React 18, TypeScript strict, `@headlessui/react@2.2.0`, `framer-motion@11`, `@heroicons/react@2`, Tailwind CSS, clsx, tailwind-merge

---

## File Map

| File | Action | What changes |
|---|---|---|
| `frontend/src/components/ui/Modal.tsx` | Modify | Migrate from HeadlessUI v1 → v2 API |
| `frontend/src/components/ui/Select.tsx` | Modify | Migrate from HeadlessUI v1 → v2 API |
| `frontend/src/components/ui/StatusBadge.tsx` | Modify | Add `PENDING_APPROVAL` and `ON_HOLD` color entries |

**No changes needed:** TouchButton, TouchCard, TouchInput, Table, SearchInput, `index.ts`

---

### Task 1: Migrate Modal.tsx to HeadlessUI v2

**Files:**
- Modify: `frontend/src/components/ui/Modal.tsx`

**Context — what changed in HeadlessUI v2:**
- Sub-components are now separate named exports, not dot notation:
  - `Dialog.Panel` → `DialogPanel`
  - `Dialog.Title` → `DialogTitle`
  - `Dialog.Description` → `DialogDescription`
  - `Transition.Child` → `TransitionChild`
- All are imported directly from `@headlessui/react`
- `Transition` and `Dialog` top-level components remain, but `as={Fragment}` is still supported

- [ ] **Step 1: Replace the entire file**

Write `frontend/src/components/ui/Modal.tsx` as:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx
git commit -m "fix(ui): migrate Modal to HeadlessUI v2 API"
```

---

### Task 2: Migrate Select.tsx to HeadlessUI v2

**Files:**
- Modify: `frontend/src/components/ui/Select.tsx`

**Context — what changed in HeadlessUI v2:**
- `Listbox.Button` → `ListboxButton`
- `Listbox.Options` → `ListboxOptions`
- `Listbox.Option` → `ListboxOption`
- The `static` prop on `ListboxOptions` was removed in v2 — drop it
- All sub-components imported as separate named exports from `@headlessui/react`
- `Transition` and `TransitionChild` still work for the dropdown animation

- [ ] **Step 1: Replace the entire file**

Write `frontend/src/components/ui/Select.tsx` as:

```tsx
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
        .filter((opt) => value.includes(opt.value))
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
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const toggleOption = (optionValue: string | number): void => {
    if (!multiSelect) {
      onChange?.(optionValue);
      return;
    }

    const current = Array.isArray(value) ? value : [];
    if (current.includes(optionValue)) {
      onChange?.(current.filter((v) => v !== optionValue));
    } else {
      onChange?.([...current, optionValue]);
    }
  };

  return (
    <div className={twMerge('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              'relative w-full min-h-[44px] rounded-xl border bg-white px-4 py-2 text-left shadow-sm',
              'cursor-pointer select-none',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'cursor-not-allowed bg-gray-50 opacity-60'
            )}
          >
            <span className="block truncate text-base">{getDisplayValue()}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {searchable && (
                <div className="sticky top-0 z-10 bg-white px-2 py-2 border-b border-gray-100">
                  <SearchInput
                    value={searchQuery}
                    onChange={(v) => setSearchQuery(v)}
                    placeholder="Search..."
                    className="min-h-[40px]"
                  />
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
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
                        focus ? 'bg-blue-50 text-blue-900' : 'text-gray-900',
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
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/Select.tsx
git commit -m "fix(ui): migrate Select to HeadlessUI v2 API"
```

---

### Task 3: Add missing status colors to StatusBadge

**Files:**
- Modify: `frontend/src/components/ui/StatusBadge.tsx`

**Context:** `PENDING_APPROVAL` and `ON_HOLD` were added to `OrderStatus` in `types/index.ts` during the frontend-foundation task but no color entries were added to `StatusBadge`. Without them, these statuses fall back to the default `bg-gray-100 text-gray-800`.

- [ ] **Step 1: Add the two missing entries to `colorMap`**

In `frontend/src/components/ui/StatusBadge.tsx`, change:
```typescript
  // Order Statuses
  QUOTE: 'bg-gray-100 text-gray-800',
  APPROVED: 'bg-blue-100 text-blue-800',
```
To:
```typescript
  // Order Statuses
  QUOTE: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/StatusBadge.tsx
git commit -m "fix(ui): add PENDING_APPROVAL and ON_HOLD color entries to StatusBadge"
```

---

## Self-Review

### Spec coverage
- ✅ TouchButton — already complete (all 6 variants, 4 sizes, fullWidth, loading spinner, icon, active scale)
- ✅ TouchCard — already complete (3 variants, 4 padding options, interactive, selected ring, Framer Motion, rounded-2xl)
- ✅ StatusBadge — Task 3 adds missing entries; all 3 status families covered with distinct colors
- ✅ TouchInput — already complete (min-h-touch, error state, label, helper text, left/right icon)
- ✅ Modal — Task 1 migrates to v2; retains touch close button (44×44px), backdrop, Transition animation
- ✅ Table — already complete (responsive, 44px rows, sort arrows, skeleton loading, empty state)
- ✅ SearchInput — already complete (debounced, clear button, spinner)
- ✅ Select — Task 2 migrates to v2; retains search, multi-select, 44px options
- ✅ All use Tailwind, TypeScript, forwardRef (where appropriate), clsx, min 44px targets

### Placeholder scan
No TBDs, no partial implementations. All tasks contain complete file content.

### Type consistency
- `SelectProps.value` type `string | number | string[] | number[]` consistent across `ListboxButton` display, `toggleOption`, `onChange` ✅
- `isSelected()` used alongside HeadlessUI's own `selected` render prop — both checked in the checkmark condition to handle multi-select correctly ✅
- `ModalProps` interface identical to original — no breaking change for consumers ✅
