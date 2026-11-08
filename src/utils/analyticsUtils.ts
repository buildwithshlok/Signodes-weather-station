/**
 * Data Trends and Analytics Utilities
 * Calculation and bucketing utilities for NIET Weather Station analytics
 */

export type MetricType = 'temperature' | 'humidity' | 'pm25' | 'pm10';
export type PeriodType = '7d' | '30d' | '3m' | '6m' | '12m';

export interface ChartPoint {
  key: string;
  time: string;
  fullTime: string;
  value: number | null;
  min: number | null;
  max: number | null;
  count: number;
  bucketIndex: number;
  totalBuckets: number;
}

export interface GraphConfig {
  id: MetricType;
  title: string;
  icon: React.ElementType;
  unit: string;
  color: string;
  currentValue: number;
}

/**
 * Period configurations with target row fetch counts and UI labels
 */
export const PERIOD_CONFIGS: Record<PeriodType, { label: string; rangeLabel: string; targetRows: number }> = {
  '7d': {
    label: '7 Days',
    rangeLabel: 'Past 7 Days',
    targetRows: 1200,
  },
  '30d': {
    label: '30 Days',
    rangeLabel: 'Past 30 Days',
    targetRows: 3500,
  },
  '3m': {
    label: '3 Months',
    rangeLabel: 'Past 3 Months',
    targetRows: 10000,
  },
  '6m': {
    label: '6 Months',
    rangeLabel: 'Past 6 Months',
    targetRows: 20000,
  },
  '12m': {
    label: '12 Months',
    rangeLabel: 'Past 12 Months',
    targetRows: 30000,
  },
};

/**
 * Calculates sensible Y-axis bounds and 6 evenly spaced ticks
 */
export function calculateYAxisBounds(
  type: MetricType,
  values: number[]
): { min: number; max: number; ticks: number[] } {
  if (values.length === 0) {
    const fallback = type === 'humidity' ? { min: 0, max: 100 } : { min: 0, max: 50 };
    const step = (fallback.max - fallback.min) / 5;
    return { ...fallback, ticks: [0, 1, 2, 3, 4, 5].map((i) => Number((fallback.max - i * step).toFixed(1))) };
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  let min = 0;
  let max = 100;

  if (type === 'temperature') {
    min = Math.floor((dataMin - 2) / 5) * 5;
    max = Math.ceil((dataMax + 2) / 5) * 5;
    if (max - min < 10) {
      max = min + 10;
    }
  } else if (type === 'humidity') {
    min = Math.max(0, Math.floor((dataMin - 5) / 10) * 10);
    max = Math.min(100, Math.ceil((dataMax + 5) / 10) * 10);
    if (max - min < 20) {
      if (max + 10 <= 100) max += 10;
      else min = Math.max(0, min - 10);
    }
  } else if (type === 'pm25' || type === 'pm10') {
    min = 0;
    const padded = dataMax * 1.15;
    if (padded <= 50) max = 50;
    else if (padded <= 100) max = 100;
    else if (padded <= 200) max = 200;
    else if (padded <= 300) max = 300;
    else if (padded <= 400) max = 400;
    else if (padded <= 500) max = 500;
    else if (padded <= 600) max = 600;
    else if (padded <= 800) max = 800;
    else max = Math.ceil(padded / 100) * 100;
  }

  const step = (max - min) / 5;
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => Number((max - i * step).toFixed(type === 'humidity' ? 0 : 1)));

  return { min, max, ticks };
}

