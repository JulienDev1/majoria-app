/**
 * Utilitaire d'identification utilisateur pour Major2I.A (Web, Mobile et PWA)
 */

export const USER_ID_STORAGE_KEY = 'user_id';
export const LEGACY_AUTH_STORAGE_KEY = 'neo-auth-user';

/**
 * Récupère ou génère un user_id unique et stable dans le localStorage.
 * Format si généré : anon_<timestamp>_<randomStr>
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') {
    return 'anon_server';
  }

  try {
    let userId = localStorage.getItem(USER_ID_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);

    if (!userId || !userId.trim()) {
      userId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(USER_ID_STORAGE_KEY, userId);
      localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, userId);
    } else {
      // Assurer la synchronisation entre les deux clés
      if (!localStorage.getItem(USER_ID_STORAGE_KEY)) {
        localStorage.setItem(USER_ID_STORAGE_KEY, userId);
      }
      if (!localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)) {
        localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, userId);
      }
    }

    return userId;
  } catch (e) {
    console.warn('Erreur accès localStorage pour user_id:', e);
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Définit explicitement le user_id dans le localStorage (ex: lors d'une connexion)
 */
export function setStoredUserId(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const cleanId = userId.trim();
    localStorage.setItem(USER_ID_STORAGE_KEY, cleanId);
    localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, cleanId);
  } catch (e) {
    console.warn('Erreur écriture localStorage user_id:', e);
  }
}

/**
 * Récupère le user_id stocké s'il existe sans en créer un nouveau
 */
export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}
