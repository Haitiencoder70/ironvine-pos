import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  TruckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useVendor, useCreateVendor, useUpdateVendor } from '../../hooks/useVendors';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { TouchInput } from '../../components/ui/TouchInput';
import type { JSX } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { id: 'Garments', label: 'Blank Garments' },
  { id: 'DTF', label: 'DTF Transfers' },
  { id: 'HTV', label: 'HTV Vinyl' },
  { id: 'Inks', label: 'Inks / Fluids' },
  { id: 'Supplies', label: 'General Supplies' },
];

function generateVendorCode(name: string): string {
  if (!name) return '';
  const clean = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.substring(0, 3) + Math.floor(100 + Math.random() * 900).toString();
}

function parseVendorMeta(notes?: string) {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const vendorFormSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(200),
  vendorCode: z.string().max(30).optional(),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  
  // Address block (will be serialized)
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  
  categories: z.array(z.string()),
  otherCategory: z.string().optional(),
  
  paymentTerms: z.string().max(200).optional(),
  rawNotes: z.string().max(1500).optional(),
  
  isActive: z.boolean().default(true),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export function AddEditVendorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: vendorData, isLoading: isLoadingVendor } = useVendor(id ?? '');
  const vendor = vendorData?.data;

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const isSubmitting = createVendor.isPending || updateVendor.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    mode: 'onBlur',
    defaultValues: {
      categories: [],
      isActive: true,
    },
  });

  // Init form
  useEffect(() => {
    if (isEdit && vendor) {
      const meta = parseVendorMeta(vendor.notes);
      
      const predefinedCats = CATEGORY_OPTIONS.map(c => c.id);
      const knownCats = vendor.categories.filter(c => predefinedCats.includes(c));
      const otherCats = vendor.categories.filter(c => !predefinedCats.includes(c)).join(', ');

      reset({
        name: vendor.name,
        contactName: vendor.contactName || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        website: vendor.website || '',
        vendorCode: meta?.vendorCode || '',
        street: meta?.address?.street || '',
        city: meta?.address?.city || '',
        state: meta?.address?.state || '',
        zip: meta?.address?.zip || '',
        categories: knownCats,
        otherCategory: otherCats,
        paymentTerms: vendor.paymentTerms || '',
        rawNotes: meta?.notes || (!meta ? vendor.notes || '' : ''),
        isActive: vendor.isActive,
      });
    }
  }, [isEdit, vendor, reset]);

  // Auto-generate vendor block
  const watchedName = watch('name');
  const watchedCode = watch('vendorCode');
  
  useEffect(() => {
    if (!isEdit && watchedName && !watchedCode) {
      // Very basic auto-gen debounce substitute
      const timer = setTimeout(() => {
         const currentCode = watch('vendorCode');
         if (!currentCode) setValue('vendorCode', generateVendorCode(watchedName));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [watchedName, isEdit, watchedCode, setValue, watch]);

  const onSubmit = async (data: VendorFormValues) => {
    // 1. Array combination
    const finalCategories = [...data.categories];
    if (data.otherCategory) {
      finalCategories.push(data.otherCategory.trim());
    }

    // 2. Serialization of complex non-DB mapped properties
    const syntheticNotes = JSON.stringify({
      vendorCode: data.vendorCode,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
      notes: data.rawNotes, // Original note intentions
    });

    // 3. Payload build
    const payload = {
      name: data.name,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      website: data.website,
      categories: finalCategories,
      paymentTerms: data.paymentTerms,
      notes: syntheticNotes, 
      isActive: data.isActive,
    };

    try {
      if (isEdit && id) {
        await updateVendor.mutateAsync({ id, data: payload });
        navigate(`/vendors/${id}`);
      } else {
        await createVendor.mutateAsync(payload);
        navigate('/vendors');
      }
    } catch {
       // Global toast bound
    }
  };

  const currentCategories = watch('categories') || [];

  if (isEdit && isLoadingVendor) {
    return <div className="p-6 max-w-4xl mx-auto animate-pulse flex flex-col gap-6"><div className="h-48 bg-gray-100 rounded-2xl" /><div className="h-48 bg-gray-100 rounded-2xl" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-r border-gray-300 pr-4 mr-2 inline-block">
            {isEdit ? 'Edit Vendor' : 'New Vendor'}
          </h1>
          <span className="text-sm text-gray-500 font-medium">Procurement Setup</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core Info */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
             <BuildingOfficeIcon className="h-5 w-5 text-gray-400" /> Basic Information
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                 <TouchInput
                   label="Company Name"
                   placeholder="e.g. SanMar Corp"
                   required
                   {...register('name')}
                   error={errors.name?.message}
                 />
              </div>
              <div className="md:col-span-1">
                 <TouchInput
                   label="Vendor Code"
                   placeholder="SMR-123"
                   {...register('vendorCode')}
                   error={errors.vendorCode?.message}
                 />
              </div>

              <div className="md:col-span-1">
                 <TouchInput
                   label="Contact Person"
                   placeholder="John Doe"
                   {...register('contactName')}
                   error={errors.contactName?.message}
                 />
              </div>
              <div className="md:col-span-1">
                 <TouchInput
                   label="Phone Number"
                   {...register('phone')}
                   error={errors.phone?.message}
                 />
              </div>

              <div className="md:col-span-1">
                 <TouchInput
                   label="Email Address"
                   type="email"
                   {...register('email')}
                   error={errors.email?.message}
                 />
              </div>
              <div className="md:col-span-1">
                 <TouchInput
                   label="Website"
                   type="url"
                   placeholder="https://..."
                   {...register('website')}
                   error={errors.website?.message}
                 />
              </div>
           </div>
        </TouchCard>

        {/* Address */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
             <TruckIcon className="h-5 w-5 text-gray-400" /> Office / Fulfillment Address
           </h2>
           <div className="space-y-4">
              <TouchInput
                label="Street Address"
                {...register('street')}
              />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <TouchInput label="City" {...register('city')} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <TouchInput label="State/Prov" {...register('state')} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <TouchInput label="ZIP/Postal" {...register('zip')} />
                </div>
              </div>
           </div>
        </TouchCard>

        {/* Categories */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 mb-2">Products & Services Provided</h2>
           <p className="text-sm text-gray-500 mb-4">Select all primary commodities procured from this entity.</p>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {CATEGORY_OPTIONS.map((cat) => (
                 <label 
                   key={cat.id} 
                   className={clsx(
                     "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all min-h-[48px]",
                     currentCategories.includes(cat.id) ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:border-gray-300"
                   )}
                 >
                   <input
                     type="checkbox"
                     value={cat.id}
                     {...register('categories')}
                     className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                   <span className={clsx("text-sm font-medium", currentCategories.includes(cat.id) ? "text-blue-900" : "text-gray-700")}>
                     {cat.label}
                   </span>
                 </label>
              ))}
           </div>
           
           <TouchInput
             label="Other Keywords (Comma separated)"
             placeholder="Acrylics, Mesh, Embroidery Thread"
             {...register('otherCategory')}
           />
        </TouchCard>

        {/* Terms */}
        <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
             <DocumentTextIcon className="h-5 w-5 text-gray-400" /> Business Terms
           </h2>
           
           <div className="space-y-4">
             <TouchInput
               label="Payment Terms"
               placeholder="Net 30, Due on Receipt, etc."
               {...register('paymentTerms')}
             />
             <TouchInput
               label="Internal Notes"
               placeholder="Only accept deliveries between 9am - 3pm..."
               {...register('rawNotes')}
             />

             {/* Active Toggle Wrapper */}
             <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mt-6">
                <div>
                   <p className="font-bold text-gray-900">Vendor Status</p>
                   <p className="text-xs text-gray-500">Determine if POs can be generated to this system.</p>
                </div>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                     <TouchButton 
                       type="button" 
                       variant={field.value ? 'success' : 'secondary'}
                       size="sm"
                       onClick={() => field.onChange(!field.value)}
                     >
                       {field.value ? 'Vendor is Active' : 'Vendor is Disabled'}
                     </TouchButton>
                  )}
                />
             </div>
           </div>
        </TouchCard>

        {/* Actions fixed bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10 lg:pl-64">
           <div className="max-w-4xl mx-auto flex gap-3">
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
                disabled={!isValid}
                icon={<CheckCircleIcon className="h-5 w-5" />}
              >
                {isEdit ? 'Save Changes' : 'Create Vendor'}
              </TouchButton>
           </div>
        </div>

      </form>
    </div>
  );
}
