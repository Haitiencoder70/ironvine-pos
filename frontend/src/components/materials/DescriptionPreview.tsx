import type { JSX } from 'react';

interface DescriptionPreviewProps {
  description: string;
  onEdit?: () => void;
}

export function DescriptionPreview({ description, onEdit }: DescriptionPreviewProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Generated Description</label>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Edit Description
          </button>
        )}
      </div>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium italic leading-relaxed min-h-[60px]">
        {description || 'Fill in the details to generate description...'}
      </div>
    </div>
  );
}
