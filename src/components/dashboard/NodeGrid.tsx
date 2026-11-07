import React, { useState } from 'react';
import { useNodes, NodeData } from '../../context/NodesContext';
import { Server, AlertCircle, ChevronDown, ChevronUp, Navigation, Activity } from 'lucide-react';
import { Thermometer, Droplets, Gauge, CloudRain, Sun, MapPin, Calendar, AlertTriangle } from 'lucide-react'; 
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  formatTemperatureWithBounds, 
  formatHumidityWithBounds, 
  formatPressureWithBounds, 
  formatUVIndexWithBounds, 
  formatCoordinateCompact
} from '../../utils/sensorFormatting';
import { coToPollutionPercent, getCOPollutionCategory } from '../../utils/sensorCalibration';

interface NodeCardProps {
  node: NodeData;
  isActive: boolean;
  onToggle: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, isActive, onToggle }) => {
  const { darkMode } = useDarkMode();
  
  // Determine if node is online based on lastUpdated
  const isOnline = node.lastUpdated && node.lastUpdated !== 'N/A' ? (() => {
    try {
      const lastUpdated = new Date(node.lastUpdated.replace('_', 'T'));
      const now = new Date();
      const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
      return (now.getTime() - lastUpdated.getTime()) < OFFLINE_THRESHOLD_MS;
    } catch {
      return false;
    }
  })() : false;
  
  const getStatusColor = () => {
    return isOnline ? 'text-green-500' : 'text-gray-400';
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'Unknown';
    
    try {
      // Handle different date formats
      let formattedDate = dateString;
      
      // Convert format from "2025-09-01_16:21:38" to "2025-09-01T16:21:38"
      if (dateString.includes('_')) {
        formattedDate = dateString.replace('_', 'T');
      }
      
      const date = new Date(formattedDate);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // Try alternative parsing for different formats
        const parts = dateString.split(/[_\s\-:]/g).filter(Boolean);
        if (parts.length >= 6) {
          const [year, month, day, hour, minute, second] = parts;
          const altDate = new Date(
            parseInt(year), 
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
          if (!isNaN(altDate.getTime())) {
            return altDate.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }
        }
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
  };

  return (
    <div 
      className={`relative overflow-hidden ${darkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-slate-200'} rounded-2xl shadow-lg transition-all duration-300 border ${isActive ? 'ring-2 ring-sky-500 shadow-sky-900/20' : 'hover:shadow-xl hover:-translate-y-1'}`}
      style={{ backdropFilter: 'blur(12px)' }}
      role="article"
      aria-labelledby={`node-title-${node.id}`}
    >
      {/* Node Status Top Border Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${isOnline ? 'from-emerald-500/0 via-emerald-500 to-emerald-500/0' : 'from-slate-500/0 via-slate-500 to-slate-500/0'}`}></div>

      {/* Header */}
      <div 
        className="p-5 cursor-pointer flex justify-between items-center focus:outline-none"
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        tabIndex={0}
        role="button"
        aria-expanded={isActive}
        aria-controls={`node-content-${node.id}`}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl border ${isOnline ? (darkMode ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200') : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
            <Server className={`w-6 h-6 ${getStatusColor()}`} />
          </div>
          <div>
            <h3 id={`node-title-${node.id}`} className={`font-semibold text-lg tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{node.name || 'Unnamed Node'}</h3>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{node.location || 'Location not specified'}</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center mr-3">
             <div 
                className={`w-2 h-2 rounded-full mr-2 ${isOnline ? (darkMode ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-emerald-500') : 'bg-slate-500'} ${isOnline ? 'animate-pulse' : ''}`}
             ></div>
             <span className={`text-xs font-semibold uppercase tracking-wider ${isOnline ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
               {isOnline ? 'Active' : 'Offline'}
             </span>
          </div>
          <div className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            {isActive ? 
              <ChevronUp className="w-5 h-5" /> : 
              <ChevronDown className="w-5 h-5" />
            }
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isActive && (
        <div id={`node-content-${node.id}`} className="px-5 pb-6 space-y-5 animate-slide-up" style={{ animationDuration: '0.3s' }}>
          {node.temperature === null && node.humidity === null && node.aqi25val === null ? (
            <div className={`p-6 text-center rounded-xl border border-dashed my-2 ${darkMode ? 'border-slate-700 bg-slate-900/40 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
              <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">Node Hardware Pending Deployment</p>
              <p className="text-xs mt-1">This node is reserved for future campus telemetry deployment.</p>
            </div>
          ) : (
            <>
          {/* Node Information */}
          <div 
            className={`rounded-xl p-4 space-y-3 border ${darkMode ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}
            role="group"
            aria-label="Node information"
          >
            <div className={`flex items-center text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <MapPin className={`w-4 h-4 mr-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex-shrink-0`} />
              <span className="truncate">Location: {node.location || 'N/A'}</span>
            </div>
            {(node.latitude && node.longitude) && (
              <div className={`flex items-center text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Navigation className={`w-4 h-4 mr-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex-shrink-0`} />
                <span>Coordinates: <span className="font-mono bg-slate-800/50 px-1.5 py-0.5 rounded text-xs">{formatCoordinateCompact(node.latitude)}, {formatCoordinateCompact(node.longitude)}</span></span>
              </div>
            )}
            <div className={`flex items-center text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <Calendar className={`w-4 h-4 mr-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex-shrink-0`} />
              <span>Last Updated: <span className="font-medium text-slate-200">{node.lastUpdated ? formatDate(node.lastUpdated) : 'N/A'}</span></span>
            </div>
          </div>

          {/* Environmental Data Grid */}
          <div 
            className="grid grid-cols-2 gap-4" 
            role="group" 
            aria-label="Environmental data readings"
          >
            {/* Temperature */}
            <div 
              className={`${darkMode ? 'bg-rose-900/20 border-rose-800/40' : 'bg-rose-50 border-rose-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-rose-900/30`}
              role="group"
              aria-label="Temperature reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-rose-400' : 'text-rose-600'} mb-2`}>
                <Thermometer className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">Temperature</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.temperature !== undefined && node.temperature !== null ? `${formatTemperatureWithBounds(node.temperature)}°C` : 'N/A'}
              </div>
            </div>

            {/* Humidity */}
            <div 
              className={`${darkMode ? 'bg-sky-900/20 border-sky-800/40' : 'bg-sky-50 border-sky-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-sky-900/30`}
              role="group"
              aria-label="Humidity reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-sky-400' : 'text-sky-600'} mb-2`}>
                <Droplets className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">Humidity</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.humidity !== undefined && node.humidity !== null ? `${formatHumidityWithBounds(node.humidity)}%` : 'N/A'}
              </div>
            </div>

            {/* Air Pressure */}
            <div 
              className={`${darkMode ? 'bg-indigo-900/20 border-indigo-800/40' : 'bg-indigo-50 border-indigo-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-indigo-900/30`}
              role="group"
              aria-label="Air pressure reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'} mb-2`}>
                <Gauge className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">Air Pressure</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.pressure !== undefined && node.pressure !== null ? `${formatPressureWithBounds(node.pressure)} hPa` : 'N/A'}
              </div>
            </div>

            {/* Rain Status */}
            <div 
              className={`${darkMode ? 'bg-indigo-900/20 border-indigo-800/40' : 'bg-slate-100 border-slate-200'} rounded-xl p-4 border transition-colors duration-300 hover:bg-indigo-900/30`}
              role="group"
              aria-label="Rain status reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-indigo-400' : 'text-slate-600'} mb-2`}>
                <CloudRain className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">Rain Status</span>
              </div>
              <div className={`text-2xl font-bold capitalize ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.rain || 'N/A'}
              </div>
            </div>

            {/* PM2.5 */}
            <div 
              className={`${darkMode ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-emerald-900/30`}
              role="group"
              aria-label="PM2.5 particulate matter reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} mb-2`}>
                <Activity className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">PM2.5</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.aqi25val !== undefined && node.aqi25val !== null ? `${node.aqi25val} µg/m³` : 'N/A'}
              </div>
            </div>

            {/* PM10 */}
            <div 
              className={`${darkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-amber-900/30`}
              role="group"
              aria-label="PM10 particulate matter reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-amber-400' : 'text-amber-600'} mb-2`}>
                <Activity className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">PM10</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.aqi10val !== undefined && node.aqi10val !== null ? `${node.aqi10val} µg/m³` : 'N/A'}
              </div>
            </div>

            {/* UV Index */}
            <div 
              className={`${darkMode ? 'bg-yellow-900/20 border-yellow-800/40' : 'bg-yellow-50 border-yellow-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-yellow-900/30`}
              role="group"
              aria-label="UV index reading"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mb-2`}>
                <Sun className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">UV Index</span>
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                {node.uvIndex !== undefined && node.uvIndex !== null ? formatUVIndexWithBounds(node.uvIndex) : 'N/A'} <span className="text-sm font-normal text-slate-400 ml-1">{node.uvRisk && `(${node.uvRisk})`}</span>
              </div>
            </div>

            {/* Carbon Monoxide Pollution Index */}
            <div 
              className={`${darkMode ? 'bg-rose-900/20 border-rose-800/40' : 'bg-rose-50 border-rose-100'} rounded-xl p-4 border transition-colors duration-300 hover:bg-rose-900/30`}
              role="group"
              aria-label="Carbon monoxide pollution index"
              tabIndex={0}
            >
              <div className={`flex items-center space-x-2.5 ${darkMode ? 'text-rose-400' : 'text-rose-600'} mb-2`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider truncate">CO Index</span>
              </div>
              {node.mq_co !== undefined && node.mq_co !== null ? (() => {
                const pct = coToPollutionPercent(Number(node.mq_co));
                const cat = getCOPollutionCategory(pct);
                return (
                  <>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                      {pct.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1`}>
                      <span className={`w-2 h-2 rounded-full ${cat.dotColor} inline-block`} />
                      <span className={`text-xs ${darkMode ? cat.textColor : 'text-slate-600'}`}>{cat.label}</span>
                    </div>
                  </>
                );
              })() : <div className="text-2xl font-bold text-slate-500">N/A</div>}
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

const NodeGrid: React.FC = () => {
  // Call all hooks at the top (before any conditional returns)
  const { nodes: sensorNodes, loading, error } = useNodes();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const { darkMode } = useDarkMode();

  // Map sensor nodes to our format
  const networkNodes = [
    {
      ...(sensorNodes[0] || {}),
      id: sensorNodes[0]?.id || 'node-a',
      name: sensorNodes[0]?.name || 'Node A',
      location: sensorNodes[0]?.location || 'Block A - Main Building',
      lastUpdated: sensorNodes[0]?.lastUpdated || new Date().toISOString()
    },
    {
      ...(sensorNodes[1] || {}),
      id: sensorNodes[1]?.id || 'node-b',
      name: sensorNodes[1]?.name || 'Node B',
      location: sensorNodes[1]?.location || 'Block B - Library',
      lastUpdated: sensorNodes[1]?.lastUpdated || new Date().toISOString()
    },
    {
      ...(sensorNodes[2] || {}),
      id: sensorNodes[2]?.id || 'node-c',
      name: sensorNodes[2]?.name || 'Node C',
      location: sensorNodes[2]?.location || 'Block D - Cafeteria',
      lastUpdated: sensorNodes[2]?.lastUpdated || new Date().toISOString()
    }
  ];

  const toggleNode = (nodeId: string) => {
    setExpandedNode(expandedNode === nodeId ? null : nodeId);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-gray-600">Loading node information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading node data: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <section 
      id="network-status"
      className={`py-16 ${darkMode ? 'bg-slate-900/50 text-slate-100 relative' : 'bg-slate-50 text-slate-900 relative'}`}
      role="region"
      aria-labelledby="sensor-network-title"
    >
      <div className={`absolute inset-0 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-200'} pointer-events-none`}></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 id="sensor-network-title" className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'} mb-3`}>Campus Sensor Network</h2>
          <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto`}>
            Interactive overview of all sensor nodes across the NIET campus. Click a node to view its detailed environmental readings.
          </p>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="list"
          aria-label="Sensor nodes"
        >
          {networkNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node as NodeData}
              isActive={expandedNode === node.id}
              onToggle={() => toggleNode(node.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NodeGrid;
