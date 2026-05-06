import { useState, useEffect, useRef, useMemo } from 'react';
import type { JSX } from 'react';
import type { InventoryItem } from '../../types';

export const INVENTORY_TO_MATERIAL_CATEGORY: Record<string, string> = {
  BLANK_SHIRTS:      'BLANK_SHIRTS',
  DTF_TRANSFERS:     'DTF_TRANSFERS',
  VINYL:             'VINYL',
  INK:               'INK',
  PACKAGING:         'PACKAGING',
  EMBROIDERY_THREAD: 'EMBROIDERY_THREAD',
  OTHER:             'OTHER',
};

interface MaterialComboboxProps {
  value: string;
  inventoryItemId: string | null;
  inventoryItems: InventoryItem[];
  onChange: (update: {
    material: string;
    category: string;
    estimatedCost: number;
    inventoryItemId: string | null;
  }) => void;
  placeholder?: string;
}

export function MaterialCombobox({
  value,
  inventoryItemId,
  inventoryItems,
  onChange,
  placeholder = 'Search or enter material…',
}: MaterialComboboxProps): JSX.Element {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return inventoryItems.slice(0, 20);
    return inventoryItems.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [inputValue, inventoryItems]);

  const linkedItem = inventoryItemId
    ? inventoryItems.find(item => item.id === inventoryItemId) ?? null
    : null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setOpen(true);

    if (text === '') {
      onChange({ material: '', category: '', estimatedCost: 0, inventoryItemId: null });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (item: InventoryItem) => {
    setInputValue(item.name);
    setOpen(false);
    onChange({
      material: item.name,
      category: INVENTORY_TO_MATERIAL_CATEGORY[item.category] ?? 'OTHER',
      estimatedCost: Number(item.costPrice),
      inventoryItemId: item.id,
    });
  };

  const truncateSku = (sku: string) => (sku.length > 12 ? sku.slice(0, 12) + '…' : sku);

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative" onBlur={handleContainerBlur}>
      <input
        type="text"
        role="combobox"
        aria-label="Material"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && filtered.length > 0 && (
        <ul role="listbox" className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {filtered.map(item => (
            <li key={item.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none min-h-[44px] flex flex-col justify-center"
              >
                <span className="font-medium text-gray-900 truncate">{item.name}</span>
                <span className="text-xs text-gray-400">{item.sku} · {item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-0.5">
        {linkedItem ? (
          <span className="text-xs text-green-700 bg-green-50 rounded px-1">
            SKU: {truncateSku(linkedItem.sku)}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Custom</span>
        )}
      </div>
    </div>
  );
}
