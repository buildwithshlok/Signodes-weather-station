import React, { useEffect } from 'react';
import { X, Wifi, Clock, Thermometer, Droplets, Wind, Gauge, Sun, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSensorDate } from '../../utils/dateUtils';

interface SensorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensorData: {
    id: string;
    name: string;
    location: string;
    isOnline: boolean;
    lastUpdated: string;
    temperature?: number | string;
    humidity?: number | string;
    pressure?: number | string;
    aqi?: number | string;
    uvIndex?: number | string;
    uvRisk?: string;
    mq_co?: number | string;
  } | null;
  darkMode?: boolean;
}

const SensorDetailsModal: React.FC<SensorDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  sensorData, 
  darkMode = false 
}) => {
  // Hook must be called unconditionally (before any early return)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !sensorData) return null;

  const lastReadingTime = sensorData.lastUpdated && sensorData.lastUpdated !== 'N/A' 
    ? formatSensorDate(sensorData.lastUpdated).replace('Updated ', '')
    : 'Waiting for signal...';

  return (
    <AnimatePresence>
      {isOpen && sensorData && (
        <div 
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sensor-details-title"
        >
          {/* Backdrop with blur effect */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Modal content with bottom-sheet capabilities on mobile */}
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${darkMode ? 'bg-primary-900/95 backdrop-blur-xl border-t sm:border border-primary-800' : 'bg-white/95 backdrop-blur-xl border-t sm:border border-gray-200'} pb-6 sm:pb-0`}
          >
            {/* Mobile drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className={`w-12 h-1.5 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            </div>

            {/* Header with status pill */}
            <div className="p-6 pb-0 pt-2 sm:pt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 
              id="sensor-details-title" 
              className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}
            >
              {sensorData.name}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${darkMode ? 'bg-primary-800 text-white/70 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'} focus:outline-none focus:ring-2 focus:ring-signodes-500`}
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mb-6">
            <span 
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${sensorData.isOnline ? (darkMode ? 'bg-green-900/50 text-white' : 'bg-green-100 text-green-800') : (darkMode ? 'bg-red-900/50 text-white' : 'bg-red-100 text-red-800')}`}
            >
              <Wifi className="w-4 h-4 mr-1" />
              {sensorData.isOnline ? 'Online' : 'Offline'}
            </span>
            <span className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4 inline mr-1" />
              {lastReadingTime}
            </span>
          </div>
        </div>
        
        {/* Sensor data details */}
        <div className="p-6 pt-0">
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
            {/* Location */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex justify-between items-center p-3 rounded-lg mb-2 border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <span className="font-medium">Location</span>
                <span>{sensorData.location}</span>
              </div>
            </div>
            
            {/* Temperature */}
            {sensorData.temperature && (
              <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Thermometer className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">Temperature</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>{sensorData.temperature}°C</span>
              </div>
            )}
            
            {/* Humidity */}
            {sensorData.humidity && (
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Droplets className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">Humidity</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>{sensorData.humidity}%</span>
              </div>
            )}
            
            {/* Pressure */}
            {sensorData.pressure && (
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Wind className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">Pressure</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>{sensorData.pressure} hPa</span>
              </div>
            )}
            
            {/* AQI */}
            {sensorData.aqi && (
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Gauge className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">Air Quality</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>{sensorData.aqi} µg/m³</span>
              </div>
            )}
            
            {/* UV Index */}
            {sensorData.uvIndex && (
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Sun className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">UV Index</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>
                  {sensorData.uvIndex} {sensorData.uvRisk && `(${sensorData.uvRisk})`}
                </span>
              </div>
            )}
            
            {/* CO Level */}
            {sensorData.mq_co && (
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-primary-700 bg-white dark:bg-primary-800/50">
                <div className="flex items-center">
                  <Zap className={`w-5 h-5 mr-2 ${darkMode ? 'text-signodes-500' : 'text-signodes-500'}`} />
                  <span className="font-medium">CO Level</span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-signodes-500'}`}>
                  {(() => {
                    const pct = Math.min(100, Math.max(0, Number(sensorData.mq_co)));
                    const cats = ['Very Clean','Normal','Moderate Pollution','High Pollution','Dangerous'];
                    const label = pct < 25 ? cats[0] : pct < 50 ? cats[1] : pct < 75 ? cats[2] : pct < 90 ? cats[3] : cats[4];
                    return `${pct.toFixed(1)}% (${label})`;
                  })()}
                </span>
              </div>
            )}
          </div>
          
          {/* Footer with action buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-primary-800 text-white/70 hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
            >
              Close
            </button>
            <button 
              className={`px-4 py-2 rounded-lg bg-signodes-500 text-white hover:bg-signodes-600 transition-colors`}
            >
              View History
            </button>
          </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SensorDetailsModal;