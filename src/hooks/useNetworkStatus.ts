import { useNetwork } from '../context/NetworkContext';

/**
 * Hook centralisé pour suivre l'état de connectivité réseau.
 * L'application reste en mode 'En Ligne' par défaut.
 * Le basculement vers le mode 'Hors-ligne' ne doit se faire qu'en cas de coupure réseau avérée
 * (écouteur d'événement offline de la fenêtre/navigateur).
 */
export function useNetworkStatus(): boolean {
  try {
    const { isOnline } = useNetwork();
    return isOnline !== undefined ? isOnline : true;
  } catch {
    return true;
  }
}

