import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { MeasurementProvider } from './components/ui/MeasurementProvider';
import { ToastProvider } from './components/ui/Toast';
import { LicenseProvider } from './components/ui/LicenseProvider';

const container = document.getElementById('root');

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <MeasurementProvider>
        <ToastProvider>
          <LicenseProvider>
            <App />
          </LicenseProvider>
        </ToastProvider>
      </MeasurementProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
