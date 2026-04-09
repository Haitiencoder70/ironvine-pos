import { useNavigate } from 'react-router-dom';
import {
  PlusCircleIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface ActionCardProps {
  label: string;
  icon: React.ReactNode;
  colorClasses: string;
  onClick: () => void;
}

function ActionCard({ label, icon, colorClasses, onClick }: ActionCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-2xl p-5 min-h-[120px] w-full',
        'font-semibold text-sm transition-all duration-150 active:scale-[0.97]',
        colorClasses
      )}
    >
      <div className="h-8 w-8">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

export function QuickActions(): React.JSX.Element {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Order',
      icon: <PlusCircleIcon className="h-8 w-8" />,
      colorClasses: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
      onClick: () => void navigate('/orders/new'),
    },
    {
      label: 'Add Customer',
      icon: <UserPlusIcon className="h-8 w-8" />,
      colorClasses: 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200',
      onClick: () => void navigate('/customers/new'),
    },
    {
      label: 'Create PO',
      icon: <DocumentPlusIcon className="h-8 w-8" />,
      colorClasses: 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200',
      onClick: () => void navigate('/purchase-orders/new'),
    },
    {
      label: 'Check Inventory',
      icon: <ArchiveBoxIcon className="h-8 w-8" />,
      colorClasses: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200',
      onClick: () => void navigate('/inventory'),
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <ActionCard key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
