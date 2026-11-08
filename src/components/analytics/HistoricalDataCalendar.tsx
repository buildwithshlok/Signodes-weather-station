import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { fetchAllHistoricalData, SensorData } from '../../services/googleSheetsService';
import { parseISTDate, getISTDateKey } from '../../utils/dateUtils';

const HistoricalDataCalendar: React.FC = () => {
  const { darkMode } = useDarkMode();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const [dailyData, setDailyData] = useState<Record<string, { aqi: number; temperature: number; humidity: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows: SensorData[] = await fetchAllHistoricalData();

        if (cancelled) return;

        const agg: Record<string, { aqiSum: number; aqiCount: number; tempSum: number; tempCount: number; humSum: number; humCount: number }> = {};
        for (const r of rows) {
          const d = parseISTDate(r.lastUpdated as string | undefined);
          if (!d) continue;
          const dateKey = getISTDateKey(d);
          const cur = agg[dateKey] || { aqiSum: 0, aqiCount: 0, tempSum: 0, tempCount: 0, humSum: 0, humCount: 0 };
          
          if (r.aqi25val !== null && r.aqi25val !== undefined && !isNaN(Number(r.aqi25val))) {
            cur.aqiSum += Number(r.aqi25val);
            cur.aqiCount++;
          }
          if (r.temperature !== null && r.temperature !== undefined && Number(r.temperature) > 0) {
            cur.tempSum += Number(r.temperature);
            cur.tempCount++;
          }
          if (r.humidity !== null && r.humidity !== undefined && Number(r.humidity) > 0) {
            cur.humSum += Number(r.humidity);
            cur.humCount++;
          }
          agg[dateKey] = cur;
        }

        const averaged: Record<string, { aqi: number; temperature: number; humidity: number; count: number }> = {};
        Object.entries(agg).forEach(([k, v]) => {
          averaged[k] = {
            aqi: v.aqiCount > 0 ? Math.round(v.aqiSum / v.aqiCount) : 0,
            temperature: v.tempCount > 0 ? Math.round((v.tempSum / v.tempCount) * 10) / 10 : 0,
            humidity: v.humCount > 0 ? Math.round(v.humSum / v.humCount) : 0,
            count: Math.max(v.aqiCount, v.tempCount, v.humCount),
          };
        });

        const dateKeys = Object.keys(averaged).sort();
        console.log(`[HistoricalDataCalendar] Aggregated ${dateKeys.length} days. Range: ${dateKeys[0]} to ${dateKeys[dateKeys.length - 1]}`);
        if (!cancelled) setDailyData(averaged);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDataForDate = (date: string) => {
    return dailyData[date];
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'bg-green-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-600';
    return 'bg-red-900';
  };

  const getAQITextColor = (aqi: number) => {
    if (darkMode) {
      if (aqi <= 50) return 'text-green-400';
      if (aqi <= 100) return 'text-yellow-400';
      if (aqi <= 150) return 'text-orange-400';
      if (aqi <= 200) return 'text-red-400';
      if (aqi <= 300) return 'text-purple-400';
      return 'text-red-300';
    } else {
      if (aqi <= 50) return 'text-green-700';
      if (aqi <= 100) return 'text-yellow-700';
      if (aqi <= 150) return 'text-orange-700';
      if (aqi <= 200) return 'text-red-700';
      if (aqi <= 300) return 'text-purple-800';
      return 'text-red-900';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarDays = () => {
    const days: JSX.Element[] = [];

    if (viewMode === 'week') {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay());
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const dayData = getDataForDate(dateString);
        const isSelected = selectedDate.toDateString() === date.toDateString();
        const isToday = new Date().toDateString() === date.toDateString();

        days.push(
          <div
            key={`w-${i}`}
            className={`h-20 border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'} rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? `ring-2 ring-sky-500 ${darkMode ? 'bg-sky-900/20' : 'bg-sky-50'}` : `${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`
              } ${isToday ? `${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}` : `${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}`}
            onClick={() => setSelectedDate(date)}
          >
            <div className="p-2 h-full flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${isToday ? `${darkMode ? 'text-sky-400' : 'text-sky-600'}` : `${darkMode ? 'text-slate-300' : 'text-slate-700'}`}`}>
                  {date.getDate()}
                </span>
                {dayData && (
                  <div className={`w-2.5 h-2.5 rounded-full ${getAQIColor(dayData.aqi)} shadow-sm`}></div>
                )}
              </div>
              {dayData && (
                <div className="flex-1 text-xs">
                  <div className={`font-bold ${getAQITextColor(dayData.aqi)}`}>AQI: {dayData.aqi}</div>
                  <div className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{dayData.temperature}°C</div>
                  <div className={`text-[10px] mt-0.5 ${(dayData.aqi <= 100) ? (darkMode ? 'text-emerald-400/80' : 'text-emerald-600/80') : (darkMode ? 'text-rose-400/80' : 'text-rose-600/80')}`}>
                    {dayData.count} pts
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
      return days;
    }

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = getDataForDate(dateString);
      const isSelected = selectedDate.toDateString() === new Date(dateString).toDateString();
      const isToday = new Date().toDateString() === new Date(dateString).toDateString();

      days.push(
        <div
          key={day}
          className={`h-20 border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'} rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? `ring-2 ring-sky-500 ${darkMode ? 'bg-sky-900/20' : 'bg-sky-50'}` : `${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`
            } ${isToday ? `${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}` : `${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}`}
          onClick={() => setSelectedDate(new Date(dateString))}
        >
          <div className="p-2 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-semibold ${isToday ? `${darkMode ? 'text-sky-400' : 'text-sky-600'}` : `${darkMode ? 'text-slate-300' : 'text-slate-700'}`}`}>
                {day}
              </span>
              {dayData && (
                <div className={`w-2.5 h-2.5 rounded-full ${getAQIColor(dayData.aqi)} shadow-sm`}></div>
              )}
            </div>
            {dayData && (
              <div className="flex-1 text-xs">
                <div className={`font-bold ${getAQITextColor(dayData.aqi)}`}>AQI: {dayData.aqi}</div>
                <div className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{dayData.temperature}°C</div>
                <div className={`text-[10px] mt-0.5 ${(dayData.aqi <= 100) ? (darkMode ? 'text-emerald-400/80' : 'text-emerald-600/80') : (darkMode ? 'text-rose-400/80' : 'text-rose-600/80')}`}>
                  {dayData.count} pts
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDayData = getDataForDate(selectedDate.toISOString().split('T')[0]);
  if (loading) {
    return (
      <section className={`py-16 ${darkMode ? 'bg-gray-900 text-white' : 'bg-indigo-50 text-gray-900'}`}>
        <div className="container mx-auto px-4 text-center">Loading historical data…</div>
      </section>
    );
  }
  if (error) {
    return (
      <section className={`py-16 ${darkMode ? 'bg-gray-900 text-white' : 'bg-indigo-50 text-gray-900'}`}>
        <div className="container mx-auto px-4 text-center">Error: {error}</div>
      </section>
    );
  }

  return (
    <section className={`py-16 ${darkMode ? 'bg-slate-900/50 text-slate-100 relative' : 'bg-slate-50 text-slate-900 relative'}`}>
      <div className={`absolute inset-0 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-200'} pointer-events-none`}></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-3`}>
              Air Quality Calendar
            </h2>
            <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto`}>
              Explore historical air quality data with our enhanced interactive calendar interface. Select days to view recorded patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <div className={`${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} border rounded-2xl shadow-xl p-6 relative overflow-hidden`} style={{ backdropFilter: 'blur(12px)' }}>
                {/* Top styling bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${darkMode ? 'from-sky-500/0 via-sky-500 to-sky-500/0' : 'from-slate-300/0 via-slate-300 to-slate-300/0'} opacity-50`}></div>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6 pt-2">
                  <div className="flexItems-center space-x-4">
                    <h3 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <div className={`flex items-center space-x-2 bg-${darkMode ? 'slate-900/50' : 'slate-100'} p-1 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'} ml-4`}>
                      <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${viewMode === 'month' ? (darkMode ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`
                          }`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${viewMode === 'week' ? (darkMode ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`
                          }`}
                      >
                        Week
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className={`p-2 rounded-lg transition-colors border ${darkMode ? 'border-slate-700 hover:bg-slate-700 bg-slate-800' : 'border-slate-200 hover:bg-slate-50 bg-white'}`}
                    >
                      <ChevronLeft className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                    </button>
                    <button
                      onClick={() => navigateMonth('next')}
                      className={`p-2 rounded-lg transition-colors border ${darkMode ? 'border-slate-700 hover:bg-slate-700 bg-slate-800' : 'border-slate-200 hover:bg-slate-50 bg-white'}`}
                    >
                      <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="mb-6">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className={`text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} py-2`}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays()}
                  </div>
                </div>

                {/* Legend */}
                <div className={`flex items-center justify-between pt-4 mt-6 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap gap-4 text-xs font-medium">
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Good (0-50)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full mr-2 shadow-[0_0_8px_rgba(234,179,8,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Moderate (51-100)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2 shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Unhealthy (101-150)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Very Unhealthy (151-200)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-purple-600 rounded-full mr-2 shadow-[0_0_8px_rgba(147,51,234,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Severe (201-300)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-red-900 rounded-full mr-2 shadow-[0_0_8px_rgba(127,29,29,0.4)]"></div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Hazardous (300+)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Panel */}
            <div className="space-y-6">
              {/* Selected Date Info */}
              <div className={`${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} border rounded-2xl shadow-xl p-6 relative overflow-hidden`} style={{ backdropFilter: 'blur(12px)' }}>
                <h4 className={`text-xl tracking-tight font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-5`}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h4>

                {selectedDayData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-xl border`}>
                        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>AQI</div>
                        <div className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDayData.aqi}</div>
                      </div>
                      <div className={`${darkMode ? 'bg-rose-900/10 border-rose-800/30' : 'bg-rose-50 border-rose-100'} p-4 rounded-xl border`}>
                        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>Temp</div>
                        <div className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDayData.temperature}°</div>
                      </div>
                    </div>

                    <div className={`${darkMode ? 'bg-sky-900/10 border-sky-800/30' : 'bg-sky-50 border-sky-100'} p-4 rounded-xl border`}>
                      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>Humidity</div>
                      <div className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDayData.humidity}%</div>
                    </div>

                    <div className={`pt-5 mt-5 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-200'} space-y-3`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Data Points</span>
                        <span className={`text-sm font-semibold rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{selectedDayData.count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Data Quality</span>
                        <span className={`text-sm font-semibold uppercase tracking-wider ${(selectedDayData.aqi <= 100) ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}`}>
                          {(selectedDayData.aqi <= 100) ? 'Reliable' : 'Anomalous'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className={`mb-2 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No readings found</div>
                    <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select a highlighted date with data</div>
                  </div>
                )}
              </div>

              {/* Empty space as per redesign */}

              {/* Monthly Summary */}
              <div className={`${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} border rounded-2xl shadow-xl p-6 relative overflow-hidden`} style={{ backdropFilter: 'blur(12px)' }}>
                <h4 className={`text-lg tracking-tight font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-4`}>Monthly Overview</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg AQI</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>67</span>
                  </div>
                  <div className={`w-full h-px ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Temp</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>28°C</span>
                  </div>
                  <div className={`w-full h-px ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Records</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                      {Object.values(dailyData).reduce((sum, day) => sum + day.count, 0).toLocaleString()}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HistoricalDataCalendar;