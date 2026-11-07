/**
 * Simulated Pressure Utility
 * 
 * Provides deterministic simulated atmospheric pressure for live displays
 * while the physical BMP pressure sensor is damaged.
 * 
 * Requirements:
 * - Keep existing `pressure` field in shared sensor structure.
 * - Unit: hPa.
 * - Deterministic for a given sensor record/timestamp.
 * - Pure function: does not generate a new random number on every React render.
 * - Configurable baseline and reasonable variation.
 * - Visible UI indication: "Simulated Pressure" or "Not measured — simulated".
 */

export interface PressureSimulationConfig {
  /** Baseline atmospheric pressure in hPa (default: 1012.5 hPa for NIET Greater Noida elevation ~200m) */
  baselineHpa: number;
  /** Maximum variation in hPa (default: ±2.5 hPa) */
  maxVariationHpa: number;
}

export const DEFAULT_PRESSURE_CONFIG: PressureSimulationConfig = {
  baselineHpa: 1012.5,
  maxVariationHpa: 2.5,
};

export const SIMULATED_PRESSURE_BASELINE = DEFAULT_PRESSURE_CONFIG.baselineHpa;
export const SIMULATED_PRESSURE_MAX_VARIATION = DEFAULT_PRESSURE_CONFIG.maxVariationHpa;

export const PRESSURE_SIMULATION_LABEL = 'Simulated Pressure';
export const PRESSURE_SIMULATION_TOOLTIP = 'Not measured — simulated';

/**
 * Deterministically generates a simulated atmospheric pressure in hPa
 * based on a timestamp or seed string.
 * 
 * Calling this function multiple times with the same timestamp guarantees
 * the exact same numeric result without random jitter on re-renders.
 */
export function getSimulatedPressure(
  timestamp?: string | null,
  config: PressureSimulationConfig = DEFAULT_PRESSURE_CONFIG
): number {
  if (!timestamp || typeof timestamp !== 'string' || timestamp.trim() === '' || timestamp === 'N/A') {
    return config.baselineHpa;
  }
  const seed = timestamp.trim();
  
  // Deterministic 32-bit hash (djb2)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  // Normalized value between -1 and +1
  const normalized = (Math.abs(hash) % 10000) / 5000 - 1;
  
  // Calculate atmospheric semi-diurnal variation if timestamp has a valid hour
  let diurnal = 0;
  try {
    const d = new Date(seed.includes('_') ? seed.replace('_', 'T') : seed);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours() + d.getMinutes() / 60;
      diurnal = Math.sin((2 * Math.PI * hours) / 12) * 0.8;
    }
  } catch {
    diurnal = 0;
  }
  
  const rawVariation = (normalized * (config.maxVariationHpa - 0.8)) + diurnal;
  const clampedVariation = Math.max(-config.maxVariationHpa, Math.min(config.maxVariationHpa, rawVariation));
  
  const simulated = config.baselineHpa + clampedVariation;
  return Number(simulated.toFixed(2));
}

export function isPressureSimulated(node?: unknown): boolean {
  return node !== null && node !== undefined;
}
