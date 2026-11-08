/**
 * Google Sheets Sensor Data Service
 * Handles fetching and parsing sensor data from Google Apps Script
 * Direct integration with fallback to proxy or direct Google Script URL
 */

import { z } from 'zod';
import { API_BASE, GOOGLE_SCRIPT_URL, COLS, getUVRisk } from '../config/api.ts';
import { parseSensorNumber } from '../utils/sensorFormatting.ts';
import { generateMockSensorData, generateHistoricalMockData } from './mockData.ts';

export const SensorDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  temperature: z.number().nullable(),
  dht_temperature: z.number().nullable().optional(),
  bmp_temperature: z.number().nullable().optional(),
  pressure: z.number().nullable(),
  humidity: z.number().nullable(),
  aqi25val: z.number().nullable(),
  aqi10val: z.number().nullable(),
  uvIndex: z.number().nullable(),
  uvRisk: z.string().nullable(),
  rain: z.string().nullable(),
  mq_co: z.number().nullable(),
  lastUpdated: z.string().nullable(),
});

export type SensorData = z.infer<typeof SensorDataSchema>;

// API Configuration
const API_URL = typeof window !== 'undefined' ? API_BASE : `http://localhost:3002${API_BASE}`;
const REQUEST_TIMEOUT = 30000; // 30 seconds

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const isDevMode = metaEnv?.MODE === 'development' || nodeEnv?.NODE_ENV === 'development';
const isMockForced = metaEnv?.VITE_USE_MOCK_DATA === 'true' || nodeEnv?.VITE_USE_MOCK_DATA === 'true';
const USE_MOCK_DATA = Boolean(isDevMode && isMockForced);

// In-memory cache for historical data
let historicalDataCache: SensorData[] | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache (synced with hardware cycle)
let inFlightHistoricalRequest: Promise<SensorData[]> | null = null;
let inFlightRequestCount = 0;

/**
 * Clear historical data cache (useful for testing or forced refetch)
 */
export function clearHistoricalCache(): void {
  historicalDataCache = null;
  lastCacheUpdate = 0;
  inFlightHistoricalRequest = null;
  inFlightRequestCount = 0;
}

/**
 * Fetch request with timeout
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain',
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

export function isValidSensorData(data: unknown): data is SensorData {
  const result = SensorDataSchema.safeParse(data);
  if (!result.success) {
    console.warn('[Validation Failed]', result.error);
  }
  return result.success;
}

/**
 * Normalizes a raw array of columns from Google Apps Script into a canonical SensorData object
 */
export function normalizeRawRow(row: unknown[], idx: number = 0): SensorData {
  return {
    id: `node-${idx + 1}`,
    name: 'Node A',
    location: 'Main Campus',
    latitude: parseSensorNumber(row[COLS.latitude]),
    longitude: parseSensorNumber(row[COLS.longitude]),
    temperature: parseSensorNumber(row[COLS.temperature]), // DHTtemp_C (switched from damaged BMP row[2])
    dht_temperature: parseSensorNumber(row[COLS.temperature]),
    bmp_temperature: parseSensorNumber(row[COLS.bmp_temperature]),
    pressure: parseSensorNumber(row[COLS.pressure]),
    humidity: parseSensorNumber(row[COLS.humidity]),
    aqi25val: parseSensorNumber(row[COLS.aqi25]),
    aqi10val: parseSensorNumber(row[COLS.aqi10]),
    uvIndex: parseSensorNumber(row[COLS.uvIndex]),
    uvRisk: row[COLS.uvRisk]?.toString().trim() || getUVRisk(parseSensorNumber(row[COLS.uvIndex]) ?? 0),
    rain: row[COLS.rain]?.toString().trim() === 'Yes' ? 'Yes' : 'No',
    mq_co: parseSensorNumber(row[COLS.mq_co]),
    lastUpdated: row[COLS.datetime]?.toString().trim() || new Date().toISOString(),
  };
}

/**
 * Normalizes raw payload (either array of arrays or array of objects) into SensorData[]
 */
export function normalizeSensorPayload(data: unknown): SensorData[] {
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];

  // Case 1: Array of arrays (raw Google Apps Script / CSV format)
  if (Array.isArray(data[0])) {
    return (data as unknown[][])
      .map((row, idx) => (Array.isArray(row) && row.length >= 14 ? normalizeRawRow(row, idx) : null))
      .filter((item): item is SensorData => item !== null && isValidSensorData(item));
  }

  // Case 2: Array of objects (already parsed by backend server)
  return (data as unknown[]).filter((item): item is SensorData => isValidSensorData(item));
}

/**
 * Fetch most recent N rows of sensor data
 * Uses Apps Script "readrangeN" endpoint (e.g., readrange1 for latest row)
 * Tries local /api proxy first, with automatic direct Google Apps Script fallback
 */
