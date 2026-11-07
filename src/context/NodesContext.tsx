import React, { useContext, useEffect, useState, useCallback } from 'react';
import { fetchRecentSensorData } from '../services/googleSheetsService';
import { NodesContext } from './nodes.context';
import { NodeData, NodesContextType } from './nodes.types';
import { getSimulatedPressure } from '../utils/simulatedPressure';
import { estimateRainFromHumidity } from '../utils/rainEstimation';
export type { NodeData };

export const NodesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize fetchData to prevent unnecessary interval recreations
  const fetchData = useCallback(async () => {
    let mounted = true;

    try {
      // Only show full loading state if we have no prior node readings
      setNodes((current) => {
        if (!current || current.length === 0) {
          setLoading(true);
        }
        return current;
      });

      // Fetch only the single latest row (readrange1) to save maximum bandwidth
      const sensorData = await fetchRecentSensorData(1);

      if (!mounted) return;

      if (sensorData && sensorData.length > 0) {
        // Use the most recent reading for Node A
        const latest = sensorData[sensorData.length - 1];

        // Create Node A with actual data (live pressure simulated & rain estimated from DHT humidity)
        const nodeA: NodeData = {
          ...latest,
          id: 'node-A',
          name: 'Node A',
          location: latest.location || 'Block A',
          pressure: getSimulatedPressure(latest.lastUpdated),
          rain: estimateRainFromHumidity(latest.humidity),
        };

        // Create Nodes B and C with current data (empty placeholders)
        // These can be updated when more sensors are available
        const createEmptyNode = (letter: string): NodeData => ({
          id: `node-${letter}`,
          name: `Node ${letter}`,
          location: `Block ${letter}`,
          latitude: null,
          longitude: null,
          temperature: null,
          pressure: null,
          humidity: null,
          aqi25val: null,
          aqi10val: null,
          uvIndex: null,
          uvRisk: 'N/A',
          rain: 'Unknown',
          mq_co: null,
          lastUpdated: 'N/A',
        });

        const nodeB = createEmptyNode('B');
        const nodeC = createEmptyNode('C');

        setNodes([nodeA, nodeB, nodeC]);
        setError(null);
      } else {
        setError(new Error('No recent data found in Google Sheets'));
        // Preserve prior valid state on empty response
        setNodes((prevNodes) => (prevNodes && prevNodes.length > 0 ? prevNodes : []));
      }
    } catch (error) {
      if (!mounted) return;

      // Only log app-safe error messages
      if (error instanceof Error) {
        console.error('Error fetching sensor data:', error.message);
      }

      setError(
        error instanceof Error
          ? error
          : new Error('Failed to fetch sensor data')
      );
      // Requirement 3: Preserve last valid readings if API fails
      setNodes((prevNodes) => (prevNodes && prevNodes.length > 0 ? prevNodes : []));
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    // Return cleanup function to prevent state updates on unmounted component
    return () => {
      mounted = false;
    };
  }, []);

  // Set up initial data fetch and polling
  useEffect(() => {
    // Perform initial fetch
    fetchData();

    // Set up polling every 15 minutes (900000 ms) - synced with hardware data upload
    const intervalId = setInterval(() => {
      fetchData().catch((err) => {
        console.error('Polling error:', err);
      });
    }, 900000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData]);

  return (
    <NodesContext.Provider value={{ nodes, loading, error }}>
      {children}
    </NodesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNodes = (): NodesContextType => {
  const context = useContext(NodesContext);
  return context;
};
