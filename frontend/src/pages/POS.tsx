import { Routes, Route } from 'react-router-dom';
import { POSTerminal } from './pos/POSTerminal';
import { SaleHistory } from './pos/SaleHistory';

export function POSPage(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<POSTerminal />} />
      <Route path="history" element={<SaleHistory />} />
    </Routes>
  );
}
