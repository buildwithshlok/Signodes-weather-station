/**
 * Sensor data formatting utilities
 * Ensures consistent decimal point precision across all displays
 */

/**
 * Format temperature readings to 1 decimal place
 * @param temp - Temperature value
 * @returns Formatted temperature string or 'N/A'
 */
export function formatTemperature(temp: number | undefined | null): string {
  if (temp === undefined || temp === null) return 'N/A';
  return Number(temp).toFixed(1);
}

/**
 * Format humidity to whole number percentage
 * @param humidity - Humidity percentage
 * @returns Formatted humidity string or 'N/A'
 */
export function formatHumidity(humidity: number | undefined | null): string {
  if (humidity === undefined || humidity === null) return 'N/A';
  return Math.round(humidity).toString();
}

/**
 * Format pressure to 2 decimal places
 * @param pressure - Pressure in hPa
 * @returns Formatted pressure string or 'N/A'
 */
export function formatPressure(pressure: number | undefined | null): string {
  if (pressure === undefined || pressure === null) return 'N/A';
  return Number(pressure).toFixed(2);
}

/**
 * Format AQI values to whole numbers
 * @param aqi - AQI value
 * @returns Formatted AQI string or 'N/A'
 */
export function formatAQI(aqi: number | undefined | null): string {
  if (aqi === undefined || aqi === null) return 'N/A';
  return Math.round(aqi).toString();
}

/**
 * Format UV Index to 1 decimal place
 * @param uvIndex - UV Index value
 * @returns Formatted UV Index string or 'N/A'
 */
export function formatUVIndex(uvIndex: number | undefined | null): string {
  if (uvIndex === undefined || uvIndex === null) return 'N/A';
  return Number(uvIndex).toFixed(1);
}

/**
 * Format CO levels to 2 decimal places (ppm)
 * @param co - Carbon monoxide level
 * @returns Formatted CO string or 'N/A'
 */
export function formatCOLevel(co: number | undefined | null): string {
  if (co === undefined || co === null) return 'N/A';
  return Number(co).toFixed(2);
}

/**
 * Format latitude/longitude to 6 decimal places
 * @param coord - Latitude or longitude value
 * @returns Formatted coordinate string or 'N/A'
 */
export function formatCoordinate(coord: number | undefined | null): string {
  if (coord === undefined || coord === null) return 'N/A';
  return Number(coord).toFixed(6);
}

/**
 * Format latitude/longitude to 4 decimal places (compact view)
 * @param coord - Latitude or longitude value
 * @returns Formatted coordinate string or 'N/A'
 */
export function formatCoordinateCompact(coord: number | undefined | null): string {
  if (coord === undefined || coord === null) return 'N/A';
  return Number(coord).toFixed(4);
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format humidity for display, ensuring it stays within 0-100%
 * @param humidity - Humidity percentage
 * @returns Clamped and formatted humidity string
 */
export function formatHumidityWithBounds(humidity: number | undefined | null): string {
  if (humidity === undefined || humidity === null) return 'N/A';
  const clamped = clampValue(humidity, 0, 100);
  return Math.round(clamped).toString();
}

/**
 * Format UV sensor value for display (0-100 mW/cm² range)
 * @param uvIndex - UV sensor value (0-100 mW/cm²)
 * @returns Clamped and formatted UV value string
 */
export function formatUVIndexWithBounds(uvIndex: number | undefined | null): string {
  if (uvIndex === undefined || uvIndex === null) return 'N/A';
  const clamped = clampValue(uvIndex, 0, 100);
  return Number(clamped).toFixed(1);
}

/**
 * Format pressure within realistic range (900-1100 hPa)
 * @param pressure - Pressure in hPa
 * @returns Clamped and formatted pressure string
 */
export function formatPressureWithBounds(pressure: number | undefined | null): string {
  if (pressure === undefined || pressure === null) return 'N/A';
  const clamped = clampValue(pressure, 900, 1100);
  return Number(clamped).toFixed(2);
}

/**
 * Format temperature within realistic range (-50°C to 50°C)
 * @param temp - Temperature value
 * @returns Clamped and formatted temperature string
 */
export function formatTemperatureWithBounds(temp: number | undefined | null): string {
  if (temp === undefined || temp === null) return 'N/A';
  const clamped = clampValue(temp, -50, 50);
  return Number(clamped).toFixed(1);
}

/**
 * Format CO level within realistic range (0-10 ppm)
 * @param co - Carbon monoxide level
 * @returns Clamped and formatted CO level string
 */
export function formatCOLevelWithBounds(co: number | undefined | null): string {
  if (co === undefined || co === null) return 'N/A';
  const clamped = clampValue(co, 0, 10);
  return Number(clamped).toFixed(2);
}

/**
 * Format Air Quality (PM2.5) within realistic range (0-800 µg/m³)
 * @param val - PM2.5 value
 * @returns Clamped and formatted string
 */
export function formatAirQualityWithBounds(val: number | undefined | null): string {
  if (val === undefined || val === null) return 'N/A';
  const clamped = clampValue(val, 0, 800);
  return Math.round(clamped).toString();
}

export const formatAQIWithBounds = formatAirQualityWithBounds;

/**
 * Safely parse numeric sensor values, preserving 0 as 0 and returning null for missing/invalid data
 */
export function parseSensorNumber(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '' || str === 'N/A' || str === 'null' || str === 'undefined') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}