export async function fetchRecentSensorData(count: number): Promise<SensorData[]> {
  const validCount = Math.max(1, Math.floor(count));

  // If mock mode is explicitly forced via VITE_USE_MOCK_DATA
  if (USE_MOCK_DATA) {
    const mockList = generateMockSensorData().slice(0, validCount);
    const latest = mockList[mockList.length - 1];
    console.warn(
      `[SENSOR DATA TRACE]\n` +
      `  • Source:              Mock Generator\n` +
      `  • Record Timestamp:    ${latest?.lastUpdated ?? 'N/A'}\n` +
      `  • Temperature:         ${latest?.temperature ?? 'N/A'} °C\n` +
      `  • Humidity:            ${latest?.humidity ?? 'N/A'} %\n` +
      `  • PM2.5:               ${latest?.aqi25val ?? 'N/A'}\n` +
      `  • PM10:                ${latest?.aqi10val ?? 'N/A'}\n` +
      `  • Mock Mode Enabled:   YES (VITE_USE_MOCK_DATA=true)\n` +
      `  • Fallback Activated:  NO`
    );
    return mockList;
  }

  let rawData: unknown = null;
  let fetchError: Error | null = null;
  let detectedSource: 'Express Server (/api/sensor-data)' | 'Netlify Function' | 'Direct Google Apps Script' = 'Direct Google Apps Script';
  let fallbackActivated = false;

  // Strategy 1: Try proxy endpoint (/api)
  try {
    const response = await fetchWithTimeout(
      `${API_URL}?sts=readrange${validCount}`,
      { method: 'GET' },
      15000
    );
    if (response.ok) {
      const text = await response.text();
      // Ensure response is JSON and not an HTML error/SPA fallback
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        rawData = JSON.parse(text);
        const backendHeader = response.headers.get('X-Powered-By-Backend');
        if (backendHeader === 'express-local') {
          detectedSource = 'Express Server (/api/sensor-data)';
        } else if (backendHeader === 'netlify-function') {
          detectedSource = 'Netlify Function';
        } else {
          detectedSource = 'Express Server (/api/sensor-data)';
        }
        fallbackActivated = false;
      }
    }
  } catch (err) {
    fetchError = err instanceof Error ? err : new Error(String(err));
    console.warn('[fetchRecentSensorData] Primary proxy endpoint failed, attempting direct Google Apps Script fallback:', fetchError.message);
  }

  // Strategy 2: If proxy returned no valid JSON or failed, fetch directly from GOOGLE_SCRIPT_URL
  if (!rawData && GOOGLE_SCRIPT_URL) {
    try {
      console.log('[fetchRecentSensorData] Fallback activated: fetching directly from Google Apps Script...');
      const directResponse = await fetchWithTimeout(
        `${GOOGLE_SCRIPT_URL}?sts=readrange${validCount}`,
        { method: 'GET' },
        25000
      );
      if (directResponse.ok) {
        const text = await directResponse.text();
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
          rawData = JSON.parse(text);
          detectedSource = 'Direct Google Apps Script';
          fallbackActivated = true;
        }
      }
    } catch (directErr) {
      console.error('[fetchRecentSensorData] Direct fetch also failed:', directErr);
      fetchError = directErr instanceof Error ? directErr : new Error(String(directErr));
    }
  }

  if (rawData) {
    const validData = normalizeSensorPayload(rawData);
    if (validData.length > 0) {
      const latest = validData[validData.length - 1];
      console.log(
        `%c[SENSOR DATA TRACE]\n` +
        `  • Source:              ${detectedSource}\n` +
        `  • Record Timestamp:    ${latest.lastUpdated ?? 'N/A'}\n` +
        `  • Temperature (DHT):   ${latest.temperature ?? 'N/A'} °C\n` +
        `  • Humidity (DHT):      ${latest.humidity ?? 'N/A'} %\n` +
        `  • PM2.5 (aqi25val):    ${latest.aqi25val ?? 'N/A'}\n` +
        `  • PM10 (aqi10val):     ${latest.aqi10val ?? 'N/A'}\n` +
        `  • Mock Mode Enabled:   ${USE_MOCK_DATA ? 'YES' : 'NO'}\n` +
        `  • Fallback Activated:  ${fallbackActivated ? 'YES (Direct Apps Script Fallback)' : 'NO (Primary API succeeded)'}`,
        'color: #0284c7; font-weight: bold;'
      );
      return validData;
    }
  }

  // Never silently substitute mock data when the user requires genuine sensor data
  throw new Error(`Failed to fetch recent sensor data: ${fetchError?.message || 'Empty or invalid response from sensors'}`);
}

/**
 * Fetch only the latest sensor reading
 * @returns {Promise<SensorData | null>} - Latest sensor data or null if none available
 */
export async function fetchLatestSensorData(): Promise<SensorData | null> {
  const data = await fetchRecentSensorData(1);
  return data.length > 0 ? data[data.length - 1] : null;
}

