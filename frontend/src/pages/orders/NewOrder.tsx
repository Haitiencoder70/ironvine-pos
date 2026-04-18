import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm, FormProvider, useFormContext, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  ListBulletIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { CustomerSearch } from '../../components/customers/CustomerSearch';
import { OrderItemsEditor } from '../../components/orders/OrderItemsEditor';
import { TouchButton } from '../../components/ui/TouchButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useCreateOrder } from '../../hooks/useOrders';
import { useOfflineStore } from '../../store/offlineStore';
import { usePermissions } from '../../hooks/usePermissions';
import type { JSX } from 'react';
import type { Customer, OrderPriority, PrintLocation, PrintMethod } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderItemFormValues {
  productType: string;
  attributes: Record<string, unknown>;
  quantity: number;
  unitPrice: number;
  printMethod: string;
  printLocations: string[];
  description: string;
  // Material tracking
  requiredMaterials: {
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  // Rich product-linked configuration (optional — set when using catalog)
  _configured?: import('../../components/orders/ProductOrderConfigurator').ConfiguredOrderItem;
}

export interface NewOrderFormValues {
  customerId: string;
  priority: OrderPriority;
  dueDate: string;
  notes: string;
  designNotes: string;
  items: OrderItemFormValues[];
}

// ─── Validation Schema ────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productType: z.string().min(1, 'Please select a category'),
  attributes: z.record(z.string(), z.any()).optional().default({}),
  quantity: z.number({ invalid_type_error: 'Enter a valid quantity' }).int().positive('Must be at least 1').max(10_000),
  unitPrice: z.number({ invalid_type_error: 'Enter a valid price' }).nonnegative('Price cannot be negative'),
  printMethod: z.string().optional(),
  printLocations: z.array(z.string()).optional().default([]),
  description: z.string().max(500).optional().default(''),
  requiredMaterials: z.array(z.any()).optional().default([]),
});

const newOrderSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  priority: z.enum(['NORMAL', 'HIGH', 'RUSH'] as const),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  designNotes: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).min(1, 'Add at least one item'),
});

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Customer', icon: UserIcon },
  { id: 2, label: 'Items', icon: ListBulletIcon },
  { id: 3, label: 'Review', icon: CheckCircleIcon },
] as const;

const TAX_RATE = 0.0825;

