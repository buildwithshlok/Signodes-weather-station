import React from 'react';
import { Thermometer, Droplets, Wind, Gauge, Sun, CloudRain, MapPin } from 'lucide-react';
import { NodeData } from '../../context/NodesContext';
import { normalizeUVIndex, getAirQualityCategory } from '../../utils/sensorCalibration';
import { useDarkMode } from '../../context/DarkModeContext';
import NoDataBadge from '../common/NoDataBadge';
import RPIWidget from './RPIWidget';

const renderValue = (val: unknown, suffix: string = '') => {
  if (val === null || val === undefined || val === 'N/A' || val === 0) {
    return <NoDataBadge />;
  }
  return <>{val}{suffix}</>;
};

interface SensorNodeInfoProps {
  node: NodeData;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode; darkMode?: boolean }> = ({ label, value, darkMode = false }) => (
  <div className="flex items-center justify-between py-2">
    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
    <span className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{value}</span>
  </div>
);

const SensorNodeInfo: React.FC<SensorNodeInfoProps> = ({ node }) => {
  const { darkMode } = useDarkMode();
  
  if (!node) return null;

  // Air quality category based directly on genuine PM2.5 (0-800 scale)
  const aqiInfo = getAirQualityCategory(Number(node.aqi25val || 0));
  
  // Normalize UV index to percentage
  const uvPercentage = normalizeUVIndex(Number(node.uvIndex || 0));

  return (
    <div className={`${darkMode ? 'bg-primary-800 border-primary-700' : 'bg-white border-gray-100'} rounded-2xl shadow-xl border overflow-hidden transition-colors duration-300`}>
      <div className={`p-5 border-b ${darkMode ? 'border-primary-700' : 'border-gray-200'} flex items-start justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${darkMode ? 'text-signodes-400' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{node.name || 'Sensor Node'}</h3>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'} mt-1`}>{node.location || 'Unknown location'}</p>
        </div>
        <div className="text-right">
          <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>PM2.5</div>
          <div className={`text-2xl font-bold ${aqiInfo.textColor}`}>{node.aqi25val !== null && node.aqi25val !== undefined ? `${node.aqi25val} µg/m³` : 'N/A'}</div>
          <div className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{aqiInfo.category}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5">
        <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50'} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'} font-semibold`}>
            <Thermometer className="w-4 h-4" /> Temperature
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'} mt-1 flex items-center`}>
            {renderValue(node.temperature, '°C')}
          </div>
        </div>
        <div className={`${darkMode ? 'bg-cyan-900/30 border border-cyan-800/50' : 'bg-cyan-50'} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'} font-semibold`}>
            <Droplets className="w-4 h-4" /> Humidity
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'} mt-1 flex items-center`}>
            {renderValue(node.humidity, '%')}
          </div>
        </div>
        <div className={`${darkMode ? 'bg-indigo-900/30 border border-indigo-800/50' : 'bg-indigo-50'} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-700'} font-semibold`}>
            <Wind className="w-4 h-4" /> Pressure
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'} mt-1 flex items-center`}>
            {renderValue(node.pressure, ' hPa')}
          </div>
        </div>
        <div className={`${darkMode ? 'bg-amber-900/30 border border-amber-800/50' : 'bg-amber-50'} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'} font-semibold`}>
            <Gauge className="w-4 h-4" /> PM 2.5 / PM 10
          </div>
          <div className={`text-xl font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'} mt-1`}>{node.aqi25val ? `${node.aqi25val} µg/m³` : 'N/A'} / {node.aqi10val ? `${node.aqi10val} µg/m³` : 'N/A'}</div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className={`${darkMode ? 'bg-green-900/30 border border-green-800/50' : 'bg-green-50'} rounded-xl p-3`}>
            <div className={`flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'} font-semibold`}>
              <CloudRain className="w-4 h-4" /> Rain
            </div>
            <div className={`text-base font-bold ${darkMode ? 'text-green-300' : 'text-green-700'} mt-1 flex items-center`}>
              {renderValue(node.rain)}
            </div>
          </div>
          <div className={`${darkMode ? 'bg-yellow-900/30 border border-yellow-800/50' : 'bg-yellow-50'} rounded-xl p-3`}>
            <div className={`flex items-center gap-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'} font-semibold`}>
              <Sun className="w-4 h-4" /> UV Index
            </div>
            <div className={`text-base font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-700'} mt-1`}>
              {renderValue(node.uvIndex)}
              {node.uvIndex !== null && node.uvIndex !== undefined && node.uvIndex !== 0 && (
                <>
                  <div className="flex items-center mt-1">
                    <div className={`h-1.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full w-full`}>
                      <div 
                        className={`h-1.5 ${darkMode ? 'bg-yellow-400' : 'bg-yellow-500'} rounded-full`} 
                        style={{ width: `${uvPercentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{uvPercentage}%</span>
                  </div>
                  {node.uvRisk && <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>({node.uvRisk})</span>}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* CO Sensor + Relative Pollution Index */}
        <RPIWidget sensorValue={node.mq_co} />

        <div className={`mt-4 rounded-xl border ${darkMode ? 'border-primary-700 bg-primary-700/30' : 'border-gray-100'} p-4`}>
          <InfoRow label="Last updated" value={node.lastUpdated ? new Date(node.lastUpdated).toLocaleString() : 'Unknown'} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
};

export default SensorNodeInfo;
