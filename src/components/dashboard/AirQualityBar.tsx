import React from 'react';
import { useNodes } from '../../context/NodesContext';
import { Thermometer, Wind, AlertTriangle, Zap } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { calculateRPI, computeCoBaseline } from '../../utils/sensorCalibration';

const AirQualityBar: React.FC = () => {
  const { nodes } = useNodes();
  const { darkMode } = useDarkMode();
  const nodeData = nodes.length > 0 ? nodes[0] : null;

  // Compute a dynamic clean-air baseline from all available node CO readings
  const dynamicCoBaseline = (() => {
    const allCo = nodes
      .map(n => Number(n.mq_co))
      .filter(v => v > 0 && isFinite(v));
    return computeCoBaseline(allCo);
  })();

  // Use latest Google Sheets aqi25val reading directly as the main air-quality value
  const mainAirQuality = nodeData?.aqi25val !== null && nodeData?.aqi25val !== undefined ? Number(nodeData.aqi25val) : 0;

  // Get temperature-based color conditions
  const getTemperatureColor = (temp: number) => {
    if (temp <= 10) return 'from-blue-400 to-blue-600'; // Cold
    if (temp <= 20) return 'from-green-400 to-green-600'; // Cool
    if (temp <= 30) return 'from-yellow-400 to-yellow-600'; // Warm
    if (temp <= 35) return 'from-orange-400 to-orange-600'; // Hot
    return 'from-red-400 to-red-600'; // Very Hot
  };

  // Visual thresholds and colors for 0-800 µg/m³ range
  const getAirQualityInfo = (val: number) => {
    if (darkMode) {
      if (val <= 30) return { 
        color: 'bg-emerald-500', 
        textColor: 'text-emerald-400',
        status: 'Good', 
        description: 'Air quality is satisfactory',
        bgGradient: 'from-emerald-900/30 to-emerald-800/20'
      };
      if (val <= 60) return { 
        color: 'bg-lime-500', 
        textColor: 'text-lime-400',
        status: 'Satisfactory', 
        description: 'Air quality is acceptable',
        bgGradient: 'from-lime-900/30 to-lime-800/20'
      };
      if (val <= 90) return { 
        color: 'bg-amber-500', 
        textColor: 'text-amber-400',
        status: 'Moderate', 
        description: 'Moderate ambient particulate concentration',
        bgGradient: 'from-amber-900/30 to-amber-800/20'
      };
      if (val <= 120) return { 
        color: 'bg-orange-500', 
        textColor: 'text-orange-400',
        status: 'Poor', 
        description: 'Elevated ambient particulate concentration',
        bgGradient: 'from-orange-900/30 to-orange-800/20'
      };
      if (val <= 250) return { 
        color: 'bg-red-500', 
        textColor: 'text-red-400',
        status: 'Very Poor', 
        description: 'High particulate concentration level',
        bgGradient: 'from-red-900/30 to-red-800/20'
      };
      return { 
        color: 'bg-rose-700', 
        textColor: 'text-rose-400',
        status: 'Severe', 
        description: 'Severe ambient particulate level',
        bgGradient: 'from-rose-900/40 to-rose-800/30'
      };
    } else {
      if (val <= 30) return { 
        color: 'bg-emerald-500', 
        textColor: 'text-emerald-700',
        status: 'Good', 
        description: 'Air quality is satisfactory',
        bgGradient: 'from-emerald-100 to-emerald-200'
      };
      if (val <= 60) return { 
        color: 'bg-lime-500', 
        textColor: 'text-lime-700',
        status: 'Satisfactory', 
        description: 'Air quality is acceptable',
        bgGradient: 'from-lime-100 to-lime-200'
      };
      if (val <= 90) return { 
        color: 'bg-amber-500', 
        textColor: 'text-amber-700',
        status: 'Moderate', 
        description: 'Moderate ambient particulate concentration',
        bgGradient: 'from-amber-100 to-amber-200'
      };
      if (val <= 120) return { 
        color: 'bg-orange-500', 
        textColor: 'text-orange-700',
        status: 'Poor', 
        description: 'Elevated ambient particulate concentration',
        bgGradient: 'from-orange-100 to-orange-200'
      };
      if (val <= 250) return { 
        color: 'bg-red-500', 
        textColor: 'text-red-700',
        status: 'Very Poor', 
        description: 'High particulate concentration level',
        bgGradient: 'from-red-100 to-red-200'
      };
      return { 
        color: 'bg-rose-800', 
        textColor: 'text-rose-900',
        status: 'Severe', 
        description: 'Severe ambient particulate level',
        bgGradient: 'from-rose-200 to-rose-300'
      };
    }
  };

  const aqiInfo = getAirQualityInfo(mainAirQuality);
  const temperature = nodeData?.temperature || 0;
  const tempColor = getTemperatureColor(temperature);

  return (
    <section className={`py-16 bg-gradient-to-r ${darkMode ? 'from-primary-900 to-primary-800' : aqiInfo.bgGradient} animate-fade-in`} aria-label="Air Quality Information">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="hidden md:block text-center mb-10 md:mb-12 space-y-2 md:space-y-3 animate-slide-in-left" aria-labelledby="air-quality-heading">
            <h2 id="air-quality-heading" className={`text-3xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Air Quality & Environmental Status</h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-base md:text-lg max-w-2xl mx-auto transition-colors duration-300`}>Real-time air quality monitoring with temperature-responsive indicators</p>
          </div>

          {/* Main Air Quality Bar */}
          <div className={`${darkMode ? 'bg-primary-800/90 backdrop-blur-sm border border-primary-700' : 'bg-white/95 backdrop-blur-sm'} rounded-3xl shadow-card p-5 md:p-8 mb-6 md:mb-10 transition-all duration-300 hover:shadow-glow animate-slide-up`}>
            {/* Mobile Header: Temperature + Air Quality side-by-side */}
            <div className={`md:hidden flex justify-between items-start mb-6 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'} pb-4`}>
               <div>
                  <div className={`flex items-center ${darkMode ? 'text-white/80' : 'text-gray-500'} text-sm font-medium mb-1`}>
                     <Thermometer className="w-4 h-4 mr-1" /> Temperature
                  </div>
                  <div className={`text-5xl font-bold bg-gradient-to-r ${tempColor} bg-clip-text text-transparent`}>{temperature}°</div>
               </div>
               <div className="text-right">
                  <div className={`flex items-center justify-end ${darkMode ? 'text-white/80' : 'text-gray-500'} text-sm font-medium mb-1`}>
                     <div className={`w-3 h-3 ${aqiInfo.color} rounded-full mr-1.5 shadow-inner-light`}></div> Air Quality
                  </div>
                  <div className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                    {nodeData?.aqi25val !== undefined && nodeData?.aqi25val !== null ? nodeData.aqi25val : 'N/A'}
                  </div>
                  <div className={`text-sm font-bold ${aqiInfo.textColor}`}>{aqiInfo.status}</div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-center" role="region" aria-label="Air quality measurements">
              
              {/* Air Quality Display - Desktop */}
              <div className="hidden md:block text-center lg:text-left animate-slide-in-left" style={{animationDelay: '100ms'}} role="region" aria-label="Air quality reading">
                <div className="flex items-center justify-center lg:justify-start mb-5">
                  <div className={`w-5 h-5 ${aqiInfo.color} rounded-full mr-3 animate-pulse-slow shadow-inner-light`}></div>
                  <span className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>Air Quality (PM2.5)</span>
                </div>
                <div className={`text-6xl md:text-7xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                  {nodeData?.aqi25val !== undefined && nodeData?.aqi25val !== null ? nodeData.aqi25val : 'N/A'}
                  <span className={`text-2xl font-normal ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>µg/m³</span>
                </div>
                <div className={`text-xl md:text-2xl font-semibold ${darkMode ? 'text-white' : aqiInfo.textColor} mb-2 md:mb-3 transition-colors duration-300`}>{aqiInfo.status}</div>
                <div className={`text-sm md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>{aqiInfo.description}</div>
              </div>

              {/* Gauge Progress Bar (0-800 µg/m³) */}
              <div className="lg:col-span-1 animate-slide-up" style={{animationDelay: '200ms'}}>
                <div className="mb-6">
                  <div className={`flex justify-between text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium transition-colors duration-300`}>
                    <span>Good</span>
                    <span>Moderate</span>
                    <span>Poor</span>
                    <span>Severe</span>
                  </div>
                  <div className="h-8 bg-gradient-to-r from-emerald-400 via-lime-400 via-yellow-400 via-orange-400 via-red-500 to-rose-900 rounded-full relative shadow-inner-light" role="progressbar" aria-valuemin={0} aria-valuemax={800} aria-valuenow={mainAirQuality} aria-label="Air Quality gauge progress bar">
                    <div 
                      className={`absolute top-0 w-3 h-10 ${darkMode ? 'bg-gray-200' : 'bg-white'} border-2 ${darkMode ? 'border-primary-600' : 'border-gray-800'} rounded-full transform -translate-y-1 shadow-soft transition-all duration-500 animate-pulse-slow`}
                      style={{ left: `${Math.min(((mainAirQuality / 800) * 100), 100)}%` }}
                    ></div>
                  </div>
                  <div className={`flex justify-between text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-medium transition-colors duration-300`}>
                    <span>0</span>
                    <span>60</span>
                    <span>120</span>
                    <span>250</span>
                    <span>500</span>
                    <span>800 µg/m³</span>
                  </div>
                </div>

                {/* PM Values Display */}
                <div className="grid grid-cols-2 gap-5" role="region" aria-label="Particulate matter measurements">
                  <div className={`${darkMode ? 'bg-primary-700/80 border border-primary-600' : 'bg-gray-50/90 border border-gray-100'} p-4 rounded-xl shadow-soft transition-all duration-300 hover:shadow-card hover:scale-105 transform`}>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>PM2.5</div>
                    <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>{nodeData?.aqi25val !== undefined && nodeData?.aqi25val !== null ? nodeData.aqi25val : 'N/A'}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>μg/m³</div>
                  </div>
                  <div className={`${darkMode ? 'bg-primary-700/80 border border-primary-600' : 'bg-gray-50/90 border border-gray-100'} p-4 rounded-xl shadow-soft transition-all duration-300 hover:shadow-card hover:scale-105 transform`}>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>PM10</div>
                    <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>{nodeData?.aqi10val !== undefined && nodeData?.aqi10val !== null ? nodeData.aqi10val : 'N/A'}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>μg/m³</div>
                  </div>
                </div>
              </div>

              {/* Temperature-Responsive Section */}
              <div className="hidden md:block text-center lg:text-right animate-slide-in-right" style={{animationDelay: '300ms'}}>
                <div className="flex items-center justify-center lg:justify-end mb-5">
                  <Thermometer className={`w-6 h-6 mr-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'} animate-pulse-slow transition-colors duration-300`} />
                  <span className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>Temperature Impact</span>
                </div>
                <div className={`text-5xl md:text-6xl font-bold bg-gradient-to-r ${tempColor} bg-clip-text text-transparent mb-3 animate-float`}>
                  {temperature}°C
                </div>
                <div className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-5 transition-colors duration-300 max-w-xs ml-auto`}>
                  {temperature <= 10 && "Cold conditions may affect air quality sensors"}
                  {temperature > 10 && temperature <= 20 && "Optimal temperature for accurate readings"}
                  {temperature > 20 && temperature <= 30 && "Warm conditions - normal operation"}
                  {temperature > 30 && temperature <= 35 && "Hot conditions may increase pollutant levels"}
                  {temperature > 35 && "Very hot - potential sensor calibration needed"}
                </div>

                {temperature > 35 && (
                  <div 
                    className={`flex items-center justify-center lg:justify-end ${darkMode ? 'text-orange-400 bg-orange-900/30' : 'text-orange-600 bg-orange-100'} px-4 py-2 rounded-xl shadow-soft animate-pulse-slow`}
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" aria-hidden="true" />
                    <span className="text-sm font-medium">High Temperature Alert</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Environmental Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{animationDelay: '400ms'}}>
            <div className={`${darkMode ? 'bg-primary-800/90 backdrop-blur-sm border border-primary-700 text-white' : 'bg-white/95 backdrop-blur-sm border border-gray-100'} rounded-2xl shadow-card p-5 md:p-6 transition-all duration-300 hover:shadow-glow transform md:hover:scale-[1.02] animate-slide-in-left`} style={{animationDelay: '500ms'}} role="region" aria-label="Humidity information">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <Wind className={`w-7 h-7 text-blue-500 dark:text-blue-400 mr-3 animate-float`} style={{animationDelay: '100ms'}} />
                  <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>Humidity</span>
                </div>
                <span className={`text-3xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300`}>{nodeData?.humidity !== undefined && nodeData?.humidity !== null ? `${nodeData.humidity}%` : 'N/A'}</span>
              </div>
              <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3 shadow-inner-light transition-colors duration-300`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={nodeData?.humidity || 0} aria-label="Humidity level">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500 shadow-soft"
                  style={{ width: `${Math.min(nodeData?.humidity || 0, 100)}%` }}
                ></div>
              </div>
              <div className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-4 transition-colors duration-300`}>
                {(nodeData?.humidity || 0) < 30 && "Low humidity - dry conditions"}
                {(nodeData?.humidity || 0) >= 30 && (nodeData?.humidity || 0) <= 60 && "Comfortable humidity levels"}
                {(nodeData?.humidity || 0) > 60 && "High humidity - may feel muggy"}
              </div>
            </div>

            <div className={`${darkMode ? 'bg-primary-800/90 backdrop-blur-sm border border-primary-700 text-white' : 'bg-white/95 backdrop-blur-sm border border-gray-100'} rounded-2xl shadow-card p-5 md:p-6 transition-all duration-300 hover:shadow-glow transform md:hover:scale-[1.02] animate-slide-up`} style={{animationDelay: '600ms'}} role="region" aria-label="UV Index information">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <div className="w-7 h-7 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mr-3 shadow-soft animate-pulse-slow"></div>
                  <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>UV Index</span>
                </div>
                <span className={`text-3xl font-bold text-yellow-600 dark:text-yellow-400 transition-colors duration-300`}>{nodeData?.uvIndex !== undefined && nodeData?.uvIndex !== null ? nodeData.uvIndex : 'N/A'}</span>
              </div>
              <div className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 transition-colors duration-300`}>
                UV Risk: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>{nodeData?.uvRisk || 'Unknown'}</span>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2 transition-colors duration-300`}>{nodeData?.uvIndex || 0} mW/cm²</div>
            </div>

            <div className={`${darkMode ? 'bg-primary-800/90 backdrop-blur-sm border border-primary-700 text-white' : 'bg-white/95 backdrop-blur-sm border border-gray-100'} rounded-2xl shadow-card p-5 md:p-6 transition-all duration-300 hover:shadow-glow transform md:hover:scale-[1.02] animate-slide-in-right`} style={{animationDelay: '700ms'}}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <div className={`w-7 h-7 ${nodeData?.rain === 'Heavy Rain' || nodeData?.rain === 'Light Rain' || nodeData?.rain === 'Yes' ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-gray-300 to-gray-500'} rounded-full mr-3 shadow-soft ${nodeData?.rain === 'Heavy Rain' || nodeData?.rain === 'Light Rain' ? 'animate-pulse-slow' : ''}`}></div>
                  <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>Precipitation</span>
                </div>
                <span className={`text-xl font-bold ${nodeData?.rain === 'Heavy Rain' || nodeData?.rain === 'Light Rain' || nodeData?.rain === 'Yes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} transition-colors duration-300`}>
                  {nodeData?.rain || 'Unknown'}
                </span>
              </div>
              <div className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                {nodeData?.rain === 'Heavy Rain' && 'High humidity indicates potential heavy rain'}
                {nodeData?.rain === 'Light Rain' && 'Elevated humidity indicates potential light rain'}
                {(nodeData?.rain === 'No Rain' || nodeData?.rain === 'No') && 'No precipitation detected'}
                {(!nodeData?.rain || nodeData?.rain === 'Unknown') && 'Precipitation status unknown'}
              </div>
            </div>

            {/* CO + RPI card */}
            {(() => {
              const coValue = nodeData?.mq_co;
              const rpi = (coValue !== null && coValue !== undefined && Number(coValue) > 0)
                ? calculateRPI(Number(coValue), dynamicCoBaseline)
                : null;
              return (
                <div
                  className={`${darkMode ? 'bg-primary-800/90 backdrop-blur-sm border border-primary-700 text-white' : 'bg-white/95 backdrop-blur-sm border border-gray-100'} rounded-2xl shadow-card p-5 md:p-6 transition-all duration-300 hover:shadow-glow transform md:hover:scale-[1.02] animate-slide-in-right`}
                  style={{animationDelay: '800ms'}}
                  role="region"
                  aria-label="Carbon Monoxide Relative Pollution Index"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Zap className={`w-6 h-6 mr-3 ${rpi ? rpi.textColor : 'text-gray-400'} animate-pulse-slow`} />
                      <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} transition-colors duration-300`}>CO Pollution</span>
                    </div>
                    {rpi ? (
                      <span className={`text-2xl font-bold ${rpi.textColor} transition-colors duration-300`}>
                        {rpi.rpi.toFixed(2)}
                        <span className={`text-sm font-medium ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>RPI</span>
                      </span>
                    ) : (
                      <span className={`text-lg font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>N/A</span>
                    )}
                  </div>

                  {rpi ? (
                    <>
                      {/* Status row with animated dot */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${rpi.dotColor}`} />
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${rpi.dotColor}`} />
                        </span>
                        <span className={`text-base font-semibold ${darkMode ? rpi.textColor : 'text-gray-700'}`}>{rpi.category}</span>
                      </div>
                      {/* Progress bar */}
                      <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5 shadow-inner-light`}>
                        <div
                          className={`h-2.5 rounded-full ${rpi.dotColor} transition-all duration-700`}
                          style={{ width: `${Math.min(100, (rpi.rpi / 4) * 100)}%` }}
                        />
                      </div>
                      {/* Scale labels */}
                      <div className={`flex justify-between mt-1.5 text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span>Clean</span><span>Normal</span><span>Moderate</span><span>Danger</span>
                      </div>
                    </>
                  ) : (
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No CO sensor data available</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AirQualityBar;