const PRIORITY_OPTIONS: { value: OrderPriority; label: string; color: string }[] = [
  { value: 'NORMAL', label: 'Normal', color: 'border-gray-200 bg-white text-gray-700' },
  { value: 'HIGH', label: 'High', color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { value: 'RUSH', label: '🔥 Rush', color: 'border-red-300 bg-red-50 text-red-800' },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  TSHIRT: 'T-Shirt',
  HOODIE: 'Hoodie',
  POLO: 'Polo',
  TANK_TOP: 'Tank Top',
  LONG_SLEEVE: 'Long Sleeve',
  SWEATSHIRT: 'Sweatshirt',
  HAT: 'Hat',
  BAG: 'Bag',
  OTHER: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const LS_KEY = 'new-order-draft';

// ─── Step Indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Order creation steps" className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300',
                  'border-2 font-semibold text-sm',
                  isCompleted && 'bg-blue-600 border-blue-600 text-white',
                  isCurrent && 'bg-white border-blue-600 text-blue-600 shadow-md ring-4 ring-blue-100',
                  !isCompleted && !isCurrent && 'bg-white border-gray-200 text-gray-400'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <CheckCircleSolid className="h-5 w-5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={clsx(
                  'mt-1.5 text-xs font-medium',
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={clsx(
                  'h-0.5 w-16 sm:w-24 mx-2 mb-5 rounded-full transition-colors duration-500',
                  currentStep > step.id ? 'bg-blue-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Step 1: Customer Selection ───────────────────────────────────────────────

interface Step1Props {
  selectedCustomer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
  customerError?: string;
}

function Step1Customer({ selectedCustomer, onCustomerChange, customerError }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Select Customer</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Search for an existing customer or create a new one.
        </p>
      </div>
      <CustomerSearch
        value={selectedCustomer}
        onChange={onCustomerChange}
        error={customerError}
      />
      {!selectedCustomer && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <UserIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Select a customer before moving to the next step. You can also create a new customer inline.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Order Info + Items ───────────────────────────────────────────────

function Step2Items() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<NewOrderFormValues>();

  const priorityValue = watch('priority');
  void priorityValue;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Order Details & Items</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Set priority, due date, and add all items for this order.
        </p>
      </div>

      {/* Priority selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Priority</label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl border-2',
                    'cursor-pointer text-sm font-semibold transition-all duration-150 select-none',
                    field.value === opt.value
                      ? opt.value === 'NORMAL'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                        : opt.value === 'HIGH'
                        ? 'border-amber-400 bg-amber-100 text-amber-800 ring-2 ring-amber-200'
                        : 'border-red-400 bg-red-100 text-red-800 ring-2 ring-red-200'
                      : opt.color
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    {...field}
                    value={opt.value}
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        />
      </div>

      {/* Due Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Due Date</label>
          <input
            id="order-due-date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            {...register('dueDate')}
            className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
          />
        </div>
      </div>

      {/* Design notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-notes" className="text-sm font-medium text-gray-700">Order Notes</label>
          <textarea
            id="order-notes"
            rows={3}
            placeholder="Customer instructions, special requests…"
            {...register('notes')}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 resize-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-design-notes" className="text-sm font-medium text-gray-700">Design Notes</label>
          <textarea
            id="order-design-notes"
            rows={3}
            placeholder="Design specifications, colors, file references…"
            {...register('designNotes')}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 resize-none"
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Order Items</h3>
          {errors.items?.root && (
            <p className="text-sm text-red-500">{errors.items.root.message}</p>
          )}
        </div>
        
        <OrderItemsEditor />
      </div>
    </div>
  );
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

interface Step3ReviewProps {
  selectedCustomer: Customer | null;
  formValues: NewOrderFormValues;
}

function Step3Review({ selectedCustomer, formValues }: Step3ReviewProps) {
  const subtotal = formValues.items.reduce(
    (sum, item) => sum + (item._configured?.lineTotal ?? (item.quantity ?? 0) * (item.unitPrice ?? 0)),
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Review & Submit</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Confirm all details before creating the order.
        </p>
      </div>

      {/* Customer card */}
      {selectedCustomer && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {[selectedCustomer.company, selectedCustomer.phone, selectedCustomer.email]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Info</p>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status={formValues.priority} size="md" />
          {formValues.dueDate && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
              Due: <strong>{format(new Date(formValues.dueDate), 'MMM d, yyyy')}</strong>
            </span>
          )}
        </div>
        {formValues.notes && (
          <p className="mt-2 text-sm text-gray-600 italic">{formValues.notes}</p>
        )}
        {formValues.designNotes && (
          <p className="mt-1 text-sm text-gray-600 italic">{formValues.designNotes}</p>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Items ({formValues.items.length})
        </p>
        {formValues.items.map((item, idx) => {
          const cfg = item._configured;
          const lineTotal = cfg?.lineTotal ?? (item.quantity * item.unitPrice);
          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {cfg ? cfg.productName : (PRODUCT_TYPE_LABELS[item.productType] ?? item.productType)}
                    {cfg?.isCustomItem && <span className="ml-2 text-xs text-gray-400 font-normal">(custom)</span>}
                  </p>
                  {cfg && !cfg.isCustomItem && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[cfg.brand, cfg.color].filter(Boolean).join(' · ')}
                      {cfg.sizeBreakdown.length > 0 && (
                        ' · ' + cfg.sizeBreakdown.map((s) => `${s.qty}×${s.size}`).join(', ')
                      )}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">
                    {cfg ? `${cfg.totalQuantity} units` : `Qty: ${item.quantity}`}
                    {' × '}{fmt(item.unitPrice)}
                    {cfg?.printMethod ? ` · ${cfg.printMethod}` : item.printMethod ? ` · ${item.printMethod.replace(/_/g, ' ')}` : ''}
                  </p>
                  {cfg?.selectedAddOns && cfg.selectedAddOns.length > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      + {cfg.selectedAddOns.map((a) => a.name).join(', ')}
                    </p>
                  )}
                  {cfg?.isPriceOverridden && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      ⚠ Price overridden from {fmt(cfg.originalTierPrice)}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-400 italic mt-0.5">{item.description}</p>
                  )}
                </div>
                <p className="font-bold text-gray-900 flex-shrink-0">{fmt(lineTotal)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (8.25%)</span>
          <span>{fmt(tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold text-gray-900">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main NewOrderPage ────────────────────────────────────────────────────────

export function NewOrderPage(): JSX.Element {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerError, setCustomerError] = useState('');
  const createOrder = useCreateOrder();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const { can } = usePermissions();

  const methods = useForm<NewOrderFormValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: (() => {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<NewOrderFormValues>;
          return {
            customerId: '',
            priority: 'NORMAL',
            dueDate: '',
            notes: '',
            designNotes: '',
            items: [],
            ...parsed,
          };
        }
      } catch {
        // ignore malformed draft
      }
      return {
        customerId: '',
        priority: 'NORMAL',
        dueDate: '',
        notes: '',
        designNotes: '',
        items: [],
      };
    })(),
    mode: 'onChange',
  });

  const {
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { isDirty },
  } = methods;

  const formValues = watch();

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(formValues));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formValues, isDirty]);

  // Navigation guard — warn before leaving with unsaved form
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave anyway? Your draft will be lost.'
      );
      if (confirmed) {
        localStorage.removeItem(LS_KEY);
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Sync selected customer id into form
  const handleCustomerChange = useCallback(
    (customer: Customer | null) => {
      setSelectedCustomer(customer);
      setValue('customerId', customer?.id ?? '', { shouldDirty: true });
      if (customer) setCustomerError('');
    },
    [setValue]
  );

  // Step navigation
  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      if (!selectedCustomer) {
        setCustomerError('Please select or create a customer to continue.');
        return;
      }
      setCustomerError('');
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      const valid = await trigger(['priority', 'dueDate', 'notes', 'designNotes', 'items']);
      if (!valid) return;
      setCurrentStep(3);
    }
  }, [currentStep, selectedCustomer, trigger]);

  const goBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // Submit
  const onSubmit: SubmitHandler<NewOrderFormValues> = async (data) => {
    try {
      const payload = {
        customerId: data.customerId,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        notes: data.notes || undefined,
        designNotes: data.designNotes || undefined,
        items: data.items.map((item) => ({
          productType: item.productType,
          attributes: item.attributes || {},
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          printMethod: (item.printMethod as PrintMethod) || undefined,
          printLocations: item.printLocations as PrintLocation[],
          description: item.description || undefined,
        })),
      };

      const result = await createOrder.mutateAsync(payload);
      localStorage.removeItem(LS_KEY);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B']
      });

      toast.success(`Order ${result.data.orderNumber} created!`);
      void navigate(`/orders/${result.data.id}`, { replace: true });
    } catch {
      toast.error('Failed to create order. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-gray-100 mb-2"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Orders
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        {!isOnline && (
          <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <WifiIcon className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">You're offline — order will be queued and synced when reconnected.</p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {currentStep === 1 && (
                <Step1Customer
                  selectedCustomer={selectedCustomer}
                  onCustomerChange={handleCustomerChange}
                  customerError={customerError}
                />
              )}
              {currentStep === 2 && <Step2Items />}
              {currentStep === 3 && (
                <Step3Review selectedCustomer={selectedCustomer} formValues={formValues} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-gray-100 pt-6">
            <TouchButton
              id="new-order-back"
              type="button"
              variant="secondary"
              size="md"
              icon={<ChevronLeftIcon className="h-5 w-5" />}
              onClick={currentStep === 1 ? () => navigate('/orders') : goBack}
              disabled={createOrder.isPending}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </TouchButton>

            {currentStep < 3 ? (
              <TouchButton
                id="new-order-next"
                type="button"
                variant="primary"
                size="md"
                onClick={goNext}
                disabled={currentStep === 1 && !selectedCustomer}
              >
                Next
                <ChevronRightIcon className="h-5 w-5 ml-1" />
              </TouchButton>
            ) : (
              <TouchButton
                id="new-order-submit"
                type="submit"
                variant="success"
                size="lg"
                loading={createOrder.isPending}
                disabled={createOrder.isPending || !can('orders:create')}
                icon={<CheckCircleIcon className="h-5 w-5" />}
              >
                {createOrder.isPending ? 'Creating Order…' : 'Create Order'}
              </TouchButton>
            )}
          </div>
        </form>
      </FormProvider>

      {/* Unsaved changes indicator */}
      {isDirty && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Draft auto-saved
        </p>
      )}
    </div>
  );
}
