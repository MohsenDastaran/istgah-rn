import * as React from 'react';

type SheetDetentContextValue = {
  /** Bottom map padding in points — matches the sheet height covering the map. */
  mapPaddingBottom: number;
  setMapPaddingBottom: (padding: number) => void;
};

const SheetDetentContext = React.createContext<SheetDetentContextValue | null>(null);

export function SheetDetentProvider({ children }: { children: React.ReactNode }) {
  const [mapPaddingBottom, setMapPaddingBottom] = React.useState(0);

  const value = React.useMemo<SheetDetentContextValue>(
    () => ({ mapPaddingBottom, setMapPaddingBottom }),
    [mapPaddingBottom]
  );

  return React.createElement(SheetDetentContext.Provider, { value }, children);
}

export function useSheetDetent(): SheetDetentContextValue {
  const ctx = React.useContext(SheetDetentContext);
  if (!ctx) throw new Error('useSheetDetent must be used within SheetDetentProvider');
  return ctx;
}

/** Fraction of screen height covered by each sheet detent index. */
export function sheetDetentFraction(index: number, peekFraction: number): number {
  if (index <= 0) return peekFraction;
  if (index === 1) return 0.5;
  return 1;
}
