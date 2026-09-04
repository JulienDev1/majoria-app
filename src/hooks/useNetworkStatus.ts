import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline network connectivity in real-time
 */
export function useNetworkStatus() {
  // L'application reste en mode 'En Ligne' par défaut
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Le basculement vers le mode 'Hors-ligne' ne doit se faire qu'en cas de coupure réseau avérée
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
