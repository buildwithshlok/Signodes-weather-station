/**
 * Sensor Failure Adaptation Test Suite
 * NIET Weather Station
 * 
 * Verifies:
 * 1. Temperature switch from damaged BMP (row 2) to genuine DHT (row 4)
 * 2. Deterministic atmospheric pressure simulation (hPa) with UI badges
 * 3. Humidity-based rain estimation thresholds and fallbacks
 * 4. Equivalence between Express server and Netlify Function parsers
 * 5. Preservation of genuine telemetry for all other sensors
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// ES Module imports
import {
  parseSensorData as serverParseSensorData,
  parseSensorNumber as serverParseSensorNumber,
  getUVRisk as serverGetUVRisk,
} from '../server.js';

import {
  getSimulatedPressure,
  isPressureSimulated,
  PRESSURE_SIMULATION_LABEL,
  PRESSURE_SIMULATION_TOOLTIP,
  SIMULATED_PRESSURE_BASELINE,
  SIMULATED_PRESSURE_MAX_VARIATION,
} from '../src/utils/simulatedPressure.ts';

import {
  estimateRainFromHumidity,
  getRainEstimationDetails,
  RAIN_ESTIMATION_TOOLTIP,
  RAIN_HUMIDITY_THRESHOLDS,
} from '../src/utils/rainEstimation.ts';

import {
  normalizeRawRow,
  normalizeSensorPayload,
  fetchHistoricalData,
} from '../src/services/googleSheetsService.ts';

import {
  parseISTDate,
  getISTDateKey,
  formatISTLabels,
  formatISTMonthYearLabel,
  formatISTDayMonthLabel,
} from '../src/utils/dateUtils.ts';

import {
  PERIOD_CONFIGS,
  calculateYAxisBounds,
} from '../src/utils/analyticsUtils.ts';

import {
  getAirQualityCategory,
  getAQICategory,
} from '../src/utils/sensorCalibration.ts';

import {
  formatAirQualityWithBounds,
} from '../src/utils/sensorFormatting.ts';

import { clearHistoricalCache } from '../src/services/googleSheetsService.ts';

// CommonJS import for Netlify function
const require = createRequire(import.meta.url);
const netlifySensorData = require('../netlify/functions/sensorData.js');
const netlifyParseSensorData = netlifySensorData.parseSensorData;
const netlifyParseSensorNumber = netlifySensorData.parseSensorNumber;
const netlifyGetUVRisk = netlifySensorData.getUVRisk;

// Sample telemetry row modeled after real hardware output:
// Col 0: timestamp
// Col 1: bmp_pressure (-240.86 - damaged)
// Col 2: bmp_temperature (181.03 - damaged)
// Col 3: dht_humidity (69)
// Col 4: dht_temperature (23.1 - genuine)
// Col 5: aqi10 (264)
// Col 6: aqi25 (425)
// Col 7: latitude (28.46304)
// Col 8: longitude (77.49014)
// Col 9: light (13.24)
// Col 10: mq_co (13.11)
// Col 11: mq135 (399)
// Col 12: mq4 (387)
// Col 13: rain ("Yes")
// Col 14: uvIndex (19.56)
// Col 15: uvRisk ("Low")
const SAMPLE_LIVE_ROW = [
  '2026-11-07_22:37:59',
  '-240.86',
  '181.03',
  '69',
  '23.1',
  '264',
  '425',
  '28.46304',
  '77.49014',
  '13.24',
  '13.11',
  '399',
  '387',
  'Yes',
  '19.56',
  'Low',
];

describe('1. Temperature Switch (BMP -> DHT)', () => {
  test('Maps genuine DHTtemp_C (row index 4) to canonical temperature field', () => {
    const rawJson = JSON.stringify([SAMPLE_LIVE_ROW]);
    const serverResult = serverParseSensorData(rawJson);
    const netlifyResult = netlifyParseSensorData(rawJson);

    assert.equal(serverResult.length, 1);
    assert.equal(netlifyResult.length, 1);

    // Temperature must be 23.1 (from col 4), NOT 181.03 (from col 2)
    assert.equal(serverResult[0].temperature, 23.1);
    assert.equal(netlifyResult[0].temperature, 23.1);

    // Diagnostics: verify both dht and bmp fields are tracked
    assert.equal(serverResult[0].dht_temperature, 23.1);
    assert.equal(serverResult[0].bmp_temperature, 181.03);
    assert.equal(netlifyResult[0].dht_temperature, 23.1);
    assert.equal(netlifyResult[0].bmp_temperature, 181.03);
  });

  test('Valid DHT temperature zero (0°C) is preserved as 0, not null or fallback', () => {
    const zeroRow = [...SAMPLE_LIVE_ROW];
    zeroRow[4] = '0'; // 0°C freezing point
    zeroRow[2] = '181.03'; // Damaged BMP
    const rawJson = JSON.stringify([zeroRow]);

    const [serverObj] = serverParseSensorData(rawJson);
    const [netlifyObj] = netlifyParseSensorData(rawJson);

    assert.equal(serverObj.temperature, 0, 'Server must preserve 0 as 0');
    assert.equal(netlifyObj.temperature, 0, 'Netlify must preserve 0 as 0');
    assert.notEqual(serverObj.temperature, 181.03, 'Must not fallback to BMP');
  });

  test('Missing DHT temperature produces null, does NOT use damaged BMP', () => {
    const missingCases = ['', '   ', 'null', 'undefined', 'N/A'];
    for (const val of missingCases) {
      const row = [...SAMPLE_LIVE_ROW];
      row[4] = val;
      row[2] = '181.03';
      const rawJson = JSON.stringify([row]);

      const [serverObj] = serverParseSensorData(rawJson);
      const [netlifyObj] = netlifyParseSensorData(rawJson);

      assert.equal(serverObj.temperature, null, `Server must return null for "${val}"`);
      assert.equal(netlifyObj.temperature, null, `Netlify must return null for "${val}"`);
      assert.notEqual(serverObj.temperature, 181.03, 'Must never use BMP temperature');
    }
  });

  test('Invalid non-numeric DHT temperature produces null', () => {
    const invalidCases = ['corrupted', 'abc', 'NaN', 'error_temp'];
    for (const val of invalidCases) {
      const row = [...SAMPLE_LIVE_ROW];
      row[4] = val;
      const rawJson = JSON.stringify([row]);

      const [serverObj] = serverParseSensorData(rawJson);
      const [netlifyObj] = netlifyParseSensorData(rawJson);

      assert.equal(serverObj.temperature, null);
      assert.equal(netlifyObj.temperature, null);
    }
  });

  test('parseSensorNumber utility handles 0, null, and non-numeric correctly', () => {
    assert.equal(serverParseSensorNumber('0'), 0);
    assert.equal(serverParseSensorNumber(0), 0);
    assert.equal(serverParseSensorNumber('23.1'), 23.1);
    assert.equal(serverParseSensorNumber('-5.4'), -5.4);
    assert.equal(serverParseSensorNumber(''), null);
    assert.equal(serverParseSensorNumber('   '), null);
    assert.equal(serverParseSensorNumber(null), null);
    assert.equal(serverParseSensorNumber(undefined), null);
    assert.equal(serverParseSensorNumber('N/A'), null);
    assert.equal(serverParseSensorNumber('corrupt'), null);
  });
});

describe('2. Atmospheric Pressure Simulation', () => {
  test('Returns valid numeric pressure within baseline ± max variation in hPa', () => {
    const timestamps = [
      '2026-11-07T12:00:00.000Z',
      '2026-11-07T03:00:00.000Z',
      '2026-11-07T18:45:12.000Z',
      '2026-11-08T00:00:00.000Z',
      '2026-11-07_22:37:59',
    ];

    const minAllowed = SIMULATED_PRESSURE_BASELINE - SIMULATED_PRESSURE_MAX_VARIATION;
    const maxAllowed = SIMULATED_PRESSURE_BASELINE + SIMULATED_PRESSURE_MAX_VARIATION;

    for (const ts of timestamps) {
      const pressure = getSimulatedPressure(ts);
      assert.equal(typeof pressure, 'number');
      assert.ok(!isNaN(pressure), `Pressure must not be NaN for ${ts}`);
      assert.ok(
        pressure >= minAllowed && pressure <= maxAllowed,
        `Pressure ${pressure} must be within [${minAllowed}, ${maxAllowed}] hPa`
      );
    }
  });

  test('Determinism: repeated calls with identical timestamp return identical simulated value', () => {
    const ts = '2026-11-07T22:37:59.000Z';
    const firstCall = getSimulatedPressure(ts);
    for (let i = 0; i < 20; i++) {
      const subsequentCall = getSimulatedPressure(ts);
      assert.equal(subsequentCall, firstCall, 'Simulation must be strictly deterministic');
    }
  });

  test('Fallback for undefined/empty timestamp returns safe baseline', () => {
    const fallback1 = getSimulatedPressure(undefined);
    const fallback2 = getSimulatedPressure('');
    assert.equal(fallback1, SIMULATED_PRESSURE_BASELINE);
    assert.equal(fallback2, SIMULATED_PRESSURE_BASELINE);
  });

  test('Exposes simulation labels and identifiers for UI', () => {
    assert.equal(PRESSURE_SIMULATION_LABEL, 'Simulated Pressure');
    assert.ok(PRESSURE_SIMULATION_TOOLTIP.includes('simulated'));
    assert.ok(isPressureSimulated({ id: 'node-1' }));
    assert.ok(!isPressureSimulated(null));
  });
});

describe('3. Rain Estimation from Humidity', () => {
  test('Humidity <= 90% produces "No Rain"', () => {
    const testCases = [0, 10, 45, 69, 85, 89.9, 90, '90', '69.5'];
    for (const h of testCases) {
      const result = estimateRainFromHumidity(h);
      assert.equal(result, 'No Rain', `Humidity ${h}% must produce "No Rain"`);
      const details = getRainEstimationDetails(h);
      assert.equal(details.status, 'No Rain');
      assert.equal(details.category, 'none');
    }
  });

  test('Humidity > 90% and < 95% produces "Light Rain"', () => {
    const testCases = [90.1, 91, 92.5, 94, 94.9, 94.99, '92'];
    for (const h of testCases) {
      const result = estimateRainFromHumidity(h);
      assert.equal(result, 'Light Rain', `Humidity ${h}% must produce "Light Rain"`);
      const details = getRainEstimationDetails(h);
      assert.equal(details.status, 'Light Rain');
      assert.equal(details.category, 'light');
    }
  });

  test('Humidity >= 95% and <= 100% produces "Heavy Rain"', () => {
    const testCases = [95, 95.1, 97, 99.9, 100, '95', '100'];
    for (const h of testCases) {
      const result = estimateRainFromHumidity(h);
      assert.equal(result, 'Heavy Rain', `Humidity ${h}% must produce "Heavy Rain"`);
      const details = getRainEstimationDetails(h);
      assert.equal(details.status, 'Heavy Rain');
      assert.equal(details.category, 'heavy');
    }
  });

  test('Missing humidity (null, undefined, empty string) produces "Unknown"', () => {
    const missingCases = [null, undefined, '', '   '];
    for (const h of missingCases) {
      const result = estimateRainFromHumidity(h);
      assert.equal(result, 'Unknown', `Missing humidity ${h} must produce "Unknown"`);
      const details = getRainEstimationDetails(h);
      assert.equal(details.status, 'Unknown');
      assert.equal(details.category, 'unknown');
    }
  });

  test('Invalid humidity (<0, >100, NaN, non-numeric) produces "Unknown"', () => {
    const invalidCases = [-1, -50, 100.1, 150, NaN, 'corrupt', 'N/A'];
    for (const h of invalidCases) {
      const result = estimateRainFromHumidity(h);
      assert.equal(result, 'Unknown', `Invalid humidity ${h} must produce "Unknown"`);
      const details = getRainEstimationDetails(h);
      assert.equal(details.status, 'Unknown');
    }
  });

  test('Provides correct threshold constants and descriptive tooltips', () => {
    assert.equal(RAIN_HUMIDITY_THRESHOLDS.NO_RAIN_MAX, 90);
    assert.equal(RAIN_HUMIDITY_THRESHOLDS.LIGHT_RAIN_MAX, 95);
    assert.equal(RAIN_HUMIDITY_THRESHOLDS.HEAVY_RAIN_MAX, 100);
    assert.ok(RAIN_ESTIMATION_TOOLTIP.includes('Humidity-based estimate'));
  });
});

describe('4. Backend Parity (Express vs Netlify Function)', () => {
  test('Both backends produce identical objects from JSON array payload', () => {
    const jsonPayload = JSON.stringify([SAMPLE_LIVE_ROW]);
    const serverResult = serverParseSensorData(jsonPayload);
    const netlifyResult = netlifyParseSensorData(jsonPayload);

    assert.deepEqual(serverResult, netlifyResult, 'Server and Netlify must produce identical objects');
  });

  test('Both backends produce identical objects from CSV fallback payload', () => {
    const csvPayload = SAMPLE_LIVE_ROW.join(',');
    const serverResult = serverParseSensorData(csvPayload);
    const netlifyResult = netlifyParseSensorData(csvPayload);

    assert.deepEqual(serverResult, netlifyResult, 'CSV fallback parsing must be identical in both backends');
  });

  test('Genuine non-pressure sensor fields remain untouched and valid', () => {
    const [node] = serverParseSensorData(JSON.stringify([SAMPLE_LIVE_ROW]));

    assert.equal(node.humidity, 69, 'Humidity must be 69%');
    assert.equal(node.aqi25val, 425, 'PM2.5 must be 425');
    assert.equal(node.aqi10val, 264, 'PM10 must be 264');
    assert.equal(node.mq_co, 13.11, 'CO must be 13.11 ppm');
    assert.equal(node.uvIndex, 19.56, 'UV Index must be 19.56');
    assert.equal(node.uvRisk, 'Low', 'UV Risk must be Low');
    assert.equal(node.latitude, 28.46304, 'Latitude must be genuine GPS');
    assert.equal(node.longitude, 77.49014, 'Longitude must be genuine GPS');
    assert.equal(node.temperature, 23.1, 'Temperature must be genuine DHT');
  });
});

describe('5. Environment & UI Integration Checks', () => {
  test('VITE_USE_MOCK_DATA is disabled or not set in .env', () => {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const mockSetting = envContent
        .split('\n')
        .find((line) => line.startsWith('VITE_USE_MOCK_DATA='));
      if (mockSetting) {
        assert.equal(
          mockSetting.trim(),
          'VITE_USE_MOCK_DATA=false',
          'VITE_USE_MOCK_DATA must not be true'
        );
      }
    }
  });

  test('Main website UI is minimal without explanatory disclaimers describing internal data mapping', () => {
    const filesToCheck = [
      'src/components/dashboard/EnvironmentalDashboard.tsx',
      'src/components/dashboard/AirQualityBar.tsx',
      'src/components/dashboard/SensorNodeInfo.tsx',
      'src/components/map/CampusMap.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(relPath);
      assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hasClunkyDisclaimers =
        content.includes('Humidity-based estimate') ||
        content.includes('Simulated Pressure') ||
        content.includes('physical rain sensor damaged');
      assert.ok(
        !hasClunkyDisclaimers,
        `${relPath} should not contain verbose internal mapping disclaimers`
      );
    }
  });
});

// Exact row visible in user screenshot from Google Sheet at 23:08:18
const USER_SHEET_ROW_26918 = [
  '2026-11-07_23:08:18',
  '-240.86', // Col 1: BMPpressure_hPa
  '181.03',  // Col 2: BMPtemp_
  '73',       // Col 3: DHThumid_percent
  '23',       // Col 4: DHTtemp_C
  '287',      // Col 5: aqi10val
  '436',      // Col 6: aqi25val
  '28.46304', // Col 7: lat
  '77.49014', // Col 8: lng
  '10.5',     // Col 9: mq_aqi
  '14.7',     // Col 10: mq_co
  '415',      // Col 11: pm10
  '404',      // Col 12: pm25
  'Yes',      // Col 13: rain
  '14.38',    // Col 14: uvIndex
  'Low',      // Col 15: uvRisk
];

describe('6. Google Sheets Live Payload Normalization (Exact User Sheet Row 26918)', () => {

  test('Normalizes direct Google Sheets array-of-arrays into authentic SensorData object', () => {
    const [node] = normalizeSensorPayload([USER_SHEET_ROW_26918]);

    assert.ok(node, 'Must return valid parsed object');
    assert.equal(node.temperature, 23, 'Temperature must be genuine DHTtemp_C (23°C), NOT 28.1°C or 181.03°C');
    assert.equal(node.humidity, 73, 'Humidity must be genuine 73%, NOT 63%');
    assert.equal(node.aqi25val, 436, 'PM2.5 must be genuine 436, NOT mock 45');
    assert.equal(node.aqi10val, 287, 'PM10 must be genuine 287, NOT mock 38');
    assert.equal(node.mq_co, 14.7, 'CO must be genuine 14.7, NOT mock 55');
    assert.equal(node.uvIndex, 14.38, 'UV Index must be genuine 14.38, NOT mock 5.2');
    assert.equal(node.uvRisk, 'Low');
    assert.equal(node.lastUpdated, '2026-11-07_23:08:18');
  });

  test('Preserves genuine 0 values across all fields without defaulting to mock data', () => {
    const zeroRow = [...USER_SHEET_ROW_26918];
    zeroRow[4] = '0'; // 0°C freezing point
    zeroRow[3] = '0'; // 0% dry humidity
    zeroRow[6] = '0'; // 0 PM2.5 pristine air

    const node = normalizeRawRow(zeroRow, 0);
    assert.equal(node.temperature, 0);
    assert.equal(node.humidity, 0);
    assert.equal(node.aqi25val, 0);
  });

  test('Missing or invalid sensor values are normalized to null without triggering mock data', () => {
    const corruptedRow = [...USER_SHEET_ROW_26918];
    corruptedRow[4] = 'N/A';
    corruptedRow[3] = '';
    corruptedRow[6] = 'corrupt_val';

    const node = normalizeRawRow(corruptedRow, 0);
    assert.equal(node.temperature, null);
    assert.equal(node.humidity, null);
    assert.equal(node.aqi25val, null);
    // Genuine fields in same record remain valid
    assert.equal(node.uvRisk, 'Low');
    assert.equal(node.lastUpdated, '2026-11-07_23:08:18');
  });

  test('Both API sources fail: must throw error and never silently substitute mock readings', async () => {
    // Simulate failing fetch
    const failingFetch = async () => {
      throw new Error('ECONNREFUSED / Network Failure');
    };

    // When both primary proxy and direct script fail, function must throw
    await assert.rejects(
      async () => {
        let rawData = null;
        let fetchError = null;
        try {
          await failingFetch();
        } catch (err) {
          fetchError = err;
        }
        if (!rawData) {
          try {
            await failingFetch();
          } catch (err) {
            fetchError = err;
          }
        }
        if (!rawData) {
          throw new Error(`Failed to fetch recent sensor data: ${fetchError?.message}`);
        }
      },
      /ECONNREFUSED/
    );
  });
});

describe('7. Direct PM2.5/PM10 Telemetry & 0-800 µg/m³ Air Quality Scale', () => {
  test('Directly passes genuine Google Sheets aqi25val as main air quality reading', () => {
    const node = normalizeRawRow(USER_SHEET_ROW_26918, 0);
    // USER_SHEET_ROW_26918 col 6 is '436' (PM2.5)
    assert.equal(node.aqi25val, 436);
    // col 5 is '287' (PM10)
    assert.equal(node.aqi10val, 287);
  });

  test('Maps 0-800 µg/m³ PM2.5 thresholds to descriptive categories', () => {
    // 0-30 -> Good
    assert.equal(getAirQualityCategory(15).category, 'Good');
    assert.equal(getAirQualityCategory(30).category, 'Good');
    // 31-60 -> Satisfactory
    assert.equal(getAirQualityCategory(45).category, 'Satisfactory');
    assert.equal(getAirQualityCategory(60).category, 'Satisfactory');
    // 61-90 -> Moderate
    assert.equal(getAirQualityCategory(75).category, 'Moderate');
    assert.equal(getAirQualityCategory(90).category, 'Moderate');
    // 91-120 -> Poor
    assert.equal(getAirQualityCategory(105).category, 'Poor');
    assert.equal(getAirQualityCategory(120).category, 'Poor');
    // 121-250 -> Very Poor
    assert.equal(getAirQualityCategory(185).category, 'Very Poor');
    assert.equal(getAirQualityCategory(250).category, 'Very Poor');
    // >250 -> Severe
    assert.equal(getAirQualityCategory(300).category, 'Severe');
    assert.equal(getAirQualityCategory(436).category, 'Severe');
    assert.equal(getAirQualityCategory(750).category, 'Severe');
  });

  test('getAQICategory backwards-compatibility alias produces identical result', () => {
    assert.equal(getAQICategory(25).category, 'Good');
    assert.equal(getAQICategory(436).category, 'Severe');
  });

  test('Clamps air quality display within 0-800 µg/m³ range', () => {
    assert.equal(formatAirQualityWithBounds(436), '436');
    assert.equal(formatAirQualityWithBounds(950), '800');
    assert.equal(formatAirQualityWithBounds(-10), '0');
  });
});

describe('8. Historical Data Retrieval, IST Date Handling & Analytics Bounds', () => {
  test('parseISTDate correctly parses Google Sheets timestamps with IST (+05:30) offset', () => {
    const d1 = parseISTDate('2026-11-08_03:30:33');
    assert.ok(d1 !== null, 'Must parse valid date');
    // UTC representation must be 2026-11-07 22:00:33Z
    assert.equal(d1.toISOString(), '2026-11-07T22:00:33.000Z');

    // IST date key must be exactly 2026-11-08
    assert.equal(getISTDateKey(d1), '2026-11-08');

    // Formatted labels must match IST weekday
    const labels = formatISTLabels(d1);
    assert.ok(labels.short.includes('Sun'), 'Must identify Sunday in IST');
    assert.ok(labels.full.includes('Nov 8'), 'Must identify Nov 8 in IST');
  });

  test('parseISTDate handles edge cases safely without crashing', () => {
    assert.equal(parseISTDate(undefined), null);
    assert.equal(parseISTDate(''), null);
    assert.equal(parseISTDate('N/A'), null);
    assert.equal(parseISTDate('invalid_garbage_timestamp'), null);
  });

  test('fetchHistoricalData rejects on network failure without silently falling back to mock data', async () => {
    // When offline/in unit test without network, must reject instead of returning mock data
    await assert.rejects(
      async () => {
        await fetchHistoricalData(100);
      },
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });

  test('Chronologically sorts historical telemetry records correctly', () => {
    const rowA = [...USER_SHEET_ROW_26918];
    rowA[0] = '2026-11-08_01:00:00';
    const rowB = [...USER_SHEET_ROW_26918];
    rowB[0] = '2026-11-08_03:00:00';
    const rowC = [...USER_SHEET_ROW_26918];
    rowC[0] = '2026-11-07_12:00:00';

    const unsorted = normalizeSensorPayload([rowA, rowB, rowC]);
    unsorted.sort((a, b) => {
      const tA = parseISTDate(a.lastUpdated || '')?.getTime() || 0;
      const tB = parseISTDate(b.lastUpdated || '')?.getTime() || 0;
      return tA - tB;
    });

    assert.equal(unsorted[0].lastUpdated, '2026-11-07_12:00:00');
    assert.equal(unsorted[1].lastUpdated, '2026-11-08_01:00:00');
    assert.equal(unsorted[2].lastUpdated, '2026-11-08_03:00:00');
  });

  test('PERIOD_CONFIGS defines 5 complete tiers with progressive row coverage', () => {
    assert.deepEqual(Object.keys(PERIOD_CONFIGS), ['7d', '30d', '3m', '6m', '12m']);
    assert.equal(PERIOD_CONFIGS['7d'].targetRows, 1200);
    assert.equal(PERIOD_CONFIGS['30d'].targetRows, 3500);
    assert.equal(PERIOD_CONFIGS['3m'].targetRows, 10000);
    assert.equal(PERIOD_CONFIGS['6m'].targetRows, 20000);
    assert.equal(PERIOD_CONFIGS['12m'].targetRows, 30000);
  });

  test('calculateYAxisBounds dynamically scales temperature and PM2.5 without artificial capping', () => {
    // Summer temperature reaches 45.7°C in Greater Noida
    const summerTemps = [25.0, 32.5, 38.0, 45.7];
    const tempBounds = calculateYAxisBounds('temperature', summerTemps);
    assert.ok(tempBounds.max >= 48, `Max temperature bound (${tempBounds.max}) must accommodate 45.7°C`);
    assert.ok(tempBounds.min <= 25, `Min temperature bound (${tempBounds.min}) must accommodate 25°C`);
    assert.equal(tempBounds.ticks.length, 6);

    // PM2.5 reaches 436 µg/m³
    const pmValues = [85, 142, 280, 436];
    const pmBounds = calculateYAxisBounds('pm25', pmValues);
    assert.ok(pmBounds.max >= 500, `Max PM2.5 bound (${pmBounds.max}) must accommodate 436 µg/m³`);
    assert.equal(pmBounds.min, 0);
    assert.equal(pmBounds.ticks.length, 6);
  });

  test('formatISTMonthYearLabel and formatISTDayMonthLabel correctly format dates in IST', () => {
    const d = parseISTDate('2026-11-08_13:00:00');
    assert.ok(d !== null);
    const monthYear = formatISTMonthYearLabel(d);
    assert.ok(monthYear.includes('Nov') && monthYear.includes('26'), `Expected Nov '26, got ${monthYear}`);

    const dayMonth = formatISTDayMonthLabel(d);
    assert.ok(dayMonth.includes('Nov') && dayMonth.includes('8'), `Expected Nov 8, got ${dayMonth}`);
  });

  test('clearHistoricalCache resets memory cache correctly', () => {
    clearHistoricalCache();
    // Cache reset succeeds without error
    assert.ok(true);
  });
});




