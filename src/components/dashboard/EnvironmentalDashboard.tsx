import React from 'react';
import { useNodes } from '../../context/NodesContext';
import { Thermometer, Droplets, Sun, CloudRain, Gauge } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { Meteors } from "../heroui/meteors";
import { WavyBackground } from "../heroui/wavy-background";
import { 
  formatTemperatureWithBounds, 
  formatHumidityWithBounds, 
  formatAirQualityWithBounds, 
  formatUVIndexWithBounds 
} from '../../utils/sensorFormatting';

const EnvironmentalDashboard: React.FC = () => {
  const { nodes, loading } = useNodes();
  const { darkMode } = useDarkMode();
  const nodeData = nodes.length > 0 ? nodes[0] : null;

  // Primary air quality metric taken directly from genuine Google Sheets aqi25val
  const pm25Value = nodeData?.aqi25val ?? 0;

  // Air quality category and styling for 0-800 µg/m³ range
  const getAirQualityInfo = (val: number) => {
    if (darkMode) {
      if (val <= 30) return { color: 'text-emerald-400', bgColor: 'bg-emerald-900/20 border-emerald-800/40', status: 'Good' };
      if (val <= 60) return { color: 'text-lime-400', bgColor: 'bg-lime-900/20 border-lime-800/40', status: 'Satisfactory' };
      if (val <= 90) return { color: 'text-amber-400', bgColor: 'bg-amber-900/20 border-amber-800/40', status: 'Moderate' };
      if (val <= 120) return { color: 'text-orange-400', bgColor: 'bg-orange-900/20 border-orange-800/40', status: 'Poor' };
      if (val <= 250) return { color: 'text-red-400', bgColor: 'bg-red-900/20 border-red-800/40', status: 'Very Poor' };
      return { color: 'text-rose-500', bgColor: 'bg-rose-900/30 border-rose-800/50', status: 'Severe' };
    } else {
      if (val <= 30) return { color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', status: 'Good' };
      if (val <= 60) return { color: 'text-lime-600', bgColor: 'bg-lime-50 border-lime-200', status: 'Satisfactory' };
      if (val <= 90) return { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', status: 'Moderate' };
      if (val <= 120) return { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', status: 'Poor' };
      if (val <= 250) return { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', status: 'Very Poor' };
      return { color: 'text-rose-800', bgColor: 'bg-rose-100 border-rose-300', status: 'Severe' };
    }
  };

  const aqiInfo = getAirQualityInfo(pm25Value);

  // Main dashboard data - 5 boxes
  const dashboardData = [
    {
      name: 'Air Quality',
      value: nodeData?.aqi25val !== undefined && nodeData?.aqi25val !== null ? formatAirQualityWithBounds(nodeData.aqi25val) : 'N/A',
      description: aqiInfo.status,
      unit: 'µg/m³',
      icon: Gauge,
      color: aqiInfo.color,
      bgColor: aqiInfo.bgColor,
      range: '0-800'
    },
    {
      name: 'Temperature',
      value: nodeData?.temperature !== undefined && nodeData !== null ? formatTemperatureWithBounds(nodeData.temperature) : 'N/A',
      description: 'Current ambient temperature',
      unit: '°C',
      icon: Thermometer,
      color: darkMode ? 'text-rose-400' : 'text-rose-500',
      bgColor: darkMode ? 'bg-rose-900/20 border-rose-800/40' : 'bg-rose-50 border-rose-200',
      range: '-10 to 50'
    },
    {
      name: 'Humidity',
      value: nodeData?.humidity !== undefined && nodeData !== null ? formatHumidityWithBounds(nodeData.humidity) : 'N/A',
      description: 'Relative humidity level',
      unit: '%',
      icon: Droplets,
      color: darkMode ? 'text-sky-400' : 'text-sky-500',
      bgColor: darkMode ? 'bg-sky-900/20 border-sky-800/40' : 'bg-sky-50 border-sky-200',
      range: '0-100'
    },
    {
      name: 'UV Index',
      value: nodeData?.uvIndex !== undefined && nodeData !== null ? formatUVIndexWithBounds(nodeData.uvIndex) : 'N/A',
      description: 'UV radiation level',
      unit: 'mW/cm²',
      icon: Sun,
      color: darkMode ? 'text-amber-400' : 'text-amber-500',
      bgColor: darkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200',
      range: '0-100'
    },
    {
      name: 'Rain Status',
      value: nodeData?.rain || 'Unknown',
      description: 'Precipitation status',
      unit: '',
      icon: CloudRain,
      color: (nodeData?.rain === 'Heavy Rain' || nodeData?.rain === 'Yes')
        ? (darkMode ? 'text-indigo-400' : 'text-indigo-600')
        : (nodeData?.rain === 'Light Rain')
          ? (darkMode ? 'text-sky-400' : 'text-sky-600')
          : (darkMode ? 'text-slate-400' : 'text-slate-500'),
      bgColor: (nodeData?.rain === 'Heavy Rain' || nodeData?.rain === 'Yes')
        ? (darkMode ? 'bg-indigo-900/20 border-indigo-800/40' : 'bg-indigo-50 border-indigo-200')
        : (nodeData?.rain === 'Light Rain')
          ? (darkMode ? 'bg-sky-900/20 border-sky-800/40' : 'bg-sky-50 border-sky-200')
          : (darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'),
      range: 'Estimated'
    }
  ];

  if (loading && !nodeData) {
    return (
      <section 
        className="py-20 bg-gradient-to-br from-primary-900 via-primary-800 to-signodes-900"
        role="region"
        aria-label="Loading environmental dashboard"
      >
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"
              role="status"
              aria-label="Loading"
            ></div>
            <p className="mt-4 text-white">Loading environmental data...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="sensor-data"
      className={`relative min-h-screen w-full overflow-hidden`}
      role="region"
      aria-labelledby="environmental-dashboard-title"
    >
      <div className="absolute inset-0 -z-10 bg-slate-50 dark:bg-slate-900">
        <WavyBackground
          className="h-full w-full opacity-60 dark:opacity-40"
          colors={darkMode ? ["#0ea5e980", "#38bdf860", "#22c55e40"] : ["#bae6fd80", "#7dd3fc80", "#bbf7d080"]}
          waveWidth={60}
          backgroundFill={darkMode ? "#0f172a" : "#f8fafc"}
          blur={14}
          speed="slow"
          waveOpacity={0.4}
        />
      </div>
      <Meteors className="absolute" />
      <div className="container mx-auto px-4 py-8 md:py-16 relative">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-fade-in">
          <div className="text-center mb-6 md:mb-10">
            <h2 id="environmental-dashboard-title" className={`text-2xl md:text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-2 md:mb-4 animate-slide-up tracking-tight`}>Environmental Dashboard</h2>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} max-w-3xl mx-auto text-sm md:text-lg animate-slide-up`} style={{ animationDelay: '100ms' }}>
              Real-time environmental metrics from our sensor network, providing insights into campus air quality and conditions.
            </p>
            <div className={`flex items-center justify-center mt-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                Last Updated: {nodes[0]?.lastUpdated ? (() => {
                  try {
                    let dateString = nodes[0].lastUpdated;
                    if (dateString.includes('_')) {
                      dateString = dateString.replace('_', 'T');
                    }
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                      return 'Unknown';
                    }
                    return date.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                  } catch {
                    return 'Unknown';
                  }
                })() : 'N/A'}
              </span>
            </div>
          </div>
          {/* Environmental Dashboard Cards - Only 5 Parameters */}
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-8"
            role="group"
            aria-label="Environmental metrics"
          >
            {dashboardData.map((item, index) => (
              <div 
                key={index} 
                className={`relative overflow-hidden ${darkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-slate-200'} p-4 md:p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border focus-within:ring-2 focus-within:ring-sky-500/50 animate-scale group`}
                style={{ animationDelay: `${index * 150}ms`, backdropFilter: 'blur(12px)' }}
                role="group"
                aria-label={`${item.name} reading`}
                tabIndex={0}
              >
                {/* Subtle top border accent based on category color */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${item.color}`}></div>

                <div className="text-center">
                  <div className="flex justify-center mb-5">
                    <div className={`p-4 rounded-xl ${item.bgColor} border transition-colors duration-300 group-hover:scale-110`}>
                      <item.icon className={`h-8 w-8 ${item.color}`} aria-hidden="true" />
                    </div>
                  </div>
                  
                  <h3 className={`text-base font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'} mb-1 uppercase tracking-wider`}>{item.name}</h3>
                  
                  <div 
                    className={`text-2xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mb-1 tracking-tight`}
                    role={item.name === 'Air Quality' ? 'meter' : undefined}
                    aria-valuetext={`${item.value}${item.unit}`}
                    aria-label={`${item.name}: ${item.value}${item.unit}`}
                  >
                    {item.value}
                    {item.unit && <span className={`text-lg ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.unit}</span>}
                  </div>
                  
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4 truncate`} title={item.description}>{item.description}</p>
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center mt-auto">
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'} font-medium`}>
                      Range: {item.range}
                    </span>
                    <div className="flex items-center">
                      <div 
                        className={`w-2 h-2 rounded-full ${item.value !== 'N/A' ? (darkMode ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-emerald-500') : 'bg-slate-500'} mr-1.5`}
                        role="status"
                        aria-label={item.value !== 'N/A' ? 'Live data' : 'Offline'}
                      ></div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {item.value !== 'N/A' ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnvironmentalDashboard;
