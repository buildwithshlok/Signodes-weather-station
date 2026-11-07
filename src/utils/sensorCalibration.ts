// Utility functions for sensor data calibration

/**
 * Default clean-air baseline for the MQ-7 sensor.
 * Used as fallback when no historical data is available.
 * This is overridden at runtime by computeCoBaseline().
 */
export const CO_CLEAN_AIR_BASELINE = 40;

/**
 * Compute a dynamic clean-air baseline from a collection of historical CO readings.
 * Takes the 10th-percentile of non-zero values — this represents the cleanest air
 * the sensor has recorded.
 * @param values - Array of raw MQ-7 sensor readings
 * @returns Computed baseline, or CO_CLEAN_AIR_BASELINE if insufficient data
 */
export function computeCoBaseline(values: number[]): number {
  const valid = values.filter((v) => v > 0 && isFinite(v)).sort((a, b) => a - b);
  if (valid.length < 5) return CO_CLEAN_AIR_BASELINE;
  // Use 10th percentile as the "clean air" reference
  const idx = Math.floor(valid.length * 0.10);
  return Math.max(1, valid[idx]);
}

/**
 * Convert a raw MQ-7 CO sensor value to a 0–100% Pollution Index.
 * The sensor outputs 0–100 mW/cm², so the percentage is the direct value.
 * Values above 100 are clamped to 100%.
 * @param rawValue - Raw sensor reading (mW/cm²)
 * @returns Pollution percentage 0–100
 */
export function coToPollutionPercent(rawValue: number): number {
  return Math.min(100, Math.max(0, rawValue));
}

/**
 * Get the pollution category and colors for a given CO Pollution Index percentage.
 */
export function getCOPollutionCategory(pct: number): {
  label: string;
  dotColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
} {
  if (pct < 25)  return { label: 'Very Clean',         dotColor: 'bg-emerald-400', textColor: 'text-emerald-400', borderColor: 'border-emerald-700/50', bgColor: 'bg-emerald-900/20' };
  if (pct < 50)  return { label: 'Normal',              dotColor: 'bg-yellow-400',  textColor: 'text-yellow-400',  borderColor: 'border-yellow-700/50',  bgColor: 'bg-yellow-900/20'  };
  if (pct < 75)  return { label: 'Moderate Pollution',  dotColor: 'bg-orange-400',  textColor: 'text-orange-400',  borderColor: 'border-orange-700/50',  bgColor: 'bg-orange-900/20'  };
  if (pct < 90)  return { label: 'High Pollution',      dotColor: 'bg-red-500',     textColor: 'text-red-400',     borderColor: 'border-red-700/50',     bgColor: 'bg-red-900/20'     };
  return          { label: 'Dangerous Pollution',       dotColor: 'bg-purple-400',  textColor: 'text-purple-300',  borderColor: 'border-purple-700/50',  bgColor: 'bg-purple-900/30'  };
}

/**
 * Gets air quality category, colors, and styling based directly on PM2.5 concentration (0-800 µg/m³)
 * @param pm25 - Raw PM2.5 concentration in µg/m³
 * @returns Object with category, color, and Tailwind classes
 */
export const getAirQualityCategory = (pm25: number): { category: string; color: string; textColor: string; bgColor: string } => {
  if (pm25 <= 30) {
    return { 
      category: 'Good', 
      color: '#4ade80', 
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20'
    };
  }
  if (pm25 <= 60) {
    return { 
      category: 'Satisfactory', 
      color: '#a3e635', 
      textColor: 'text-lime-400',
      bgColor: 'bg-lime-900/20'
    };
  }
  if (pm25 <= 90) {
    return { 
      category: 'Moderate', 
      color: '#facc15', 
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-900/20'
    };
  }
  if (pm25 <= 120) {
    return { 
      category: 'Poor', 
      color: '#f97316', 
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-900/20'
    };
  }
  if (pm25 <= 250) {
    return { 
      category: 'Very Poor', 
      color: '#ef4444', 
      textColor: 'text-red-400',
      bgColor: 'bg-red-900/20'
    };
  }
  return { 
    category: 'Severe', 
    color: '#7f1d1d', 
    textColor: 'text-rose-500',
    bgColor: 'bg-rose-900/30'
  };
};

export const getAQICategory = getAirQualityCategory;

// ─── Relative Pollution Index (RPI) ─────────────────────────────────────────

export interface RPIResult {
  rpi: number;
  category: string;
  color: string;
  textColor: string;
  dotColor: string;
  borderColor: string;
}

/**
 * Calculates the Relative Pollution Index for an MQ-7 CO sensor reading.
 * RPI = CurrentSensorValue / CleanAirBaseline
 * Scale: <1 Very Clean, 1–1.5 Normal, 1.5–2 Moderate, 2–3 High, >3 Dangerous
 */
export function calculateRPI(
  sensorValue: number,
  baseline: number = CO_CLEAN_AIR_BASELINE
): RPIResult {
  const rpi = baseline > 0 ? sensorValue / baseline : 0;
  if (rpi < 1.0) return { rpi, category: 'Very Clean Air',      color: 'bg-emerald-900/20', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400', borderColor: 'border-emerald-700/50' };
  if (rpi < 1.5) return { rpi, category: 'Normal Air Quality',  color: 'bg-yellow-900/20',  textColor: 'text-yellow-400',  dotColor: 'bg-yellow-400',  borderColor: 'border-yellow-700/50' };
  if (rpi < 2.0) return { rpi, category: 'Moderate Pollution',  color: 'bg-orange-900/20',  textColor: 'text-orange-400',  dotColor: 'bg-orange-400',  borderColor: 'border-orange-700/50' };
  if (rpi < 3.0) return { rpi, category: 'High Pollution',      color: 'bg-red-900/20',     textColor: 'text-red-400',     dotColor: 'bg-red-500',     borderColor: 'border-red-700/50' };
  return           { rpi, category: 'Dangerous Pollution', color: 'bg-purple-900/30',  textColor: 'text-purple-300',  dotColor: 'bg-purple-400',  borderColor: 'border-purple-700/50' };
}

/**
 * Normalizes UV index to a percentage scale (0-100%)
 */
export function normalizeUVIndex(uvIndex: number): number {
  return Math.round(Math.min(100, Math.max(0, uvIndex)));
}
