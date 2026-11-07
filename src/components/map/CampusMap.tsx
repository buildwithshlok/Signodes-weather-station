import React, { useState, useMemo, useEffect } from 'react';
import { useNodes } from '../../context/NodesContext';
import { Thermometer, Droplets, Wind, Gauge, CloudRain, Sun, Zap } from 'lucide-react';
import { getAQICategory, coToPollutionPercent, getCOPollutionCategory } from '../../utils/sensorCalibration';
import { useDarkMode } from '../../context/DarkModeContext';

interface NodeData {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  position: { top: string; left: string };
  temperature: string;
  humidity: string;
  rain: string;
  aqi25val: string;
  aqi10val: string;
  uvIndex: string;
  uvRisk: string;
  windSpeed?: string;
  lastUpdated: string;
  mq_co?: string;
}

const CampusMap: React.FC = () => {
  const { nodes: sensorNodes, loading, error } = useNodes();
  const { darkMode } = useDarkMode();
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Lock body scroll when modal is open so the page doesn't scroll behind it
  useEffect(() => {
    if (selectedNode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedNode]);

  // Map sensor nodes to the component's expected format
  const nodes: NodeData[] = useMemo(() => {
    if (!sensorNodes || sensorNodes.length === 0) return [];
    
    // Node positions on the map matching red circles
    const nodePositions = [
      { id: 'A', top: '28%', left: '40%', location: 'A Block - Academic Building' },
      { id: 'B', top: '55%', left: '47%', location: 'B Block - Academic Building' },
      { id: 'C', top: '63%', left: '74%', location: 'D Block - Academic Building' },
    ];

    return sensorNodes.map((node, index) => {
      const position = nodePositions[index % nodePositions.length] || { top: '28%', left: '40%', location: 'Unknown Location' };
      
      return {
        ...node,
        id: node.id || `node-${index}`,
        name: node.name || `Node ${String.fromCharCode(65 + index)}`,
        location: node.location || position.location,
        latitude: node.latitude || 28.6139,
        longitude: node.longitude || 77.2090,
        position: { top: position.top, left: position.left },
        temperature: String(node.temperature || 'N/A'),
        humidity: String(node.humidity || 'N/A'),
        rain: node.rain || 'No',
        aqi25val: String(node.aqi25val || 'N/A'),
        aqi10val: String(node.aqi10val || 'N/A'),
        uvIndex: String(node.uvIndex || 'N/A'),
        uvRisk: node.uvRisk || 'N/A',
        // SensorData may not include windSpeed; access defensively
        windSpeed: 'windSpeed' in node ? String((node as Record<string, unknown>).windSpeed) : 'N/A',
        // Include CO value
        mq_co: String(node.mq_co || 'N/A'),
        lastUpdated: node.lastUpdated || new Date().toISOString()
      };
    });
  }, [sensorNodes]);

  // Helper function to get AQI color
  const getAqiColor = (aqi: string) => {
    const value = parseInt(aqi) || 0;
    const aqiInfo = getAQICategory(value);
    return `text-${aqiInfo.textColor.replace('text-', '')}`;
  };

  // Helper function to get UV color
  const getUvColor = (uvRisk: string | undefined) => {
    if (!uvRisk) return 'text-gray-500';
    switch(uvRisk.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'very high': return 'text-red-600';
      case 'extreme': return 'text-purple-600';
      default: return 'text-gray-500';
    }
  };

  // Helper function to calculate UV risk level based on 0-100 scale
  const calculateUvRisk = (uvIndex: number): string => {
    if (uvIndex <= 20) return 'Low';
    if (uvIndex <= 40) return 'Moderate';
    if (uvIndex <= 60) return 'High';
    if (uvIndex <= 80) return 'Very High';
    return 'Extreme';
  };

  if (loading) {
    return (
      <section 
        className={`py-16 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`} 
        aria-labelledby="campus-map-heading"
        role="region"
      >
        <div className="container mx-auto px-4 text-center py-16">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${darkMode ? 'border-sky-400' : 'border-sky-600'} mx-auto`}></div>
          <p className={`mt-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading sensor data...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section 
        className={`py-16 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}
        role="region"
        aria-label="Error loading campus map"
      >
        <div className="container mx-auto px-4">
          <div className={`${darkMode ? 'bg-rose-900/30 border-l-4 border-rose-700' : 'bg-rose-50 border-l-4 border-rose-400'} p-4 rounded`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${darkMode ? 'text-rose-500' : 'text-rose-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className={`text-sm ${darkMode ? 'text-rose-400' : 'text-rose-700'}`} role="alert">
                  Error loading sensor data: {error.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="campus-overview"
      className={`py-16 ${darkMode ? 'bg-slate-900/50 text-slate-100 relative' : 'bg-slate-50 text-slate-900 relative'}`}
      role="region"
      aria-labelledby="campus-map-heading"
    >
      <div className={`absolute inset-0 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-200'} pointer-events-none`}></div>
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 id="campus-map-heading" className={`text-3xl md:text-4xl tracking-tight font-bold border-l-4 ${darkMode ? 'border-sky-500 text-slate-100' : 'border-sky-600 text-slate-900'} pl-4 inline-block mb-3 md:mb-4`}>
            Campus Map
          </h2>
          <p className={`text-base md:text-lg transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto`}>
             Interactive site perspective of connected active and inactive sensor units
          </p>
        </div>

        {/* Campus Map */}
        <div className={`${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} rounded-2xl shadow-xl p-8 transition-all duration-300 relative overflow-hidden`} style={{ backdropFilter: 'blur(12px)' }} role="region" aria-label="Interactive campus map with sensor locations">
           {/* Top styling bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${darkMode ? 'from-emerald-500/0 via-emerald-500 to-emerald-500/0' : 'from-slate-300/0 via-slate-300 to-slate-300/0'} opacity-50`}></div>
           
          <div className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-100'} rounded-xl h-96 flex items-center justify-center relative overflow-hidden border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
            {/* Campus Map Image */}
            <img 
              src="/mapimage.jpeg" 
              alt="NIET Campus Map showing buildings and grounds" 
              className={`w-full h-full object-cover rounded-xl ${darkMode ? 'opacity-50 saturate-50' : 'opacity-80'}`}
            />
            
            {/* Node markers */}
            {nodes.map((node, index) => (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-signodes-400 focus:ring-offset-2 rounded-full"
                style={{ top: node.position.top, left: node.position.left }}
                aria-label={`View ${node.name} details at ${node.location}`}
                aria-expanded={selectedNode?.id === node.id ? "true" : "false"}
              >
                <div className="relative flex items-center justify-center">
                  {/* Pulse effect for active nodes */}
                  {index === 0 && (
                    <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 inline-flex h-full w-full"></div>
                  )}
                  <div className={`relative z-10 w-6 h-6 rounded-full border-2 ${darkMode ? 'border-slate-900' : 'border-white'} shadow-lg ${
                    index === 0 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]' : 'bg-slate-500 opacity-60'
                  }`}>
                  </div>
                  <div className={`absolute top-full mt-2 ${darkMode ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-md'} px-3 py-1.5 rounded-lg border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20`}>
                    <div className={`text-xs font-bold tracking-wide ${index === 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-slate-400' : 'text-slate-600')}`}>
                      {node.name}
                    </div>
                    <div className={`text-[10px] font-medium uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {index === 0 ? 'Active' : 'Offline'}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {nodes.length >= 2 && (
                <line 
                  x1="30%" y1="38%" 
                  x2="43%" y2="50%" 
                  stroke="rgba(34, 197, 94, 0.3)" 
                  strokeWidth="2" 
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
              )}
              {nodes.length >= 3 && (
                <>
                  <line 
                    x1="30%" y1="38%" 
                    x2="74%" y2="54%" 
                    stroke="rgba(34, 197, 94, 0.3)" 
                    strokeWidth="2" 
                    strokeDasharray="5,5"
                    className="animate-pulse"
                  />
                  <line 
                    x1="43%" y1="50%" 
                    x2="74%" y2="54%" 
                    stroke="rgba(156, 163, 175, 0.3)" 
                    strokeWidth="2" 
                    strokeDasharray="5,5"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {selectedNode && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] md:p-4" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="node-details-title"
            onClick={() => setSelectedNode(null)}
          >
            <div 
              className={`${darkMode ? 'bg-slate-800 md:border md:border-slate-700' : 'bg-white md:border md:border-slate-200'} rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-2xl max-w-md w-full max-h-[75vh] md:max-h-[90vh] overflow-y-auto transform transition-transform duration-300`}
              onClick={(e) => e.stopPropagation()}
            >
               {/* Mobile Drag Indicator */}
               <div className="flex justify-center pt-3 pb-1 md:hidden">
                 <div className={`w-12 h-1.5 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
               </div>
               {/* Desktop Green Accent Line */}
               <div className={`h-2 ${darkMode ? 'bg-emerald-500' : 'bg-emerald-500'} hidden md:block`}></div>
              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 id="node-details-title" className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{selectedNode.name}</h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className={`${darkMode ? 'text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'} h-8 w-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    aria-label="Close details"
                  >
                    ×
                  </button>
                </div>
                
                <div className="mb-6">
                  <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedNode.location}</p>
                  <p className={`${darkMode ? 'text-slate-500' : 'text-slate-500'} text-xs uppercase tracking-wider mt-1`}>Pos: {selectedNode.latitude}°N, {selectedNode.longitude}°E</p>
                </div>
                
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-rose-900/10 border-rose-800/30' : 'bg-rose-50 border-rose-100'}`} role="group" aria-label="Temperature reading">
                    <div className="flex items-center space-x-3">
                      <Thermometer className={`w-5 h-5 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>Temperature</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedNode.temperature === 'N/A' ? 'N/A' : `${selectedNode.temperature}°C`}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-sky-900/10 border-sky-800/30' : 'bg-sky-50 border-sky-100'}`} role="group" aria-label="Humidity reading">
                    <div className="flex items-center space-x-3">
                      <Droplets className={`w-5 h-5 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-sky-400' : 'text-sky-700'}`}>Humidity</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedNode.humidity === 'N/A' ? 'N/A' : `${selectedNode.humidity}%`}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-indigo-900/10 border-indigo-800/30' : 'bg-indigo-50 border-indigo-100'}`} role="group" aria-label="Rain status">
                    <div className="flex items-center space-x-3">
                      <CloudRain className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider block ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Rain Status</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedNode.rain}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-purple-900/10 border-purple-800/30' : 'bg-purple-50 border-purple-100'}`} role="group" aria-label="Wind speed reading">
                    <div className="flex items-center space-x-3">
                      <Wind className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>Wind Speed</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedNode.windSpeed === 'N/A' ? 'N/A' : `${selectedNode.windSpeed} km/h`}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`} role="group" aria-label="PM2.5 air quality reading">
                    <div className="flex items-center space-x-3">
                      <Gauge className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>PM2.5</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-emerald-400' : getAqiColor(selectedNode.aqi25val)}`}>
                      {selectedNode.aqi25val} µg/m³
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`} role="group" aria-label="PM10 air quality reading">
                    <div className="flex items-center space-x-3">
                      <Gauge className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>PM10</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-emerald-400' : getAqiColor(selectedNode.aqi10val)}`}>
                      {selectedNode.aqi10val} µg/m³
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-yellow-900/10 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`} role="group" aria-label="UV index reading">
                    <div className="flex items-center space-x-3">
                      <Sun className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>UV Index</span>
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-yellow-400' : getUvColor(typeof selectedNode.uvIndex === 'number' ? calculateUvRisk(selectedNode.uvIndex) : selectedNode.uvRisk)}`}>
                      {selectedNode.uvIndex} {typeof selectedNode.uvIndex === 'number' ? `(${calculateUvRisk(selectedNode.uvIndex)})` : selectedNode.uvRisk && `(${selectedNode.uvRisk})`}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-rose-900/10 border-rose-800/30' : 'bg-rose-50 border-rose-100'}`} role="group" aria-label="Carbon monoxide reading">
                    <div className="flex items-center space-x-3">
                      <Zap className={`w-5 h-5 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                      <span className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>CO Index</span>
                    </div>
                    {selectedNode.mq_co && selectedNode.mq_co !== 'N/A' ? (() => {
                      const pct = coToPollutionPercent(Number(selectedNode.mq_co));
                      const cat = getCOPollutionCategory(pct);
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${cat.dotColor} flex-shrink-0`} />
                          <span className={`text-lg font-bold tracking-tight ${darkMode ? cat.textColor : 'text-slate-900'}`}>
                            {pct.toFixed(1)}%
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>({cat.label})</span>
                        </div>
                      );
                    })() : <span className="text-lg font-bold text-slate-400">N/A</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CampusMap;