/**
 * Fetch historical sensor data with optimized single-query retrieval,
 * in-flight request deduplication, chronological sorting, and tiered memory caching.
 *
 * @param count - Target number of rows to retrieve (default: 30000, covers full sheet history).
 * @param onProgress - Optional callback for tracking progress.
 * @param forceRefresh - If true, bypasses the memory cache.
 * @param signal - Optional AbortSignal to cancel obsolete requests.
 */
export async function fetchHistoricalData(
  count: number = 30000,
  onProgress?: (loaded: number) => void,
  forceRefresh: boolean = false,
  signal?: AbortSignal
): Promise<SensorData[]> {
  const targetCount = Math.max(100, Math.floor(count));

  // 1. Check cache: return if cache is fresh and satisfies requested count
  const now = Date.now();
  if (
    !forceRefresh &&
    historicalDataCache &&
    historicalDataCache.length >= targetCount &&
    now - lastCacheUpdate < CACHE_TTL
  ) {
    if (onProgress) onProgress(historicalDataCache.length);
    return historicalDataCache;
  }

  // 2. Return in-flight request if one is already running with sufficient coverage
  if (inFlightHistoricalRequest && inFlightRequestCount >= targetCount && !forceRefresh) {
    return inFlightHistoricalRequest;
  }

  // 3. Mock data check (only when explicitly enabled)
  if (USE_MOCK_DATA) {
    const mock = generateHistoricalMockData(Math.min(90, Math.ceil(targetCount / 96)));
    historicalDataCache = mock;
    lastCacheUpdate = Date.now();
    return mock;
  }

  // Set timeout based on query size (allow up to 35s for large datasets)
  const reqTimeout = targetCount > 5000 ? 35000 : 25000;

  inFlightRequestCount = targetCount;
  inFlightHistoricalRequest = (async () => {
    try {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      let rawData: unknown = null;
      let source = 'Primary API';

      // Strategy 1: Try proxy endpoint
      try {
        const response = await fetchWithTimeout(
          `${API_URL}?sts=readrange${targetCount}`,
          { method: 'GET', signal },
          reqTimeout
        );
        if (response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('[')) {
            rawData = JSON.parse(text);
            const backendHdr = response.headers.get('X-Powered-By-Backend');
            source = backendHdr === 'netlify-function' ? 'Netlify Function' : 'Express Server';
          }
        }
      } catch (proxyErr) {
        if (signal?.aborted) throw proxyErr;
        console.warn('[fetchHistoricalData] Proxy failed, falling back to direct Google Apps Script:', proxyErr);
      }

      // Strategy 2: Direct Google Apps Script fallback
      if (!rawData && GOOGLE_SCRIPT_URL) {
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }
        const directResp = await fetchWithTimeout(
          `${GOOGLE_SCRIPT_URL}?sts=readrange${targetCount}`,
          { method: 'GET', signal },
          reqTimeout
        );
        if (directResp.ok) {
          const text = await directResp.text();
          if (text.trim().startsWith('[')) {
            rawData = JSON.parse(text);
            source = 'Direct Google Apps Script (Fallback)';
          }
        }
      }

      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('No historical sensor data received from Google Sheets');
      }

      const valid = normalizeSensorPayload(rawData);
      if (valid.length === 0) {
        throw new Error('Historical data was received but contained no valid sensor records');
      }

      // Chronological sort: earliest to newest
      valid.sort((a, b) => {
        const tA = new Date(String(a.lastUpdated).replace('_', 'T')).getTime() || 0;
        const tB = new Date(String(b.lastUpdated).replace('_', 'T')).getTime() || 0;
        return tA - tB;
      });

      console.log(`[fetchHistoricalData] Successfully loaded ${valid.length} genuine records via ${source}`);
      if (onProgress) onProgress(valid.length);

      // Cache result if larger than existing cache
      if (!historicalDataCache || valid.length >= historicalDataCache.length) {
        historicalDataCache = valid;
        lastCacheUpdate = Date.now();
      }
      return valid;
    } finally {
      inFlightHistoricalRequest = null;
      inFlightRequestCount = 0;
    }
  })();

  return inFlightHistoricalRequest;
}

/**
 * Fetch ALL historical sensor data.
 * Retrieves all available historical records (default 30,000 rows to cover entire sheet).
 */
export async function fetchAllHistoricalData(
  onProgress?: (loaded: number) => void
): Promise<SensorData[]> {
  return fetchHistoricalData(30000, onProgress);
}

/**
 * Fetch all sensor data
 */
export async function fetchSensorData(): Promise<SensorData[]> {
  if (USE_MOCK_DATA) {
    console.log('[fetchSensorData] Using mock data for development');
    return generateHistoricalMockData(192);
  }
  return fetchHistoricalData(30000);
}
