import { Outlet } from 'react-router-dom';
import { PosProvider } from './PosContext';

/** Route layout that wraps every `/pos*` page with the shared POS store.
 *  Mount as the parent route so the cart survives navigation between
 *  the browse page and the checkout page. */
export function PosLayout() {
  return (
    <PosProvider>
      <Outlet />
    </PosProvider>
  );
}
