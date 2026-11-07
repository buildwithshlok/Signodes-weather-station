/**
 * Rain Estimation Utility
 * 
 * Calculates estimated precipitation status from live DHT humidity readings
 * while the physical rain sensor is damaged.
 * 
 * Configurable thresholds:
 * - Humidity <= 90%: No Rain
 * - Humidity > 90% and < 95%: Light Rain
 * - Humidity >= 95% and <= 100%: Heavy Rain
 * - Missing or invalid humidity: Unknown
 */

export type RainStatus = 'No Rain' | 'Light Rain' | 'Heavy Rain' | 'Unknown';

export interface RainThresholdConfig {
  /** Maximum humidity percentage for "No Rain" (default: 90) */
  noRainMax: number;
  /** Maximum humidity percentage for "Light Rain" (default: 95) */
  lightRainMax: number;
  /** Maximum humidity percentage for "Heavy Rain" (default: 100) */
  heavyRainMax: number;
}

export const DEFAULT_RAIN_THRESHOLDS: RainThresholdConfig = {
  noRainMax: 90,
  lightRainMax: 95,
  heavyRainMax: 100,
};

export const RAIN_HUMIDITY_THRESHOLDS = {
  NO_RAIN_MAX: DEFAULT_RAIN_THRESHOLDS.noRainMax,
  LIGHT_RAIN_MAX: DEFAULT_RAIN_THRESHOLDS.lightRainMax,
  HEAVY_RAIN_MAX: DEFAULT_RAIN_THRESHOLDS.heavyRainMax,
};

export const RAIN_ESTIMATION_LABEL = 'Humidity-based estimate';
export const RAIN_ESTIMATION_NOTE = 'Estimated from humidity — not a physical rain-sensor reading';
export const RAIN_ESTIMATION_TOOLTIP = 'Humidity-based estimate — not a physical rain-sensor reading';

export type RainCategory = 'none' | 'light' | 'heavy' | 'unknown';

export interface RainEstimationDetails {
  status: RainStatus;
  category: RainCategory;
  isEstimated: boolean;
  label: string;
  note: string;
}

/**
 * Calculates rain status from actual DHT humidity reading.
 */
export function estimateRainFromHumidity(
  humidity: number | string | null | undefined,
  config: RainThresholdConfig = DEFAULT_RAIN_THRESHOLDS
): RainStatus {
  if (humidity === null || humidity === undefined) {
    return 'Unknown';
  }
  const val = typeof humidity === 'number' ? humidity : parseFloat(String(humidity).trim());
  if (isNaN(val) || val < 0 || val > 100) {
    return 'Unknown';
  }
  if (val <= config.noRainMax) {
    return 'No Rain';
  }
  if (val < config.lightRainMax) {
    return 'Light Rain';
  }
  if (val <= config.heavyRainMax) {
    return 'Heavy Rain';
  }
  return 'Unknown';
}

/**
 * Returns structured metadata and classification for rain estimation.
 */
export function getRainEstimationDetails(
  humidity: number | string | null | undefined,
  config: RainThresholdConfig = DEFAULT_RAIN_THRESHOLDS
): RainEstimationDetails {
  const status = estimateRainFromHumidity(humidity, config);
  let category: RainCategory = 'unknown';
  if (status === 'No Rain') category = 'none';
  else if (status === 'Light Rain') category = 'light';
  else if (status === 'Heavy Rain') category = 'heavy';

  return {
    status,
    category,
    isEstimated: true,
    label: RAIN_ESTIMATION_LABEL,
    note: RAIN_ESTIMATION_NOTE,
  };
}
