import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline network connectivity in real-time
 */
export function useNetworkStatus() {
  // Le mode 'En-ligne' est actif dès le démarrage de l'application
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mise à jour de l'état réseau uniquement en cas de coupure avérée
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification initiale ponctuelle
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
    } else {
      setIsOnline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
