/**
 * Backend Server for NIET Weather Station
 * Proxy server for Google Apps Script API integration
 * 
 * This server handles:
 * - CORS-enabled requests to Google Apps Script
 * - Sensor data preprocessing
 * - Error handling and logging
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
if (fs.existsSync('.env')) {
  dotenv.config();
} else if (fs.existsSync('.env.development')) {
  dotenv.config({ path: '.env.development' });
  console.log('[server] Loaded environment from .env.development');
}

const isDirectRun = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);
const app = express();
const PORT = process.env.PORT || 3002;

// Validation: ensure GOOGLE_SCRIPT_URL is configured
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
if (!GOOGLE_SCRIPT_URL && isDirectRun) {
  console.error(
    'CRITICAL: GOOGLE_SCRIPT_URL environment variable is not set. ' +
    'Please configure it before starting the server.'
  );
  process.exit(1);
}

// Get allowed origins from environment (comma-separated for multiple origins)
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean) || [];
  return origins;
};

// Configure CORS with dynamic origin validation
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

export function parseSensorNumber(val) {
  if (val === undefined || val === null) return null;
  const str = val.toString().trim();
  if (str === '' || str === 'N/A' || str === 'null' || str === 'undefined') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function getUVRisk(uvIndex) {
  if (uvIndex <= 20) return 'Low';
  if (uvIndex <= 40) return 'Moderate';
  if (uvIndex <= 60) return 'High';
  if (uvIndex <= 80) return 'Very High';
  return 'Extreme';
}

export function parseSensorData(rawData) {
  if (!rawData) return [];
  const trimmed = rawData.toString().trim();
  let sensorData = [];

  // Try JSON format first
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && Array.isArray(parsed[0])) {
          sensorData = parsed.map((row, idx) => {
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
          }).filter(Boolean);
        } else {
          sensorData = parsed;
        }
      }
    } catch {
      sensorData = [];
    }
  }

  // Fallback to CSV parsing (only if JSON didn't work)
  if (sensorData.length === 0) {
    const rows = trimmed.split('\n').filter((row) => row.trim() !== '');
    sensorData = rows
      .map((row, idx) => {
        try {
          const cols = row.split(',');
          if (cols.length < 16) return null;

          return {
            id: `node-${idx + 1}`,
            name: 'Node A',
            location: 'Main Campus',
            latitude: parseSensorNumber(cols[7]),
            longitude: parseSensorNumber(cols[8]),
            temperature: parseSensorNumber(cols[4]), // DHTtemp_C (switched from damaged BMP cols[2])
            dht_temperature: parseSensorNumber(cols[4]),
            bmp_temperature: parseSensorNumber(cols[2]),
            pressure: parseSensorNumber(cols[1]),
            humidity: parseSensorNumber(cols[3]),
            aqi25val: parseSensorNumber(cols[6]),
            aqi10val: parseSensorNumber(cols[5]),
            uvIndex: parseSensorNumber(cols[14]),
            uvRisk: cols[15]?.trim() || getUVRisk(parseSensorNumber(cols[14]) ?? 0),
            rain: cols[13]?.trim() === 'Yes' ? 'Yes' : 'No',
            mq_co: parseSensorNumber(cols[10]),
            lastUpdated: cols[0]?.trim() || new Date().toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  return sensorData;
}

/**
 * Main sensor data API endpoint
 * Proxies requests to Google Apps Script with proper error handling
 */
app.get('/api/sensor-data', async (req, res) => {
  console.log(`[${new Date().toISOString()}] 🚀 API REQUEST RECEIVED: ${req.method} ${req.url}`);
  console.log(`[${new Date().toISOString()}] Query params:`, req.query);

  try {
    // Get query parameters
    const { sts } = req.query;

    // Log request (without exposing full URL for security)
    console.log(`[${new Date().toISOString()}] Fetching sensor data from Google Apps Script`);

    // Build request to Google Apps Script
    const params = new URLSearchParams();
    if (sts) {
      params.append('sts', String(sts));
    }

    const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
    console.log(`[${new Date().toISOString()}] Requesting URL: ${url}`);

    // Fetch data with timeout
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 30000, // 30 second timeout
      headers: {
        Accept: 'application/json, text/plain',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.data) {
      console.warn('Empty response from Google Apps Script');
      return res.json([]);
    }

    console.log(
      `[${new Date().toISOString()}] Received ${response.data.length} characters from datasource`
    );
    console.log(
      `[${new Date().toISOString()}] Response preview: ${response.data.toString().substring(0, 200)}`
    );

    // Parse data (JSON or CSV)
    const sensorData = parseSensorData(response.data);
    console.log(`[${new Date().toISOString()}] Parsed ${sensorData.length} sensor records`);

    res.setHeader('X-Powered-By-Backend', 'express-local');
    res.json(sensorData);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching sensor data:`,
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.substring(0, 500));
    }

    // Don't expose sensitive error details in production
    const details =
      process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Data fetch failed';

    res.status(500).json({
      error: 'Failed to fetch sensor data',
      details,
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    googleScriptUrl: GOOGLE_SCRIPT_URL ? 'configured' : 'missing'
  });
});

/**
 * Error handling for 404 routes
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * Start the server
 */
let server;
if (isDirectRun) {
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Health check: GET /health');
    console.log('Sensor API: GET /api/sensor-data');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(`   Another server instance may be running.`);
      console.error(`   Run: kill $(lsof -ti :${PORT}) to free the port, then restart.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
}

export { app };
