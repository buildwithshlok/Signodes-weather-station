# NIET Weather Station

A professional-grade, real-time weather monitoring dashboard for NIET campus that displays sensor data from IoT devices with enterprise-level security and reliability.

## Features

- **Real-time Monitoring**: Live weather data from campus sensors with 5-minute polling
- **Multi-Sensor Support**: Temperature, humidity, pressure, air quality (PM2.5, PM10), UV index, carbon monoxide, and rainfall
- **Dark Mode**: Full dark/light theme support with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Node Status Monitoring**: Online/offline status detection for each sensor node
- **Network Resilience**: Automatic retry and timeout handling for API calls
- **Type-Safe**: Full TypeScript implementation with strict type checking
- **Data Validation**: Server-side and client-side data validation
- **Security**: CORS protection, environment variable configuration, no sensitive data logging

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Google Apps Script with sensor data endpoint (URL provided)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```
<img width="1439" height="691" alt="image" src="https://github.com/user-attachments/assets/e9173847-4c9e-40cc-b86b-94a8a6947d60" />

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Google Apps Script URL:
   ```env
   VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_SCRIPT_URL` | Google Apps Script API endpoint | `https://script.google.com/macros/s/ABC123/exec` |

### Optional Variables (Backend Server)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3002` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | (auto-configured in dev) |

### Example .env for Development

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
NODE_ENV=development
```

### Example .env for Production

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
NODE_ENV=production
ALLOWED_ORIGINS=https://weather.example.com,https://app.example.com
PORT=3002
```

## Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Shared components (Header, Footer, ErrorBoundary)
│   ├── dashboard/      # Dashboard components
│   ├── analytics/      # Analytics and data visualization
│   ├── map/           # Campus map visualization
│   └── heroui/        # UI effects and animations
├── context/            # React Context (Dark Mode, Nodes data)
├── pages/             # Page components (Home, Dashboard)
├── services/          # API services (Google Sheets integration)
├── config/            # Configuration files
├── utils/             # Utility functions (date formatting, etc.)
├── hooks/             # Custom React hooks
└── lib/               # Library-specific code
```

## API Integration

### Data Format

The application expects sensor data in the following format:

```json
{
  "id": "node-1",
  "name": "Node A",
  "location": "Block A",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "temperature": 28.5,
  "pressure": 1013.25,
  "humidity": 65,
  "aqi25val": 45,
  "aqi10val": 38,
  "uvIndex": 6,
  "uvRisk": "High",
  "rain": "No",
  "mq_co": 0.8,
  "lastUpdated": "2025-02-26T10:30:00Z"
}
```

### Data Update Interval

- **Default**: 5 minutes (300,000 ms)
- **Configurable**: Edit `src/context/NodesContext.tsx` line 87
- **Offline threshold**: 15 minutes (3x update interval)

## Deployment

### Netlify

The project is configured for Netlify deployment with serverless functions.

1. **Configure environment variables** in Netlify dashboard:
   - `GOOGLE_SCRIPT_URL`
   - `ALLOWED_ORIGINS` (optional)

2. **Deploy**
   ```bash
   npm run build
   netlify deploy --prod
   ```

### Vercel / Other Platforms

Update the `vite.config.ts` proxy configuration and environment variables as needed.

## Development

### Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### TypeScript

All code is written in TypeScript with strict mode enabled. Run type checking:

```bash
npx tsc --noEmit
```

### Code Quality

- **ESLint**: Configuration in `eslint.config.js`
- **Tailwind CSS**: Styling framework with custom configuration
- **React Hooks**: Optimized for performance with proper dependencies

## Security Considerations

### CORS Policy

- ✅ Strict origin validation (no wildcard `*`)
- ✅ Specific domain whitelist in production
- ✅ Automatic localhost support in development
- ✅ CORS preflight request handling

### Sensitive Data

- ✅ No sensitive URLs logged to console
- ✅ Error messages sanitized in production
- ✅ Environment variables not exposed to client
- ✅ Request timeouts prevent hanging

### Data Validation

- ✅ Server-side validation of sensor data
- ✅ Type-safe API responses
- ✅ Graceful error handling

## Troubleshooting

### Camera/Google API Issues

**Problem**: "VITE_GOOGLE_SCRIPT_URL not configured"

**Solution**: 
- Copy `.env.example` to `.env`
- Add your Google Apps Script URL from Google Cloud Console
- Restart the development server

### Sensor Data Not Loading

**Problem**: Dashboard shows "No data available"

**Solution**:
1. Check that Google Apps Script URL is valid
2. Verify sensor data is present in Google Sheets
3. Check browser console for errors
4. Ensure CORS is properly configured

### Timeout Errors

**Problem**: "Data fetching timeout"

**Solution**:
- Check internet connection
- Verify Google Apps Script endpoint is responding
- Increase timeout in `src/services/googleSheetsService.ts` (line 35)

## Performance

- **Bundle Size**: ~45KB gzipped (production)
- **First Contentful Paint**: <2s on 4G
- **Polling Efficiency**: 5-minute intervals with smart caching
- **Memory**: Optimized with React.memo and useCallback

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS 12+, Android 8+

## License

[Add your license here]

## Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review error logs in browser console
