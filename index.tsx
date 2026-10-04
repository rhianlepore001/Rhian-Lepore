
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './design-system/tokens.css';
import './styles/tailwind.css';
import App from './App';
import { initAutoBugCapture } from './lib/autoBugCapture';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ErrorBoundary } from './components/ErrorBoundary';

const root = ReactDOM.createRoot(rootElement);

// Captura automática de erros de runtime → bug_reports (anti-spam embutido).
initAutoBugCapture();

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
