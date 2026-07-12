import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Currency = 'IDR' | 'USD';

const STORAGE_KEY = 'mf-cur';
const USD_FX = 16000;

const idrFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (idr: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readInitial(): Currency {
  if (typeof window === 'undefined') return 'IDR';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'USD' ? 'USD' : 'IDR';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => setCurrencyState(c), []);

  const formatPrice = useCallback(
    (idr: number | null | undefined): string => {
      if (typeof idr !== 'number' || Number.isNaN(idr)) {
        return currency === 'USD' ? '$—' : 'Rp —';
      }
      if (currency === 'USD') {
        return '$' + Math.round(idr / USD_FX).toLocaleString('en-US');
      }
      return idrFmt.format(idr);
    },
    [currency],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, formatPrice }),
    [currency, setCurrency, formatPrice],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
