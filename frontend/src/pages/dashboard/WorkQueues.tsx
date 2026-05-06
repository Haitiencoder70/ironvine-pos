import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  PrinterIcon,
  ShoppingCartIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type {
  DashboardWorkOrder,
  DashboardWorkPurchaseOrder,
  DashboardWorkQueues,
} from '../../types';

interface WorkQueuesProps {
  queues: DashboardWorkQueues | undefined;
  loading: boolean;
}

interface QueueConfig<T> {
  title: string;
  count: number;
  icon: React.ReactNode;
  items: T[];
  emptyText: string;
  viewAllPath: string;
  renderItem: (item: T) => React.ReactNode;
}

function customerName(order: DashboardWorkOrder): string {
  const name = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : '';
  return order.customer?.company || name || 'Unknown Customer';
}

function dateLabel(value?: string | null): { text: string; tone: string } | null {
  if (!value) return null;
  const date = new Date(value);
  if (isToday(date)) return { text: 'Today', tone: 'text-amber-300' };
  if (isPast(date)) return { text: `Overdue ${format(date, 'MMM d')}`, tone: 'text-rose-300' };
  return { text: format(date, 'MMM d'), tone: 'text-gray-500' };
}

function LoadingRows(): React.JSX.Element {
  return (
    <div className="space-y-2 p-3">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-[58px] rounded-xl bg-white/[0.05] animate-pulse" />
      ))}
    </div>
  );
}

function QueuePanel<T>({ config, loading }: { config: QueueConfig<T>; loading: boolean }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="dashboard-panel rounded-2xl overflow-hidden min-h-[250px]">
      <div className="dashboard-panel-header flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-blue-300">
            {config.icon}
          </span>
          <div className="min-w-0">
            <h3 className="heading-gradient text-[13px] font-bold tracking-tight truncate">{config.title}</h3>
            <p className="text-[11px] text-gray-600">{config.count} open</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(config.viewAllPath)}
          className="text-[12px] font-semibold text-blue-400 hover:text-blue-300 min-h-[44px] px-2 rounded-xl hover:bg-white/5"
        >
          View
        </button>
      </div>

      {loading ? (
        <LoadingRows />
      ) : config.items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <ClipboardDocumentListIcon className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-[12px] font-semibold text-gray-500">{config.emptyText}</p>
        </div>
      ) : (
        <div className="divide-y dashboard-divider">
          {config.items.slice(0, 4).map((item, index) => (
            <div key={index}>{config.renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkQueues({ queues, loading }: WorkQueuesProps): React.JSX.Element {
  const navigate = useNavigate();

  const orderRow = (order: DashboardWorkOrder): React.ReactNode => {
    const due = dateLabel(order.dueDate);

    return (
      <button
        type="button"
        onClick={() => navigate(`/orders/${order.id}`)}
        className="dashboard-row-hover w-full min-h-[58px] px-4 py-3 flex items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-300 truncate">{order.orderNumber}</p>
          <p className="text-[11.5px] text-gray-600 truncate mt-0.5">{customerName(order)}</p>
        </div>
        {due && <span className={clsx('text-[11px] font-semibold whitespace-nowrap', due.tone)}>{due.text}</span>}
      </button>
    );
  };

  const poRow = (po: DashboardWorkPurchaseOrder): React.ReactNode => {
    const expected = dateLabel(po.expectedDate);

    return (
      <button
        type="button"
        onClick={() => navigate(`/purchase-orders/${po.id}`)}
        className="dashboard-row-hover w-full min-h-[58px] px-4 py-3 flex items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-300 truncate">{po.poNumber}</p>
          <p className="text-[11.5px] text-gray-600 truncate mt-0.5">
            {po.vendor?.name ?? 'Vendor'}{po.linkedOrder ? ` - ${po.linkedOrder.orderNumber}` : ''}
          </p>
        </div>
        {expected && <span className={clsx('text-[11px] font-semibold whitespace-nowrap', expected.tone)}>{expected.text}</span>}
      </button>
    );
  };

  const configs: QueueConfig<DashboardWorkOrder | DashboardWorkPurchaseOrder>[] = [
    {
      title: 'Needs Materials',
      count: queues?.needsMaterials.length ?? 0,
      icon: <ShoppingCartIcon className="h-5 w-5" />,
      items: queues?.needsMaterials ?? [],
      emptyText: 'No material orders waiting.',
      viewAllPath: '/orders?status=MATERIALS_ORDERED',
      renderItem: (item) => orderRow(item as DashboardWorkOrder),
    },
    {
      title: 'POs To Receive',
      count: queues?.purchaseOrdersToReceive.length ?? 0,
      icon: <CubeIcon className="h-5 w-5" />,
      items: queues?.purchaseOrdersToReceive ?? [],
      emptyText: 'No incoming POs waiting.',
      viewAllPath: '/purchase-orders',
      renderItem: (item) => poRow(item as DashboardWorkPurchaseOrder),
    },
    {
      title: 'In Production',
      count: queues?.inProduction.length ?? 0,
      icon: <PrinterIcon className="h-5 w-5" />,
      items: queues?.inProduction ?? [],
      emptyText: 'No active production jobs.',
      viewAllPath: '/orders?status=IN_PRODUCTION',
      renderItem: (item) => orderRow(item as DashboardWorkOrder),
    },
    {
      title: 'Ready To Ship',
      count: queues?.readyToShip.length ?? 0,
      icon: <TruckIcon className="h-5 w-5" />,
      items: queues?.readyToShip ?? [],
      emptyText: 'Nothing waiting to ship.',
      viewAllPath: '/orders?status=READY_TO_SHIP',
      renderItem: (item) => orderRow(item as DashboardWorkOrder),
    },
  ];

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="heading-gradient text-[15px] font-bold tracking-tight">Active Work Queues</h2>
          <p className="text-[12px] text-gray-600 mt-1">The jobs and supplier orders that need staff attention next.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {configs.map((config) => (
          <QueuePanel key={config.title} config={config} loading={loading} />
        ))}
      </div>
    </div>
  );
}
