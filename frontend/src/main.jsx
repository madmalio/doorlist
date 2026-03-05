import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';

const container = document.getElementById('root');

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
