export const DEFAULT_LOW_STOCK_PERCENTAGE_THRESHOLD = 0.2;
export const DEFAULT_LOW_STOCK_MINIMUM_THRESHOLD = 5;
export const DEFAULT_CRITICAL_STOCK_RATIO = 0.2;
export const DEFAULT_LOW_STOCK_RATIO = 0.5;

type StockLike = {
  p_quantity?: number | string | null;
  stock?: number | string | null;
  p_original_quantity?: number | string | null;
  original_stock?: number | string | null;
  low_stock_percentage_threshold?: number | string | null;
  percentage_threshold?: number | string | null;
  low_stock_minimum_threshold?: number | string | null;
  minimum_threshold?: number | string | null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const getLowStockMeta = (stock: StockLike) => {
  const remainingStock = Math.max(0, toNumber(stock.p_quantity ?? stock.stock, 0));
  const originalStock = Math.max(
    remainingStock,
    toNumber(stock.p_original_quantity ?? stock.original_stock, remainingStock)
  );
  const percentageThreshold = Math.max(
    0,
    toNumber(
      stock.low_stock_percentage_threshold ?? stock.percentage_threshold,
      DEFAULT_LOW_STOCK_PERCENTAGE_THRESHOLD
    )
  );
  const minimumThreshold = Math.max(
    0,
    toNumber(
      stock.low_stock_minimum_threshold ?? stock.minimum_threshold,
      DEFAULT_LOW_STOCK_MINIMUM_THRESHOLD
    )
  );

  const percentageValue = originalStock * percentageThreshold;
  const thresholdValue = Math.max(percentageValue, minimumThreshold);
  const stockRatio = originalStock > 0 ? remainingStock / originalStock : 0;

  let level: 'normal' | 'low' | 'critical' = 'normal';
  if (stockRatio <= DEFAULT_CRITICAL_STOCK_RATIO) level = 'critical';
  else if (stockRatio <= DEFAULT_LOW_STOCK_RATIO) level = 'low';

  const isLowStock = level === 'low' || level === 'critical';

  return {
    remainingStock,
    originalStock,
    stockRatio,
    level,
    isCriticalStock: level === 'critical',
    percentageThreshold,
    minimumThreshold,
    percentageValue,
    thresholdValue,
    isLowStock,
  };
};
