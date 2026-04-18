import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface OrderLabelPrintProps {
  orderNumber: string;
  customerName: string;
  createdAt: string;
  itemsSummary: string; // e.g. "2x Medium Red Tee..."
}

export const OrderLabelPrint = React.forwardRef<HTMLDivElement, OrderLabelPrintProps>(
  ({ orderNumber, customerName, createdAt, itemsSummary }, ref) => {
    return (
      <div
        ref={ref}
        className="print-label print-only"
        style={{
          width: '4in',
          height: '6in',
          padding: '0.25in',
          boxSizing: 'border-box',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'sans-serif',
          display: 'none', // Hidden on screen, shown via CSS on print
        }}
      >
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .print-only, .print-only * {
                visibility: visible;
                display: block !important;
              }
              .print-only {
                position: absolute;
                left: 0;
                top: 0;
                margin: 0;
                padding: 0;
                width: 4in;
                height: 6in;
              }
              @page {
                size: 4in 6in;
                margin: 0;
              }
            }
          `}
        </style>

        <div className="flex flex-col items-center justify-center h-full border-4 border-black p-4 text-center">
          <h1 className="text-3xl font-bold mb-2">ORDER: {orderNumber}</h1>
          <p className="text-xl font-medium mb-4">{customerName}</p>
          
          <div className="my-8">
            <QRCodeSVG value={orderNumber} size={180} level="H" />
          </div>

          <p className="text-sm border-t-2 border-dashed border-black pt-4 w-full text-left font-mono whitespace-pre-wrap">
            {itemsSummary}
          </p>

          <p className="text-xs mt-auto font-mono text-gray-500">T-Shirt POS System • {new Date(createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    );
  }
);

OrderLabelPrint.displayName = 'OrderLabelPrint';
