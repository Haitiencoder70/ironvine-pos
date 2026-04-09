import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useCustomers, useCreateCustomer } from '../../hooks/useCustomers';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../ui/TouchButton';
import { TouchInput } from '../ui/TouchInput';
import type { Customer } from '../../types';

// ─── New Customer Form Schema ─────────────────────────────────────────────────

const newCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
});

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface CustomerSearchProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerSearch({ value, onChange, error }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useCustomers({
    search: debouncedQuery,
    limit: 8,
  });

  const createCustomer = useCreateCustomer();

  const customers = data?.data?.data ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (customer: Customer) => {
      onChange(customer);
      setIsOpen(false);
      setQuery('');
      setShowCreateForm(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery('');
    setIsOpen(false);
  }, [onChange]);

  // ── New Customer Form ──────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
  });

  const onCreateSubmit = handleSubmit(async (formData) => {
    const result = await createCustomer.mutateAsync({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
    });
    handleSelect(result.data);
    reset();
    setShowCreateForm(false);
  });

  // ── If a customer is already selected, show their card ────────────────────

  if (value) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx(
          'flex items-start gap-4 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50',
          error && 'border-red-300 bg-red-50'
        )}
      >
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
          {value.firstName[0]}{value.lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="font-semibold text-gray-900 truncate">
              {value.firstName} {value.lastName}
            </p>
          </div>
          <div className="mt-1 space-y-0.5">
            {value.company && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <BuildingOfficeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {value.company}
              </p>
            )}
            {value.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {value.phone}
              </p>
            )}
            {value.email && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {value.email}
              </p>
            )}
          </div>
        </div>

        {/* Change button */}
        <button
          type="button"
          onClick={handleClear}
          aria-label="Change customer"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </motion.div>
    );
  }

  // ── Search + dropdown ─────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isFetching ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          id="customer-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setShowCreateForm(false);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by name, phone, or email…"
          autoComplete="off"
          className={clsx(
            'w-full rounded-xl border bg-white pl-10 pr-10 py-2 min-h-[44px]',
            'text-base shadow-sm transition-colors',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            error ? 'border-red-400' : 'border-gray-300 hover:border-gray-400'
          )}
        />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          aria-label="Toggle customer list"
        >
          <ChevronDownIcon
            className={clsx(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && !showCreateForm && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Results */}
            {customers.length > 0 ? (
              <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                {customers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className="w-full text-left px-4 py-3 min-h-[52px] hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-600">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {[customer.company, customer.phone, customer.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center">
                <UserIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {debouncedQuery
                    ? `No customers found for "${debouncedQuery}"`
                    : 'Start typing to search customers'}
                </p>
              </div>
            )}

            {/* Create new customer CTA */}
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors text-sm font-semibold"
              >
                <UserPlusIcon className="h-4 w-4" />
                Create new customer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <UserPlusIcon className="h-4 w-4 text-blue-600" />
                New Customer
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TouchInput
                  label="First Name *"
                  placeholder="Jane"
                  error={formErrors.firstName?.message}
                  {...register('firstName')}
                />
                <TouchInput
                  label="Last Name *"
                  placeholder="Smith"
                  error={formErrors.lastName?.message}
                  {...register('lastName')}
                />
              </div>
              <TouchInput
                label="Phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={formErrors.phone?.message}
                icon={<PhoneIcon className="h-4 w-4" />}
                {...register('phone')}
              />
              <TouchInput
                label="Email"
                type="email"
                placeholder="jane@example.com"
                error={formErrors.email?.message}
                icon={<EnvelopeIcon className="h-4 w-4" />}
                {...register('email')}
              />
              <TouchInput
                label="Company"
                placeholder="Acme Corp"
                error={formErrors.company?.message}
                icon={<BuildingOfficeIcon className="h-4 w-4" />}
                {...register('company')}
              />

              <div className="flex gap-2 pt-1">
                <TouchButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </TouchButton>
                <TouchButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={createCustomer.isPending}
                >
                  Create Customer
                </TouchButton>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
