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

// Automatic Service Worker Registration for PWA
import { registerSW } from 'virtual:pwa-register';
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Majori.A: Nouvelle mise à jour PWA disponible.');
    },
    onOfflineReady() {
      console.log('Majori.A: Application prête pour une utilisation hors-ligne.');
    },
  });
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
