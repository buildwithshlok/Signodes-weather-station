/**
 * Shared constants for the NIET Weather Station project.
 * Single source of truth for thresholds, intervals, and configuration values.
 */

/** Time (ms) after which a node is considered offline if no update received. */
export const OFFLINE_THRESHOLD_MS = 35 * 60 * 1000; // 35 minutes

/** Polling interval (ms) for fetching latest sensor data — matches hardware upload cycle. */
export const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/** In-memory cache time-to-live (ms) for historical data. */
export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Default request timeout (ms) for API calls. */
export const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds
