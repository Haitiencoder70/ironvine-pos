import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  UserIcon,
  MapPinIcon,
  TagIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchInput } from '../../components/ui/TouchInput';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';
import type { JSX } from 'react';

// ─── Schema ───────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
});

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  billing: addressSchema.optional(),
  shippingSameAsBilling: z.boolean().default(true),
  shipping: addressSchema.optional(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function AddEditCustomerPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { data, isLoading: isFetchingCust } = useCustomer(id ?? '');
  const customer = data?.data;

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isSubmitting = createCustomer.isPending || updateCustomer.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      company: '',
      phone: '',
      email: '',
      shippingSameAsBilling: true,
      billing: { street: '', city: '', state: '', zip: '' },
      shipping: { street: '', city: '', state: '', zip: '' },
      notes: '',
    },
  });

  const sameAsBilling = useWatch({ control, name: 'shippingSameAsBilling' });

  useEffect(() => {
    if (isEditing && customer) {
      reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        company: customer.company || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || '',
        // The current schema maps addresses natively via association ids implicitly handled via the backend cascade mappings,
        // Assuming we hydrate from some nested attributes if available via payload mapping
        shippingSameAsBilling: true, // simplified for POS flow 
        billing: { street: '', city: '', state: '', zip: '' }, 
        shipping: { street: '', city: '', state: '', zip: '' },
      });
    }
  }, [isEditing, customer, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
        billing: data.billing?.street ? { ...data.billing, country: 'US' } : undefined,
        shipping: (!data.shippingSameAsBilling && data.shipping?.street) 
          ? { ...data.shipping, country: 'US' } 
          : (data.billing?.street ? { ...data.billing, country: 'US' } : undefined)
      };

      if (isEditing && id) {
        await updateCustomer.mutateAsync({ id, data: payload });
        navigate(`/customers/${id}`);
      } else {
        const res = await createCustomer.mutateAsync(payload);
        navigate(`/customers/${res.data.id}`);
      }
    } catch {
       // Component handles
    }
  };

  if (isEditing && isFetchingCust) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="h-96 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? `Updating ${customer?.firstName} ${customer?.lastName}` : 'Create a new client profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <UserIcon className="h-5 w-5 text-gray-500" />
            Contact Information
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TouchInput
              label="First Name *"
              placeholder="Jane"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TouchInput
              label="Last Name *"
              placeholder="Smith"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <TouchInput
              label="Company"
              placeholder="Acme Corp"
              icon={<BuildingOfficeIcon className="h-4 w-4" />}
              error={errors.company?.message}
              {...register('company')}
            />
            <div className="hidden sm:block" /> {/* spacer */}
            
            <TouchInput
              label="Phone"
              placeholder="(555) 000-0000"
              type="tel"
              icon={<PhoneIcon className="h-4 w-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <TouchInput
              label="Email"
              placeholder="jane@example.com"
              type="email"
              icon={<EnvelopeIcon className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4 mt-2">
            <MapPinIcon className="h-5 w-5 text-gray-500" />
            Billing Address
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12">
               <TouchInput
                 label="Street Address"
                 {...register('billing.street')}
                 error={errors.billing?.street?.message}
               />
            </div>
            <div className="md:col-span-5">
               <TouchInput
                 label="City"
                 {...register('billing.city')}
                 error={errors.billing?.city?.message}
               />
            </div>
            <div className="md:col-span-4 flex flex-col gap-1.5">
               <label className="text-sm font-medium text-gray-700">State</label>
               <select
                 {...register('billing.state')}
                 className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-no-repeat cursor-pointer"
               >
                 <option value="">Select...</option>
                 {STATES.map(st => <option key={st} value={st}>{st}</option>)}
               </select>
            </div>
            <div className="md:col-span-3">
               <TouchInput
                 label="ZIP"
                 {...register('billing.zip')}
                 error={errors.billing?.zip?.message}
               />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-2 mt-2">
                <MapPinIcon className="h-5 w-5 text-gray-500" />
                Shipping Address
              </h2>
           </div>

           <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('shippingSameAsBilling')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700 select-none">Same as Billing Address</span>
           </label>

          {!sameAsBilling && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-100">
              <div className="md:col-span-12">
                 <TouchInput
                   label="Street Address"
                   {...register('shipping.street')}
                   error={errors.shipping?.street?.message}
                 />
              </div>
              <div className="md:col-span-5">
                 <TouchInput
                   label="City"
                   {...register('shipping.city')}
                   error={errors.shipping?.city?.message}
                 />
              </div>
              <div className="md:col-span-4 flex flex-col gap-1.5">
                 <label className="text-sm font-medium text-gray-700">State</label>
                 <select
                   {...register('shipping.state')}
                   className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-no-repeat cursor-pointer"
                 >
                   <option value="">Select...</option>
                   {STATES.map(st => <option key={st} value={st}>{st}</option>)}
                 </select>
              </div>
              <div className="md:col-span-3">
                 <TouchInput
                   label="ZIP"
                   {...register('shipping.zip')}
                   error={errors.shipping?.zip?.message}
                 />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <TagIcon className="h-5 w-5 text-gray-500" />
            Tags & Notes
          </h2>
          <div className="flex flex-col gap-1.5">
            <textarea
              rows={3}
              placeholder="Tag preferences (#VIP), specific delivery instructions..."
              {...register('notes')}
              className={clsx(
                'w-full rounded-xl border bg-white px-4 py-3 text-base shadow-sm resize-none',
                errors.notes ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:outline-none focus:ring-2'
              )}
            />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-4xl mx-auto flex gap-4">
            <TouchButton
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </TouchButton>
            <TouchButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              icon={<CheckCircleIcon className="h-5 w-5" />}
            >
              {isEditing ? 'Save Changes' : 'Create Customer'}
            </TouchButton>
          </div>
        </div>

      </form>
    </div>
  );
}
