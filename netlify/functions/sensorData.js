const axios = require('axios');

// Import API configuration
const { SCRIPT_ID, getUVRisk } = require('../../src/config/api.cjs');

// Validate environment configuration
if (!process.env.GOOGLE_SCRIPT_URL && !process.env.VITE_GOOGLE_SCRIPT_URL && !SCRIPT_ID) {
  console.error('CRITICAL: GOOGLE_SCRIPT_URL or GOOGLE_SCRIPT_ID not configured');
}

// Google Apps Script URL - priority: process.env.GOOGLE_SCRIPT_URL > process.env.VITE_GOOGLE_SCRIPT_URL > SCRIPT_ID fallback
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 
  process.env.VITE_GOOGLE_SCRIPT_URL || 
  (SCRIPT_ID ? `https://script.google.com/macros/s/${SCRIPT_ID}/exec` : '');

// Get allowed origins from environment (comma-separated)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

/**
 * Validate and get CORS origin header
 * @param {string} origin - Origin header from request
 * @returns {string|undefined} - Safe origin or undefined
 */
function getAllowedOrigin(origin) {
  if (!origin) return '*';
  // If ALLOWED_ORIGINS is configured, restrict to that list; otherwise allow all
  if (ALLOWED_ORIGINS.length === 0) return '*';
  return ALLOWED_ORIGINS.includes(origin) ? origin : undefined;
}

function parseSensorNumber(val) {
  if (val === undefined || val === null) return null;
  const str = val.toString().trim();
  if (str === '' || str === 'N/A' || str === 'null' || str === 'undefined') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse sensor data from JSON or CSV format
 * @param {string} textData - Raw data from Google Apps Script
 * @returns {Array<Object>} - Parsed sensor data array
 */
function parseSensorData(textData) {
  const trimmed = textData.trim();
  let sensorData = [];

  // Try JSON format first
  if (trimmed.startsWith('[')) {
    try {
      let jsonData = JSON.parse(trimmed);
      if (Array.isArray(jsonData)) {
        if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
          // Case 1: JSON is array of arrays (CSV-like), convert to objects
          sensorData = jsonData.map((row, idx) => {
            if (!Array.isArray(row) || row.length < 16) return null;
            
            return {
              id: `node-${idx + 1}`,
              name: 'Node A',
              location: 'Main Campus',
              latitude: parseSensorNumber(row[7]),
              longitude: parseSensorNumber(row[8]),
              temperature: parseSensorNumber(row[4]), // DHTtemp_C (switched from damaged BMP row[2])
              dht_temperature: parseSensorNumber(row[4]),
              bmp_temperature: parseSensorNumber(row[2]),
              pressure: parseSensorNumber(row[1]),
              humidity: parseSensorNumber(row[3]),
              aqi25val: parseSensorNumber(row[6]),
              aqi10val: parseSensorNumber(row[5]),
              uvIndex: parseSensorNumber(row[14]),
              uvRisk: row[15]?.toString().trim() || getUVRisk(parseSensorNumber(row[14]) ?? 0),
              rain: row[13]?.toString().trim() === 'Yes' ? 'Yes' : 'No',
              mq_co: parseSensorNumber(row[10]),
              lastUpdated: row[0]?.toString().trim() || new Date().toISOString(),
            };
          }).filter(item => item !== null);
        } else {
          // Case 2: JSON is already array of objects, use as-is
          sensorData = jsonData;
        }
      }
    } catch (e) {
      console.warn('JSON parsing failed, attempting CSV fallback');
      sensorData = [];
    }
  }

  // Fallback to CSV parsing (if JSON failed or wasn't JSON)
  if (sensorData.length === 0) {
    const rows = trimmed.split('\n').filter(r => r.trim() !== '');
    sensorData = rows
      .map((row, index) => {
        try {
          const columns = row.split(',');
          if (columns.length < 16) return null;
          
          return {
            id: `node-${index + 1}`,
            name: 'Node A',
            location: 'Main Campus',
            latitude: parseSensorNumber(columns[7]),
            longitude: parseSensorNumber(columns[8]),
            temperature: parseSensorNumber(columns[4]), // DHTtemp_C (switched from damaged BMP columns[2])
            dht_temperature: parseSensorNumber(columns[4]),
            bmp_temperature: parseSensorNumber(columns[2]),
            pressure: parseSensorNumber(columns[1]),
            humidity: parseSensorNumber(columns[3]),
            aqi25val: parseSensorNumber(columns[6]),
            aqi10val: parseSensorNumber(columns[5]),
            uvIndex: parseSensorNumber(columns[14]),
            uvRisk: columns[15]?.trim() || getUVRisk(parseSensorNumber(columns[14]) ?? 0),
            rain: columns[13]?.trim() === 'Yes' ? 'Yes' : 'No',
            mq_co: parseSensorNumber(columns[10]),
            lastUpdated: columns[0]?.trim() || new Date().toISOString(),
          };
        } catch (e) {
          return null;
        }
      })
      .filter(item => item !== null);
  }

  return sensorData;
}

// Main handler function
exports.handler = async (event, context) => {
  // Set response headers with CORS
  const origin = getAllowedOrigin(event.headers.origin);
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'X-Powered-By-Backend': 'netlify-function',
  };
  if (origin) {
    responseHeaders['Access-Control-Allow-Origin'] = origin;
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed', method: event.httpMethod }),
    };
  }

  try {
    // Validate API URL is configured
    if (!GOOGLE_SCRIPT_URL) {
      console.error('Missing GOOGLE_SCRIPT_URL configuration');
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({
          error: 'API not configured',
          details: 'Google Apps Script URL is not configured',
        }),
      };
    }

    // Get the 'sts' parameter from the query string
    const { sts } = event.queryStringParameters || {};

    // Build the URL with query parameters
    const params = new URLSearchParams();
    if (sts) {
      params.append('sts', sts);
    }

    const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
    
    // Fetch data from Google Apps Script
    console.log('Fetching sensor data from Google Apps Script');
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 30000, // 30 second timeout
      headers: {
        Accept: 'application/json, text/plain',
        'Cache-Control': 'no-cache',
      },
    });

    const textData = response.data;
    if (!textData) {
      throw new Error('No data received from Google Apps Script');
    }

    console.log(`Received ${textData.length} characters from datasource`);

    // Parse sensor data
    const sensorData = parseSensorData(textData);

    if (sensorData.length === 0) {
      console.warn('No valid sensor data could be parsed from response');
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify([]),
      };
    }

    console.log(`Successfully parsed ${sensorData.length} sensor records`);

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(sensorData),
    };
  } catch (error) {
    console.error('Error in sensorData handler:', error.message);

    // Don't expose sensitive error details in production
    const details = process.env.NODE_ENV === 'development' ? error.message : 'Data fetch failed';

    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: 'Failed to fetch sensor data',
        details,
      }),
    };
  }
};

exports.parseSensorData = parseSensorData;
exports.parseSensorNumber = parseSensorNumber;
exports.getUVRisk = getUVRisk;
