import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useCustomers } from '../../hooks/useCustomers';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { SkeletonLoader, EmptyState } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import type { JSX } from 'react';


// ─── Component ─────────────────────────────────────────────────────────────────

export function CustomerListPage(): JSX.Element {
  const navigate = useNavigate();
  const { can } = usePermissions();

  // Filters State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Sorting — handled server-side via sortKey/sortDir params
  const [sortField, setSortField] = useState<'name' | 'orders' | 'spent' | 'created'>('created');
  const [sortDesc, setSortDesc] = useState(true);

  // Data Loading
  const sortKeyMap: Record<string, string> = {
    name: 'lastName',
    created: 'createdAt',
  };

  const { data, isLoading, isError } = useCustomers({
    page,
    limit,
    search: debouncedSearch,
    sortKey: sortKeyMap[sortField] ?? 'createdAt',
    sortDir: sortDesc ? 'desc' : 'asc',
  });

  const rawCustomers = data?.data?.data ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  // Handlers
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(field !== 'name'); // default desc for dates/numbers
    }
  };

  const SortHeader = ({ field, label }: { field: typeof sortField, label: string }) => (
    <th 
      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-[10px]">{sortDesc ? '▼' : '▲'}</span>
        )}
      </div>
    </th>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Customers</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">Manage your clients and their contact information.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TouchButton
            variant="secondary"
            size="md"
            icon={<ArrowUpTrayIcon className="h-5 w-5" />}
          >
            Import
          </TouchButton>
          {can('customers:create') && (
            <TouchButton
              variant="primary"
              size="md"
              icon={<UserPlusIcon className="h-5 w-5" />}
              onClick={() => navigate('/customers/new')}
            >
              Add Customer
            </TouchButton>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm border-white/10 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or company..."
            value={search}
            onChange={(e) => {
               setSearch(e.target.value);
               setPage(1);
            }}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-gray-500 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-12 text-center">Avatar</th>
                <SortHeader field="name" label="Name" />
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Contact</th>
                <SortHeader field="created" label="Added Date" />
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <SkeletonLoader variant="table" rows={5} />
              ) : isError || rawCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="flex justify-center p-8">
                      <EmptyState
                        icon={<UserPlusIcon className="h-10 w-10" />}
                        title="No customers found"
                        description="Try adjusting your search or add a new customer."
                        action={{ label: 'Add Customer', href: '/customers/new', icon: <UserPlusIcon className="h-5 w-5" /> }}
                        minHeight="min-h-[300px]"
                        className="w-full max-w-lg border-0 shadow-none bg-transparent"
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                rawCustomers.map((customer) => {
                  return (
                    <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-center">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center font-bold text-sm border border-blue-500/30">
                          {customer.firstName[0]}{customer.lastName[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors truncate max-w-[200px]"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          {customer.firstName} {customer.lastName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 truncate max-w-[150px]">
                        {customer.company || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                           {customer.phone && (
                              <p className="text-gray-400 flex items-center gap-1.5"><PhoneIcon className="h-3.5 w-3.5" />{customer.phone}</p>
                           )}
                           {customer.email && (
                              <p className="text-gray-400 flex items-center gap-1.5"><EnvelopeIcon className="h-3.5 w-3.5" />{customer.email}</p>
                           )}
                           {!customer.phone && !customer.email && <span className="text-gray-500">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <TouchButton
                             variant="secondary"
                             size="sm"
                             onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
                           >
                             New Order
                           </TouchButton>
                           <TouchButton
                             variant="secondary"
                             size="sm"
                             onClick={() => navigate(`/customers/${customer.id}`)}
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
        ) : isError || rawCustomers.length === 0 ? (
          <EmptyState
            icon={<UserPlusIcon className="h-8 w-8" />}
            title="No customers found"
            description="Try adjusting your search or add a new customer."
            minHeight="min-h-[200px]"
          />
        ) : (
          rawCustomers.map((customer) => {
            return (
              <TouchCard
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                padding="md"
                className="glass-panel border-white/10 active:bg-white/10 transition-colors flex gap-4 items-start"
              >
                <div className="h-12 w-12 rounded-full bg-blue-500/20 text-blue-400 flex-shrink-0 flex items-center justify-center font-bold text-lg mt-0.5 border border-blue-500/30">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">
                    {customer.firstName} {customer.lastName}
                  </h3>

                  <div className="mt-2 space-y-1">
                    {customer.company && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5 truncate">
                        <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
                        {customer.company}
                      </p>
                    )}
                    {customer.phone && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5 truncate">
                        <PhoneIcon className="h-4 w-4 shrink-0" />
                        {customer.phone}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5 truncate">
                        <EnvelopeIcon className="h-4 w-4 shrink-0" />
                        {customer.email}
                      </p>
                    )}
                  </div>
                </div>
              </TouchCard>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-6">
          <p className="text-sm text-gray-500 hidden sm:block">
            Showing page <span className="font-medium text-gray-300">{page}</span> of{' '}
            <span className="font-medium text-gray-300">{totalPages}</span>
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
