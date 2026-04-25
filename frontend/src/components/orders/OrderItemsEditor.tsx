import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchButton } from '../ui/TouchButton';
import { Modal } from '../ui/Modal';
import { ProductPickerModal } from './ProductPickerModal';
import { ProductOrderConfigurator, CustomItemForm } from './ProductOrderConfigurator';
import type { ConfiguredOrderItem } from './ProductOrderConfigurator';
import type { NewOrderFormValues, OrderItemFormValues } from '../../pages/orders/NewOrder';
import type { Product } from '../../hooks/useProducts';
import { formatCurrency } from '../../hooks/useProducts';

// ─── Item display row ─────────────────────────────────────────────────────────

function OrderItemRow({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}): React.JSX.Element {
  const { watch } = useFormContext<NewOrderFormValues>();
  const [expanded, setExpanded] = useState(false);

  const item = watch(`items.${index}`) as OrderItemFormValues | undefined;
  const config: ConfiguredOrderItem | undefined = item?._configured;
  const lineTotal = config?.lineTotal ?? ((item?.quantity ?? 0) * (item?.unitPrice ?? 0));

  // Guard: during AnimatePresence exit the form field is already removed
  if (!item) return <div />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
    >
      {/* Summary row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5 text-2xl" role="img" aria-hidden="true">
          {config?.isCustomItem ? '📋' : '👕'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {item.quantity}×{' '}
            {config?.productName ?? item.description ?? `Item #${index + 1}`}
          </p>

          {config && !config.isCustomItem && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {[config.brand, config.color].filter(Boolean).join(' · ')}
              {config.sizeBreakdown.length > 0 && (
                ' · ' + config.sizeBreakdown.map(s => `${s.qty}×${s.size}`).join(', ')
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {config?.printMethod && (
              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">
                {config.printMethod}
              </span>
            )}
            {config?.selectedAddOns.map(ao => (
              <span key={ao.id} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                +{ao.name}
              </span>
            ))}
            {config?.isPriceOverridden && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                <ExclamationTriangleIcon className="h-2.5 w-2.5" />
                Price overridden
              </span>
            )}
            {config?.isCustomItem && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                Custom
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900">{formatCurrency(lineTotal)}</span>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove item"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50 space-y-3 text-sm">
              {config ? (
                <>
                  {/* Configured product detail */}
                  {config.printLocations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Print Locations</p>
                      <div className="flex flex-wrap gap-1">
                        {config.printLocations.map(loc => (
                          <span key={loc} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">{loc}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.designDescription && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Design</p>
                      <p className="text-gray-700 text-xs italic">{config.designDescription}</p>
                    </div>
                  )}

                  {/* Price breakdown */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Breakdown</p>
                    <div className="space-y-1 text-xs">
                      {config.sizeBreakdown.length > 0 ? (
                        config.sizeBreakdown.map((s, i) => (
                          <div key={i} className="flex justify-between text-gray-600">
                            <span>{s.qty}× {s.size}</span>
                            <span className="font-medium">{formatCurrency(s.qty * config.unitPrice)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between text-gray-600">
                          <span>{config.totalQuantity}× @ {formatCurrency(config.unitPrice)}</span>
                          <span className="font-medium">{formatCurrency(config.totalQuantity * config.unitPrice)}</span>
                        </div>
                      )}
                      {config.sizeUpchargesTotal > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Size upcharges</span>
                          <span className="font-medium">+{formatCurrency(config.sizeUpchargesTotal)}</span>
                        </div>
                      )}
                      {config.selectedAddOns.map(ao => (
                        <div key={ao.id} className="flex justify-between text-blue-600">
                          <span>{ao.name}</span>
                          <span className="font-medium">+{formatCurrency(ao.pricePerItem * config.totalQuantity)}</span>
                        </div>
                      ))}
                      {config.isPriceOverridden && (
                        <div className="flex items-center gap-1 text-amber-600 pt-1">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          <span>Override from {formatCurrency(config.originalTierPrice)}: {config.priceOverrideReason || 'no reason given'}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                        <span>Item total</span>
                        <span>{formatCurrency(config.lineTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Required materials */}
                  {config.requiredMaterials.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Required Materials</p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
                        {config.requiredMaterials.map((mat, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span>{mat.quantity}× {mat.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.itemNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-gray-600 text-xs italic">{config.itemNotes}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Legacy / plain item fallback */
                <div className="text-gray-600 text-xs space-y-1">
                  <p>Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  {item.description && <p className="italic">{item.description}</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Modal flow state ─────────────────────────────────────────────────────────

type ModalView = 'picker' | 'configurator' | 'custom';

// ─── OrderItemsEditor — exported ──────────────────────────────────────────────

export function OrderItemsEditor(): React.JSX.Element {
  const { control } = useFormContext<NewOrderFormValues>();
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<ModalView>('picker');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const openModal = () => {
    setModalView('picker');
    setSelectedProduct(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setModalView('picker');
  };

  const handleProductSelected = (product: Product) => {
    setSelectedProduct(product);
    setModalView('configurator');
  };

  const handleCustomItem = () => {
    setModalView('custom');
  };

  const handleAddConfigured = (configured: ConfiguredOrderItem) => {
    const item: OrderItemFormValues = {
      productType: configured.productType,
      attributes: configured.attributes,
      quantity: configured.totalQuantity,
      unitPrice: configured.unitPrice,
      printMethod: configured.printMethod,
      printLocations: configured.printLocations,
      description: configured.description,
      requiredMaterials: configured.requiredMaterials,
      _configured: configured,
    };
    append(item);
    closeModal();
  };

  const modalTitle =
    modalView === 'picker' ? 'Select a Product'
    : modalView === 'custom' ? 'Custom Item'
    : selectedProduct?.name ?? 'Configure Product';

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {fields.map((field, index) => (
          <OrderItemRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </AnimatePresence>

      {fields.length === 0 && (
        <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm mb-1">No items added yet</p>
          <p className="text-gray-400 text-xs">Click "Add Item" to choose from your product catalog</p>
        </div>
      )}

      <TouchButton
        id="add-order-item"
        type="button"
        variant="secondary"
        size="md"
        fullWidth
        icon={<PlusIcon className="h-5 w-5" />}
        onClick={openModal}
      >
        Add Item
      </TouchButton>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={modalTitle}
        size={modalView === 'configurator' ? 'xl' : 'lg'}
        closeOnOverlayClick={false}
      >
        {modalView === 'picker' && (
          <ProductPickerModal
            onSelectProduct={handleProductSelected}
            onCustomItem={handleCustomItem}
            onCancel={closeModal}
          />
        )}
        {modalView === 'configurator' && selectedProduct && (
          <ProductOrderConfigurator
            product={selectedProduct}
            onBack={() => setModalView('picker')}
            onAdd={handleAddConfigured}
          />
        )}
        {modalView === 'custom' && (
          <CustomItemForm
            onBack={() => setModalView('picker')}
            onAdd={handleAddConfigured}
          />
        )}
      </Modal>
    </div>
  );
}
