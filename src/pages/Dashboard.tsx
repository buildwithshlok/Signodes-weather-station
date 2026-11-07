import React, { useState } from 'react';
import { useNodes, NodeData } from '../context/NodesContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Thermometer, Droplets, Wind, Sun, AlertTriangle, Wifi, Zap, Info } from 'lucide-react';
import { formatSensorDate } from '../utils/dateUtils';
import SensorDetailsModal from '../components/common/SensorDetailsModal';
import DevModeBanner from '../components/common/DevModeBanner';
import NoDataBadge from '../components/common/NoDataBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateRPI } from '../utils/sensorCalibration';

const isValidData = (val: unknown): boolean => {
  return val !== null && val !== undefined && val !== 'N/A' && val !== '';
};

const getAqiColor = (aqi: number) => {
  if (aqi <= 50) return 'bg-signodes-100 text-signodes-800';
  if (aqi <= 100) return 'bg-signodes-200 text-signodes-800';
  if (aqi <= 150) return 'bg-signodes-300 text-signodes-800';
  if (aqi <= 200) return 'bg-signodes-400 text-signodes-800';
  if (aqi <= 300) return 'bg-signodes-500 text-signodes-800';
  return 'bg-signodes-600 text-signodes-800';
};

const getUvColor = (uvRisk: string) => {
  switch (uvRisk.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'very high': return 'bg-red-100 text-red-800';
    case 'extreme': return 'bg-purple-100 text-purple-800';
    case 'n/a': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const Dashboard: React.FC = () => {
  const { nodes, loading, error } = useNodes();
  const { darkMode } = useDarkMode();
  const [selectedSensor, setSelectedSensor] = useState<NodeData | null>(null);

  // Determine latest update across all nodes
  const latestUpdate = nodes
    ?.map(n => n.lastUpdated)
    ?.filter(Boolean)
    ?.sort()
    ?.reverse()[0];

  const isNodeOnline = (node: NodeData): boolean => {
    if (!node.lastUpdated || node.lastUpdated === 'N/A') return false;

    try {
      const lastUpdated = new Date(node.lastUpdated);
      if (isNaN(lastUpdated.getTime())) return false;

      const now = new Date();
      const OFFLINE_THRESHOLD_MS = 35 * 60 * 1000; // 35 min (enough for 2 cycles + margin)

      return (now.getTime() - lastUpdated.getTime()) < OFFLINE_THRESHOLD_MS;
    } catch {
      return false;
    }
  };

  if (loading && (!nodes || nodes.length === 0)) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-gray-100' : 'text-gray-700'}`}>
        Loading sensor data...
      </div>
    );
  }

  if (error && (!nodes || nodes.length === 0)) {
    return (
      <div className="text-center py-8 text-red-500">
        Error: {error.message}
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          No Sensor Data Available
        </h1>

        <p className={`${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>
          The dashboard is ready, but no sensor data has been received yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 py-6">

      <DevModeBanner useMockData={import.meta.env.VITE_USE_MOCK_DATA === 'true'} />

      {error && nodes.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>Connection interrupted ({error.message}). Displaying last verified sensor readings.</span>
        </div>
      )}

      {selectedSensor && (
       <SensorDetailsModal
       isOpen={!!selectedSensor}
       sensorData={{
        ...selectedSensor,
        lastUpdated: selectedSensor.lastUpdated || 'N/A',
        isOnline: isNodeOnline(selectedSensor),
        aqi: selectedSensor.aqi25val ?? undefined,
        temperature: selectedSensor.temperature ?? undefined,
        humidity: selectedSensor.humidity ?? undefined,
        pressure: selectedSensor.pressure ?? undefined,
        uvIndex: selectedSensor.uvIndex ?? undefined,
        mq_co: selectedSensor.mq_co ?? undefined,
        uvRisk: selectedSensor.uvRisk ?? undefined,
      }}
      onClose={() => setSelectedSensor(null)}
      darkMode={darkMode}
      />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">

        <h1 className={`text-3xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Campus Sensor Dashboard
        </h1>

        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
          Last updated: {latestUpdate ? formatSensorDate(latestUpdate) : 'Unknown'}
        </div>

      </div>

      {/* SENSOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <AnimatePresence>
        {nodes.map((node, index) => (

          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden ${darkMode ? 'bg-primary-900 border-primary-800 shadow-none hover:shadow-glow-accent' : 'bg-white border-gray-100 shadow-soft hover:shadow-lg'} p-5 sm:p-6 rounded-2xl border transition-shadow duration-300`}
          >

            {/* CARD HEADER */}
            <div className="flex justify-between mb-5">

              <div>

                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {node.name}
                </h2>

                <div className="flex items-center mt-1">

                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isNodeOnline(node) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <Wifi className="w-3 h-3 mr-1 inline" />
                    {isNodeOnline(node) ? 'Online' : 'Offline'}
                  </span>

                  <button
                    onClick={() => setSelectedSensor(node)}
                    className="ml-2 px-2 py-0.5 rounded-full text-xs bg-signodes-100 text-signodes-800"
                  >
                    <Info className="w-3 h-3 mr-1 inline" />
                    Details
                  </button>

                </div>

                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {node.location} Building
                </p>

              </div>

            </div>

            {/* SENSOR DATA / EMPTY STATE */}
            {node.temperature === null && node.humidity === null && node.aqi25val === null ? (
              <div className={`py-8 text-center rounded-xl border border-dashed my-3 ${darkMode ? 'border-primary-700/60 bg-primary-800/20' : 'border-gray-200 bg-gray-50'}`}>
                <Wifi className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Node Hardware Not Connected</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Telemetry channel pending deployment</p>
              </div>
            ) : (
            <div className="space-y-4">

              {/* TEMPERATURE */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Thermometer className="w-5 h-5 mr-2 text-signodes-500" />
                  <span>Temperature</span>
                </div>

                <span className="font-bold flex items-center">
                  {isValidData(node.temperature) ? `${node.temperature}°C` : (
                    <NoDataBadge />
                  )}
                </span>
              </div>

              {/* HUMIDITY */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Droplets className="w-5 h-5 mr-2 text-signodes-500" />
                  <span>Humidity</span>
                </div>

                <span className="font-bold flex items-center">
                  {isValidData(node.humidity) ? `${node.humidity}%` : (
                    <NoDataBadge />
                  )}
                </span>
              </div>

              {/* AIR QUALITY */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-signodes-500" />
                  <span>Air Quality</span>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${node.aqi25val === null
                  ? (darkMode ? 'bg-primary-800 text-transparent animate-pulse' : 'bg-gray-200 text-transparent animate-pulse')
                  : getAqiColor(Number(node.aqi25val) || 0)
                  }`}>
                  {node.aqi25val !== null ? `${node.aqi25val} µg/m³` : 'N/A'}
                </span>
              </div>

              {/* UV */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Sun className="w-5 h-5 mr-2 text-signodes-500" />
                  <span>UV Index</span>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs flex items-center ${node.uvRisk && node.uvRisk !== 'N/A' ? getUvColor(node.uvRisk) : (darkMode ? 'bg-primary-800 text-transparent animate-pulse' : 'bg-gray-200 text-transparent animate-pulse')}`}>
                  {isValidData(node.uvIndex) ? `${node.uvIndex} (${node.uvRisk || 'Low'})` : <NoDataBadge />}
                </span>
              </div>

              {/* CO + RPI */}
              <div className={`rounded-xl border px-3 py-2 mt-1 ${
                darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-signodes-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Carbon Monoxide</span>
                  </div>
                  <span className="font-bold text-sm flex items-center">
                    {isValidData(node.mq_co) ? `${node.mq_co}` : <NoDataBadge />}
                  </span>
                </div>
                {isValidData(node.mq_co) && (() => {
                  const rpi = calculateRPI(Number(node.mq_co));
                  return (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`relative flex h-2 w-2`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${rpi.dotColor}`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${rpi.dotColor}`} />
                          </span>
                          <span className={`text-xs font-medium ${darkMode ? rpi.textColor : 'text-gray-700'}`}>{rpi.category}</span>
                        </div>
                        <span className={`text-xs font-bold ${darkMode ? rpi.textColor : 'text-gray-900'}`}>RPI {rpi.rpi.toFixed(2)}</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                        <div
                          className={`h-1.5 rounded-full ${rpi.dotColor} transition-all duration-700`}
                          style={{ width: `${Math.min(100, (rpi.rpi / 4) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PRESSURE */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Wind className="w-5 h-5 mr-2 text-signodes-500" />
                  <span>Pressure</span>
                </div>

                <span className="font-bold flex items-center">
                  {isValidData(node.pressure) ? `${node.pressure} hPa` : (
                     <NoDataBadge />
                  )}
                </span>
              </div>

            </div>
            )}

              {/* FOOTER */}
              <div className={`pt-3 text-xs flex justify-between border-t ${darkMode ? 'text-white/70 border-primary-700' : 'text-gray-500 border-gray-200'}`}>
                <span>
                  {node.lastUpdated && node.lastUpdated !== 'N/A' ? `Last updated: ${formatSensorDate(node.lastUpdated)}` : (
                     <span className={`inline-block h-3 w-32 rounded animate-pulse ${darkMode ? 'bg-primary-800' : 'bg-gray-200'}`}></span>
                  )}
                </span>

                <Wifi className="w-4 h-4 text-signodes-500" />
              </div>

          </motion.div>

        ))}
        </AnimatePresence>

      </div>

    </div>
  );
};

export default Dashboard;