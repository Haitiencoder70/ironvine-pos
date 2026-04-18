import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, QrCodeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { clsx } from 'clsx';
import type { SearchOrder, SearchInventoryItem, SearchCustomer } from '../../types';

export function Omnibar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useBarcodeScanner((scanned) => {
    setIsOpen(true);
    setQuery(scanned);
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', query],
    queryFn: () => searchApi.globalSearch(query),
    enabled: query.length >= 2 && isOpen,
  });

  const searchResults = data?.data;

  if (!isOpen) return null;

  function closeAndNavigate(to: string) {
    setIsOpen(false);
    navigate(to);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 sm:px-6">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={() => setIsOpen(false)}
           className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
        />
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: -20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: -20 }}
           className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-gray-200"
        >
          <div className="flex items-center px-4 min-h-[64px] border-b border-gray-100">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders, customers, or scan a barcode (Ctrl+K)..."
              className="flex-1 bg-transparent text-lg text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <QrCodeIcon className={clsx("h-6 w-6 ml-3 transition-colors", query ? "text-blue-500" : "text-gray-300")} />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {!query && (
              <p className="text-sm text-gray-400 text-center py-8">
                Type at least 2 characters or scan a barcode to globally search.
              </p>
            )}

            {isLoading && query.length >= 2 && (
              <div className="flex justify-center py-8">
                <div className="animate-pulse flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-400"></div>
                </div>
              </div>
            )}

            {searchResults && (
              <div className="space-y-6">
                {(searchResults.orders?.length > 0) && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 px-2">Orders</h3>
                    <ul className="space-y-1">
                      {searchResults.orders.map((o: SearchOrder) => (
                        <li key={o.id}>
                          <button
                            onClick={() => closeAndNavigate(`/orders/${o.id}`)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-gray-900">{o.orderNumber}</span>
                              <span className="text-sm text-gray-500 ml-2">({o.customer?.company || `${o.customer?.firstName} ${o.customer?.lastName}`})</span>
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{o.status}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(searchResults.inventory?.length > 0) && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 px-2">Inventory</h3>
                    <ul className="space-y-1">
                      {searchResults.inventory.map((i: SearchInventoryItem) => (
                        <li key={i.id}>
                          <button
                            onClick={() => closeAndNavigate(`/inventory/${i.id}`)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-gray-900">{i.name}</span>
                              <span className="text-sm text-gray-500 ml-2">SKU: {i.sku}</span>
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{i.quantityOnHand} in stock</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(searchResults.customers?.length > 0) && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 px-2">Customers</h3>
                    <ul className="space-y-1">
                      {searchResults.customers.map((c: SearchCustomer) => (
                        <li key={c.id}>
                          <button
                            onClick={() => closeAndNavigate(`/customers`)} // Map to customers page specifically finding them if modal exists
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-gray-900">{c.firstName} {c.lastName}</span>
                              {c.company && <span className="text-sm text-gray-500 ml-2">({c.company})</span>}
                            </div>
                            <ArrowRightIcon className="h-4 w-4 text-gray-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {searchResults.orders?.length === 0 && searchResults.inventory?.length === 0 && searchResults.customers?.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No results found for "{query}".</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
