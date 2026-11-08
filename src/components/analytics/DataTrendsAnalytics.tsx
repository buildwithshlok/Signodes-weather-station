import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Thermometer, Droplets, Gauge, Activity, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchHistoricalData, SensorData } from '../../services/googleSheetsService';
import { useNodes } from '../../context/NodesContext';
import { useDarkMode } from '../../context/DarkModeContext';
import {
  parseISTDate,
  getISTDateKey,
  getISTMonthKey,
  formatISTLabels,
  formatISTDayMonthLabel,
  formatISTMonthYearLabel,
} from '../../utils/dateUtils';
import {
  MetricType,
  PeriodType,
  ChartPoint,
  GraphConfig,
  PERIOD_CONFIGS,
  calculateYAxisBounds,
} from '../../utils/analyticsUtils';

const DataTrendsAnalytics: React.FC = () => {
  const { nodes } = useNodes();
  const { darkMode } = useDarkMode();
  const nodeData = nodes.length > 0 ? nodes[0] : null;

  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<{
    metricId: MetricType;
    point: ChartPoint;
    cx: number;
    cy: number;
  } | null>(null);

  // Fetch historical data with request deduplication and abort controller
  const loadData = useCallback(async (requestedPeriod: PeriodType, force = false, signal?: AbortSignal) => {
    setHistoryLoading(true);
    setHistoryError(null);

    const config = PERIOD_CONFIGS[requestedPeriod];
    const targetRows = config ? config.targetRows : 3500;

    try {
      const rows = await fetchHistoricalData(targetRows, undefined, force, signal);
      if (signal?.aborted) return;
      setHistoricalData(rows);
    } catch (err) {
      if (signal?.aborted) return;
      console.error('[DataTrendsAnalytics] Error loading historical data:', err);
      setHistoryError(err instanceof Error ? err.message : 'Failed to retrieve genuine historical records');
    } finally {
      if (!signal?.aborted) {
        setHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(activePeriod, false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [activePeriod, loadData]);

  /**
   * Aggregate chronological time buckets in Indian Standard Time (IST)
   */
  const generateSeries = useCallback((type: MetricType, period: PeriodType): ChartPoint[] => {
    if (!historicalData || historicalData.length === 0) return [];

    // Parse each row's timestamp into an IST Date
    const parsedRows: { date: Date; val: number }[] = [];
    for (const r of historicalData) {
      const d = parseISTDate(r.lastUpdated as string | undefined);
      if (!d) continue;

      let val: number | null = null;
      switch (type) {
        case 'temperature': {
          // Temperature: DHTtemp_C in Column 4 (r.temperature).
          // Outdoor ambient temperature in Greater Noida ranges from ~5°C to ~50°C.
          // Values <= 0 represent sensor dropout / offline state and must not skew averages.
          const t = r.temperature !== null && r.temperature !== undefined ? Number(r.temperature) : null;
          val = t !== null && !isNaN(t) && t > 0 && t < 60 ? t : null;
          break;
        }
        case 'humidity': {
          // Humidity: DHThumid_percent in Column 3.
          // Values <= 0 represent sensor dropout.
          const h = r.humidity !== null && r.humidity !== undefined ? Number(r.humidity) : null;
          val = h !== null && !isNaN(h) && h > 0 && h <= 100 ? h : null;
          break;
        }
        case 'pm25': {
          // PM2.5: aqi25val in Column 6.
          const p25 = r.aqi25val !== null && r.aqi25val !== undefined ? Number(r.aqi25val) : null;
          val = p25 !== null && !isNaN(p25) && p25 >= 0 && p25 <= 1500 ? p25 : null;
          break;
        }
        case 'pm10': {
          // PM10: aqi10val in Column 5.
          const p10 = r.aqi10val !== null && r.aqi10val !== undefined ? Number(r.aqi10val) : null;
          val = p10 !== null && !isNaN(p10) && p10 >= 0 && p10 <= 2000 ? p10 : null;
          break;
        }
      }

      if (val !== null) {
        parsedRows.push({ date: d, val });
      }
    }

    // Anchor timeline to the latest date found in the dataset
    const allRowDates = historicalData
      .map((r) => parseISTDate(r.lastUpdated as string | undefined))
      .filter((d): d is Date => d !== null);

    if (allRowDates.length === 0) return [];
    const latestDate = new Date(Math.max(...allRowDates.map((d) => d.getTime())));

    // Build timeline buckets
    interface BucketMeta {
      key: string;
      time: string;
      fullTime: string;
      matcher: (rowDate: Date) => boolean;
    }

    const bucketMetas: BucketMeta[] = [];

    if (period === '7d') {
      // 7 calendar days up to latestDate
      for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(latestDate);
        d.setDate(d.getDate() - offset);
        const labels = formatISTLabels(d);
        const key = getISTDateKey(d);
        bucketMetas.push({
          key,
          time: labels.short,
          fullTime: labels.full,
          matcher: (rd) => getISTDateKey(rd) === key,
        });
      }
    } else if (period === '30d') {
      // 30 calendar days up to latestDate
      for (let offset = 29; offset >= 0; offset--) {
        const d = new Date(latestDate);
        d.setDate(d.getDate() - offset);
        const labels = formatISTLabels(d);
        const key = getISTDateKey(d);
        bucketMetas.push({
          key,
          time: formatISTDayMonthLabel(d),
          fullTime: labels.full,
          matcher: (rd) => getISTDateKey(rd) === key,
        });
      }
    } else if (period === '3m') {
      // 13 weekly buckets (~91 days) up to latestDate
      for (let offset = 12; offset >= 0; offset--) {
        const endOfWeek = new Date(latestDate);
        endOfWeek.setDate(endOfWeek.getDate() - offset * 7);
        const startOfWeek = new Date(endOfWeek);
        startOfWeek.setDate(startOfWeek.getDate() - 6);

        const key = `week-${getISTDateKey(startOfWeek)}`;
        bucketMetas.push({
          key,
          time: formatISTDayMonthLabel(endOfWeek),
          fullTime: `${formatISTDayMonthLabel(startOfWeek)} – ${formatISTDayMonthLabel(endOfWeek)}`,
          matcher: (rd) => rd >= startOfWeek && rd <= endOfWeek,
        });
      }
    } else if (period === '6m') {
      // 26 weekly buckets (~182 days) up to latestDate
      for (let offset = 25; offset >= 0; offset--) {
        const endOfWeek = new Date(latestDate);
        endOfWeek.setDate(endOfWeek.getDate() - offset * 7);
        const startOfWeek = new Date(endOfWeek);
        startOfWeek.setDate(startOfWeek.getDate() - 6);

        const key = `week-${getISTDateKey(startOfWeek)}`;
        bucketMetas.push({
          key,
          time: formatISTDayMonthLabel(endOfWeek),
          fullTime: `${formatISTDayMonthLabel(startOfWeek)} – ${formatISTDayMonthLabel(endOfWeek)}`,
          matcher: (rd) => rd >= startOfWeek && rd <= endOfWeek,
        });
      }
    } else {
      // 12 calendar months up to latestDate (12m)
      for (let offset = 11; offset >= 0; offset--) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - offset, 1);
        const key = getISTMonthKey(d);
        bucketMetas.push({
          key,
          time: formatISTMonthYearLabel(d),
          fullTime: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          matcher: (rd) => getISTMonthKey(rd) === key,
        });
      }
    }

    const totalBuckets = bucketMetas.length;

    // Group sensor values into their respective buckets
    const points: ChartPoint[] = bucketMetas.map((b, idx) => {
      const vals: number[] = [];
      for (const row of parsedRows) {
        if (b.matcher(row.date)) {
          vals.push(row.val);
        }
      }

      if (vals.length === 0) {
        return {
          key: b.key,
          time: b.time,
          fullTime: b.fullTime,
          value: null,
          min: null,
          max: null,
          count: 0,
          bucketIndex: idx,
          totalBuckets,
        };
      }

      const sum = vals.reduce((s, v) => s + v, 0);
      const avg = Math.round((sum / vals.length) * 10) / 10;

      return {
        key: b.key,
        time: b.time,
        fullTime: b.fullTime,
        value: avg,
        min: Math.min(...vals),
        max: Math.max(...vals),
        count: vals.length,
        bucketIndex: idx,
        totalBuckets,
      };
    });

    return points;
  }, [historicalData]);

  const seriesData = useMemo(() => {
    return {
      temperature: generateSeries('temperature', activePeriod),
      humidity: generateSeries('humidity', activePeriod),
      pm25: generateSeries('pm25', activePeriod),
      pm10: generateSeries('pm10', activePeriod),
    };
  }, [generateSeries, activePeriod]);

  const graphConfigs: GraphConfig[] = useMemo(
    () => [
      {
        id: 'temperature',
        title: 'Temperature',
        icon: Thermometer,
        unit: '°C',
        color: '#f43f5e',
        currentValue: nodeData?.temperature ?? 0,
      },
      {
        id: 'humidity',
        title: 'Relative Humidity',
        icon: Droplets,
        unit: '%',
        color: '#0ea5e9',
        currentValue: nodeData?.humidity ?? 0,
      },
      {
        id: 'pm25',
        title: 'PM2.5 Concentration',
        icon: Gauge,
        unit: 'µg/m³',
        color: '#10b981',
        currentValue: nodeData?.aqi25val ?? 0,
      },
      {
        id: 'pm10',
        title: 'PM10 Concentration',
        icon: Activity,
        unit: 'µg/m³',
        color: '#f59e0b',
        currentValue: nodeData?.aqi10val ?? 0,
      },
    ],
    [nodeData]
  );

  // Export genuine chart data as CSV
  const exportAsCSV = (config: GraphConfig, points: ChartPoint[]) => {
    const validPoints = points.filter((p) => p.value !== null);
    const csvContent = [
      `Date,Period,${config.title} (${config.unit}),Min,Max,Samples`,
      ...validPoints.map(
        (p) => `"${p.fullTime}","${PERIOD_CONFIGS[activePeriod].label}",${p.value},${p.min},${p.max},${p.count}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${config.id}_${activePeriod}_historical_trends.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      className={`py-16 ${darkMode ? 'bg-slate-900/50 text-slate-100 relative' : 'bg-slate-50 text-slate-900 relative'}`}
      aria-labelledby="data-trends-heading"
    >
      <div className={`absolute inset-0 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-200'} pointer-events-none`}></div>
      <div className="container mx-auto px-4 relative z-10">
        {/* Header & Global Period Selector */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 md:mb-12 gap-4">
          <div className="text-center md:text-left">
            <h2 id="data-trends-heading" className={`text-3xl md:text-4xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-2`}>
              Data Trends &amp; Analytics
            </h2>
            <p className={`text-base md:text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Genuine historical sensor patterns from campus weather station telemetry
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* 5-tier period selector: 7d, 30d, 3m, 6m, 12m */}
            <div
              className={`flex ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-1 shadow-sm overflow-x-auto`}
              role="group"
              aria-label="Time period selector"
            >
              {(Object.keys(PERIOD_CONFIGS) as PeriodType[]).map((p) => {
                const isSelected = activePeriod === p;
                return (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`px-3 sm:px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-sm'
                        : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {PERIOD_CONFIGS[p].label}
                  </button>
                );
              })}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(activePeriod, true)}
              disabled={historyLoading}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${historyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh genuine historical data"
              aria-label="Refresh historical data"
            >
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Error Banner (if any) */}
        {historyError && (
          <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span className="text-sm">Unable to refresh historical data: {historyError}. Displaying available cached records.</span>
          </div>
        )}

        {/* Graphs 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {graphConfigs.map((config) => {
            const points = seriesData[config.id];
            const validPoints = points ? points.filter((p) => p.value !== null) : [];
            const hasData = validPoints.length >= 1;
            const values = validPoints.map((p) => p.value as number);
            const { min: yMin, max: yMax, ticks } = calculateYAxisBounds(config.id, values);

            // Compute segments of continuous valid points (preserving gaps honestly)
            const segments: ChartPoint[][] = [];
            let currentSegment: ChartPoint[] = [];
            if (points) {
              for (const p of points) {
                if (p.value !== null) {
                  currentSegment.push(p);
                } else if (currentSegment.length > 0) {
                  segments.push(currentSegment);
                  currentSegment = [];
                }
              }
              if (currentSegment.length > 0) {
                segments.push(currentSegment);
              }
            }

            // Calculate overall genuine min, max, average across all valid points
            const maxPoint = hasData ? validPoints.reduce((m, p) => ((p.value ?? 0) > (m.value ?? 0) ? p : m), validPoints[0]) : null;
            const minPoint = hasData ? validPoints.reduce((m, p) => ((p.value ?? 0) < (m.value ?? 0) ? p : m), validPoints[0]) : null;
            const avgValue = hasData
              ? Math.round((validPoints.reduce((s, p) => s + (p.value ?? 0), 0) / validPoints.length) * 10) / 10
              : null;

            const totalBuckets = points && points.length > 0 ? points.length : 1;

            return (
              <div
                key={config.id}
                className={`${
                  darkMode ? 'bg-slate-800/90 border-slate-700/60' : 'bg-white border-slate-200'
                } border rounded-2xl p-5 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between`}
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {/* Accent top line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-60"
                  style={{ color: config.color }}
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2.5 rounded-xl shadow-sm"
                        style={{ backgroundColor: `${config.color}20`, border: `1px solid ${config.color}40` }}
                      >
                        <config.icon className="w-5 h-5" style={{ color: config.color }} />
                      </div>
                      <div>
                        <h3 className={`text-lg md:text-xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {config.title}
                        </h3>
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Unit: {config.unit} • Range: {PERIOD_CONFIGS[activePeriod].rangeLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className="text-sm font-bold px-3 py-1 rounded-full border shadow-inner hidden sm:inline-block"
                        style={{ backgroundColor: `${config.color}15`, color: config.color, borderColor: `${config.color}30` }}
                      >
                        Latest: {Number(config.currentValue).toFixed(config.unit === '%' ? 0 : 1)} {config.unit}
                      </div>

                      <button
                        onClick={() => exportAsCSV(config, points)}
                        disabled={!hasData}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        } ${!hasData ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title={`Export ${config.title} CSV`}
                        aria-label={`Export ${config.title} data as CSV`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Graph Canvas */}
                  <div className="relative h-56 md:h-64 rounded-xl p-2 mb-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    {historyLoading && historicalData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading genuine records...</span>
                      </div>
                    ) : !hasData ? (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="w-8 h-8 opacity-30 mb-2" style={{ color: config.color }} />
                        <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Insufficient genuine records in this period
                        </span>
                        <span className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          Data accumulates continuously from station telemetry
                        </span>
                      </div>
                    ) : (
                      <svg
                        className="w-full h-full overflow-visible"
                        viewBox="0 0 540 220"
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <defs>
                          <linearGradient id={`${config.id}Gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={config.color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y-Axis Grid Lines & Tick Labels (Exact Pixel Alignment) */}
                        {ticks.map((val, i) => {
                          const y = 25 + i * 30; // 25, 55, 85, 115, 145, 175
                          return (
                            <g key={i}>
                              <line
                                x1="55"
                                y1={y}
                                x2="490"
                                y2={y}
                                stroke={darkMode ? '#334155' : '#e2e8f0'}
                                strokeWidth={i === 5 ? '1.5' : '1'}
                                strokeDasharray={i === 5 ? 'none' : '4,4'}
                              />
                              <text
                                x="48"
                                y={y + 4}
                                textAnchor="end"
                                fontSize="11"
                                fontWeight="600"
                                fill={darkMode ? '#94a3b8' : '#64748b'}
                              >
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Y-axis vertical line */}
                        <line
                          x1="55"
                          y1="25"
                          x2="55"
                          y2="175"
                          stroke={darkMode ? '#334155' : '#cbd5e1'}
                          strokeWidth="1.5"
                        />

                        {/* Area Fills for each continuous segment */}
                        {segments.map((seg, sIdx) => {
                          if (seg.length < 2) return null;
                          const d = `M ${55 + (seg[0].bucketIndex / (totalBuckets - 1)) * 435},${
                            175 - (((seg[0].value ?? yMin) - yMin) / (yMax - yMin)) * 150
                          } ${seg
                            .slice(1)
                            .map((p) => {
                              const cx = 55 + (p.bucketIndex / (totalBuckets - 1)) * 435;
                              const cy = 175 - (((p.value ?? yMin) - yMin) / (yMax - yMin)) * 150;
                              return `L ${cx},${cy}`;
                            })
                            .join(' ')} L ${55 + (seg[seg.length - 1].bucketIndex / (totalBuckets - 1)) * 435},175 L ${
                            55 + (seg[0].bucketIndex / (totalBuckets - 1)) * 435
                          },175 Z`;

                          return <path key={`area-${sIdx}`} d={d} fill={`url(#${config.id}Gradient)`} stroke="none" />;
                        })}

                        {/* Line Strokes for each continuous segment */}
                        {segments.map((seg, sIdx) => {
                          if (seg.length === 1) {
                            const cx = 55 + (seg[0].bucketIndex / (totalBuckets - 1)) * 435;
                            const cy = 175 - (((seg[0].value ?? yMin) - yMin) / (yMax - yMin)) * 150;
                            return (
                              <circle
                                key={`single-${sIdx}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={config.color}
                              />
                            );
                          }

                          const d = `M ${55 + (seg[0].bucketIndex / (totalBuckets - 1)) * 435},${
                            175 - (((seg[0].value ?? yMin) - yMin) / (yMax - yMin)) * 150
                          } ${seg
                            .slice(1)
                            .map((p) => {
                              const cx = 55 + (p.bucketIndex / (totalBuckets - 1)) * 435;
                              const cy = 175 - (((p.value ?? yMin) - yMin) / (yMax - yMin)) * 150;
                              return `L ${cx},${cy}`;
                            })
                            .join(' ')}`;

                          return (
                            <path
                              key={`line-${sIdx}`}
                              d={d}
                              fill="none"
                              stroke={config.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}

                        {/* Interactive Data Point Circles (Valid Points Only) */}
                        {validPoints.map((p, i) => {
                          const cx = 55 + (p.bucketIndex / (totalBuckets - 1)) * 435;
                          const cy = 175 - (((p.value ?? yMin) - yMin) / (yMax - yMin)) * 150;
                          const isHovered = hoveredPoint?.metricId === config.id && hoveredPoint.point.key === p.key;

                          return (
                            <g key={`point-${i}`}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isHovered ? 6 : totalBuckets > 20 ? 3 : 4}
                                fill={darkMode ? '#0f172a' : '#ffffff'}
                                stroke={config.color}
                                strokeWidth={isHovered ? 3 : 2}
                                className="cursor-pointer transition-all duration-150"
                                onMouseEnter={() => setHoveredPoint({ metricId: config.id, point: p, cx, cy })}
                              />
                            </g>
                          );
                        })}

                        {/* Dynamic X-Axis Date/Time Labels (Chronological, Calendar-Aligned) */}
                        {points.map((p, i) => {
                          const cx = 55 + (p.bucketIndex / (totalBuckets - 1)) * 435;

                          // Stride determination to avoid text collisions
                          let showLabel = true;
                          if (totalBuckets > 20) {
                            showLabel = i % Math.ceil(totalBuckets / 6) === 0 || i === totalBuckets - 1;
                          } else if (totalBuckets > 10) {
                            showLabel = i % 2 === 0 || i === totalBuckets - 1;
                          }

                          if (!showLabel) return null;

                          return (
                            <g key={`x-${i}`}>
                              <line
                                x1={cx}
                                y1="175"
                                x2={cx}
                                y2="180"
                                stroke={darkMode ? '#475569' : '#cbd5e1'}
                                strokeWidth="1"
                              />
                              <text
                                x={cx}
                                y="196"
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="600"
                                fill={darkMode ? '#94a3b8' : '#64748b'}
                              >
                                {p.time}
                              </text>
                            </g>
                          );
                        })}

                        {/* Interactive Hover Tooltip */}
                        {hoveredPoint && hoveredPoint.metricId === config.id && (
                          <g>
                            {/* Hover Guide Line */}
                            <line
                              x1={hoveredPoint.cx}
                              y1="25"
                              x2={hoveredPoint.cx}
                              y2="175"
                              stroke={darkMode ? '#64748b' : '#94a3b8'}
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />

                            {/* Tooltip Box with Boundary Clamping */}
                            {(() => {
                              const boxWidth = 145;
                              const boxHeight = 52;
                              const clampedX = Math.max(65, Math.min(480 - boxWidth, hoveredPoint.cx - boxWidth / 2));
                              const clampedY = hoveredPoint.cy > 80 ? hoveredPoint.cy - boxHeight - 10 : hoveredPoint.cy + 15;

                              return (
                                <g transform={`translate(${clampedX}, ${clampedY})`}>
                                  <rect
                                    width={boxWidth}
                                    height={boxHeight}
                                    rx="8"
                                    fill={darkMode ? '#1e293b' : '#ffffff'}
                                    stroke={darkMode ? '#334155' : '#e2e8f0'}
                                    strokeWidth="1.5"
                                    filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))"
                                  />
                                  <text x="10" y="16" fontSize="10" fontWeight="600" fill={darkMode ? '#94a3b8' : '#64748b'}>
                                    {hoveredPoint.point.fullTime}
                                  </text>
                                  <text x="10" y="34" fontSize="13" fontWeight="bold" fill={config.color}>
                                    Avg: {hoveredPoint.point.value} {config.unit}
                                  </text>
                                  <text x="10" y="46" fontSize="9" fill={darkMode ? '#cbd5e1' : '#64748b'}>
                                    Min: {hoveredPoint.point.min} • Max: {hoveredPoint.point.max}
                                  </text>
                                  <text x={boxWidth - 10} y="34" textAnchor="end" fontSize="9" fill={darkMode ? '#cbd5e1' : '#64748b'}>
                                    {hoveredPoint.point.count} samples
                                  </text>
                                </g>
                              );
                            })()}
                          </g>
                        )}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Bottom Stats Footer (Genuine Max / Avg / Min) */}
                <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-200 dark:border-slate-700/60 pt-4 mt-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Min</span>
                    <span className="text-base font-bold tracking-tight mt-0.5" style={{ color: config.color }}>
                      {minPoint && minPoint.min !== null ? `${minPoint.min} ${config.unit}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center border-x border-slate-200 dark:border-slate-700/60">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg</span>
                    <span className="text-base font-bold tracking-tight mt-0.5" style={{ color: config.color }}>
                      {avgValue !== null ? `${avgValue} ${config.unit}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max</span>
                    <span className="text-base font-bold tracking-tight mt-0.5" style={{ color: config.color }}>
                      {maxPoint && maxPoint.max !== null ? `${maxPoint.max} ${config.unit}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DataTrendsAnalytics;
