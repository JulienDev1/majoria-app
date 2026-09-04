import React, { createContext, useContext, useState, useEffect } from 'react';

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // L'application reste strictement en mode 'En Ligne' par défaut
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Le basculement vers le mode 'Hors-ligne' ne doit se faire qu'en cas de coupure réseau avérée
    // (écouteurs d'événements window offline / online du navigateur)
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
