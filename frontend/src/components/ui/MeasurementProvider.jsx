import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GetSettings, UpdateSettings } from '../../../wailsjs/go/main/App';

const MeasurementContext = createContext(undefined);

function normalizeMeasurementSystem(value) {
  return value === 'metric' ? 'metric' : 'imperial';
}

export function MeasurementProvider({ children }) {
  const [measurementSystem, setMeasurementSystemState] = useState('imperial');

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await GetSettings();
        setMeasurementSystemState(normalizeMeasurementSystem(settings?.measurementSystem));
      } catch {
        // Keep default when unavailable.
      }
    };

    void load();
  }, []);

  const setMeasurementSystem = async (nextValue) => {
    const normalized = normalizeMeasurementSystem(nextValue);
    const previous = measurementSystem;
    setMeasurementSystemState(normalized);
    try {
      const updated = await UpdateSettings({ measurementSystem: normalized, measurementConfirmed: true });
      return updated;
    } catch (error) {
      setMeasurementSystemState(previous);
      throw error;
    }
  };

  const value = useMemo(() => ({ measurementSystem, setMeasurementSystem }), [measurementSystem]);
  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

export function useMeasurement() {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error('useMeasurement must be used within MeasurementProvider');
  }
  return context;
}
