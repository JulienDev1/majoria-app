// Global handler to ignore benign WebSocket/HMR reconnection errors in container/cloud environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || (typeof event.reason === 'string' ? event.reason : '') || '';
    if (
      reason.includes('WebSocket') || 
      reason.includes('ws') || 
      reason.includes('vite') ||
      reason.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('vite') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  });
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

