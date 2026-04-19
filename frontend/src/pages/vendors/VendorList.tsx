import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useVendors } from '../../hooks/useVendors';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { SkeletonLoader, EmptyState } from '../../components/ui';
import type { JSX } from 'react';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVendorMeta(notes?: string) {
  if (!notes) return { vendorCode: '', address: null };
  try {
    const parsed = JSON.parse(notes);
    return {
      vendorCode: parsed.vendorCode || '',
      address: parsed.address || null,
    };
  } catch {
    // Standard text notes
    return { vendorCode: '', address: null };
  }
}

const SUPPLIER_BADGE_CONFIG: Record<string, string> = {
  'Garments': 'bg-blue-100 text-blue-800',
  'DTF': 'bg-purple-100 text-purple-800',
  'HTV': 'bg-pink-100 text-pink-800',
  'Other': 'bg-gray-100 text-gray-800',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function VendorListPage(): JSX.Element {
  const navigate = useNavigate();

  // Filters State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data Loading
  const { data, isLoading, isError, refetch } = useVendors({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const rawVendors = data?.data?.data ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  // Local filtering to support arrays and active states if backend doesn't exact match our complex string searches natively
  const displayedVendors = rawVendors.filter(v => {
    let keep = true;
    if (activeFilter === 'ACTIVE') keep = keep && v.isActive;
    if (activeFilter === 'INACTIVE') keep = keep && !v.isActive;
    
    if (categoryFilter) {
      keep = keep && v.categories.some(c => c.toLowerCase().includes(categoryFilter.toLowerCase()));
    }
    return keep;
  });

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
           <p className="text-sm text-gray-500 mt-1">Manage suppliers, procurement ties, and material sources.</p>
        </div>
        <TouchButton
          variant="primary"
          size="md"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => navigate('/vendors/new')}
        >
          Add Vendor
        </TouchButton>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendor name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-300 bg-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="md:w-48 min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-base shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Garments">Garments</option>
          <option value="DTF">DTF Transfers</option>
          <option value="HTV">HTV Vinyl</option>
          <option value="Other">Other Elements</option>
        </select>

        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
            setPage(1);
          }}
          className="md:w-48 min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-base shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            Failed to load vendors. Check your connection and try again.
          </p>
          <button
            onClick={() => void refetch()}
            className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors min-h-[44px] px-4 rounded-xl hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-12 text-center">Code</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Supplies</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader variant="table" rows={5} />
              ) : displayedVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="flex justify-center p-8">
                      <EmptyState
                        icon={<BuildingOfficeIcon className="h-10 w-10" />}
                        title="No vendors found"
                        description="Try adjusting your filters or add a new vendor."
                        action={{ label: 'Add Vendor', href: '/vendors/new', icon: <PlusIcon className="h-5 w-5" /> }}
                        minHeight="min-h-[300px]"
                        className="w-full max-w-lg border-0 shadow-none bg-transparent"
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                displayedVendors.map((v) => {
                  const { vendorCode } = parseVendorMeta(v.notes);
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {vendorCode || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p 
                          className="font-bold text-gray-900 cursor-pointer hover:text-blue-600 truncate max-w-[200px] text-base"
                          onClick={() => navigate(`/vendors/${v.id}`)}
                        >
                          {v.name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                           {v.contactName && <p className="font-semibold text-gray-700">{v.contactName}</p>}
                           {v.phone && (
                              <p className="text-gray-500 flex items-center gap-1.5"><PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />{v.phone}</p>
                           )}
                           {v.email && (
                              <p className="text-gray-500 flex items-center gap-1.5"><EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />{v.email}</p>
                           )}
                           {!v.contactName && !v.phone && !v.email && <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                           {v.categories.length === 0 && <span className="text-gray-400 italic">—</span>}
                           {v.categories.map(cat => {
                              const config = SUPPLIER_BADGE_CONFIG[cat] || SUPPLIER_BADGE_CONFIG['Other'];
                              return (
                                <span key={cat} className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide', config)}>
                                  {cat}
                                </span>
                              );
                           })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {v.isActive ? (
                            <CheckBadgeIcon className="h-6 w-6 text-green-500 mx-auto" />
                         ) : (
                            <NoSymbolIcon className="h-6 w-6 text-gray-300 mx-auto" />
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 text-sm">
                           <TouchButton
                             variant="secondary"
                             size="sm"
                             onClick={() => navigate(`/purchase-orders/new?vendorId=${v.id}`)}
                             disabled={!v.isActive}
                           >
                             New PO
                           </TouchButton>
                           <TouchButton
                             variant="secondary"
                             size="sm"
                             onClick={() => navigate(`/vendors/${v.id}`)}
                           >
                             Profile
                           </TouchButton>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          <SkeletonLoader variant="card" rows={4} />
        ) : displayedVendors.length === 0 ? (
          <EmptyState
            icon={<BuildingOfficeIcon className="h-8 w-8" />}
            title="No vendors found"
            description="Try adjusting your search criteria."
            minHeight="min-h-[200px]"
          />
        ) : (
          displayedVendors.map((v) => {
            const { vendorCode } = parseVendorMeta(v.notes);
            return (
              <TouchCard
                key={v.id}
                onClick={() => navigate(`/vendors/${v.id}`)}
                padding="md"
                className="border border-gray-100"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={clsx("font-bold text-lg truncate", !v.isActive && "text-gray-400 line-through")}>
                        {v.name}
                      </h3>
                      {!v.isActive && <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md tracking-wider">Inactive</span>}
                    </div>
                    {vendorCode && <p className="text-xs font-mono text-gray-400">{vendorCode}</p>}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                     {v.categories.map(cat => {
                        const config = SUPPLIER_BADGE_CONFIG[cat] || SUPPLIER_BADGE_CONFIG['Other'];
                        return (
                          <span key={cat} className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide', config)}>
                            {cat}
                          </span>
                        );
                     })}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50 flex-wrap text-sm">
                   <TouchButton
                     variant="secondary"
                     size="sm"
                     onClick={(e) => {
                       e.stopPropagation();
                       navigate(`/purchase-orders/new?vendorId=${v.id}`);
                     }}
                     disabled={!v.isActive}
                     className="w-full sm:w-auto"
                   >
                     Create PO
                   </TouchButton>
                </div>
              </TouchCard>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6">
          <p className="text-sm text-gray-500 hidden sm:block">
            Showing page <span className="font-medium text-gray-900">{page}</span> of{' '}
            <span className="font-medium text-gray-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <TouchButton
              variant="secondary"
              size="md"
              icon={<ChevronLeftIcon className="h-5 w-5" />}
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isLoading}
            >
              Previous
            </TouchButton>
            <TouchButton
              variant="secondary"
              size="md"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || isLoading}
            >
              Next
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
