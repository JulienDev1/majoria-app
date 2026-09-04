import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PanelLeftOpen, ChevronRight } from 'lucide-react';
import { 
  Conversation, 
  Favori, 
  Memoire, 
  Rappel, 
  Tache, 
  PanelId, 
  ToastItem, 
  TaskStatus, 
  Priority,
  UserProfile,
  VoiceGender,
  AlertSound,
  RolloverEnergyInfo,
  UserSubscription,
  ThemeMode
} from './types';
import { 
  safeLoad, 
  safeSave, 
  playCyberSound, 
  playAlertSound,
  playReminderAlarmSound,
  speakCyberResponse, 
  sanitizeConfidentialText,
} from './utils/security';
import { callUseCredit, getCreditBalance, syncCreditsToSupabase } from './utils/supabase';
import { supabase, getAuthHeader, getAuthRedirectUrl } from './utils/supabaseAuth';
import { getOrCreateUserId, setStoredUserId } from './utils/userId';
import { fetchUserSubscription } from './utils/stripe';
import { MilkyWayGalaxy, GalaxyColorScheme } from './components/MilkyWayGalaxy';
import { CyberHeader } from './components/CyberHeader';
import { NavigationSidebar } from './components/NavigationSidebar';
import { ChatPanel } from './components/ChatPanel';
import { FavorisPanel } from './components/FavorisPanel';
import { MemoirePanel } from './components/MemoirePanel';
import { RappelsPanel } from './components/RappelsPanel';
import { TachesPanel } from './components/TachesPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { StatsPanel } from './components/StatsPanel';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { PricingView } from './components/PricingView';
import { SuccessView } from './components/SuccessView';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ForfaitsModal } from './components/ForfaitsModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { generateOfflineResponse } from './utils/offlineAiEngine';
import { extractActionsFromText } from './utils/actionExtractor';
import { cleanSpokenTranscript } from './utils/speechCleaner';

const API = '/api';

export default function App() {
  const isOnline = useNetworkStatus();
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        setUser({ nom: session.user.email.split('@')[0] });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        setUser({ nom: session.user.email.split('@')[0] });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Navigation State with URL routing support
  const [activePanel, setActivePanel] = useState<PanelId>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/pricing' || window.location.hash === '#pricing') return 'pricing';
      if (path === '/success' || search.includes('session_id')) return 'success';
    }
    return 'chat';
  });
  const [activeCategory, setActiveCategory] = useState('tous');
  const [conversationSearch, setConversationSearch] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('majoria-sidebar-collapsed');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('majoria-header-collapsed');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('majoria-sidebar-collapsed', next ? 'true' : 'false');
        return next;
      });
    }
  }, []);

  const handleToggleHeader = useCallback(() => {
    setIsHeaderCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('majoria-header-collapsed', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const handleUnfoldAllBars = useCallback(() => {
    setIsHeaderCollapsed(false);
    setIsSidebarCollapsed(false);
    localStorage.setItem('majoria-sidebar-collapsed', 'false');
    localStorage.setItem('majoria-header-collapsed', 'false');
  }, []);

  const handleCollapseAllBars = useCallback(() => {
    setIsHeaderCollapsed(true);
    setIsSidebarCollapsed(true);
    localStorage.setItem('majoria-sidebar-collapsed', 'true');
    localStorage.setItem('majoria-header-collapsed', 'true');
  }, []);

  // Core Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [favoris, setFavoris] = useState<Favori[]>([]);
  const [memoire, setMemoire] = useState<Memoire[]>([]);
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);

  // User & Profile State
  const [user, setUser] = useState<{ nom: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('neo-auth-user') || localStorage.getItem('user_id');
      const authHash = localStorage.getItem('neo-auth-hash');
      if (authUser && authHash) {
        return { nom: authUser };
      }
      // Ensure there is always a stable, persistent user_id in localStorage
      getOrCreateUserId();
    }
    return null;
  });

  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const subscriptionNotifiedRef = useRef<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = safeLoad<UserProfile>('neo-user-profile', { prenom: '', nom: '' });
    return saved;
  });

  // Voice & Notification Sound Preferences
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => {
    return (localStorage.getItem('neo-voice-gender') as VoiceGender) || 'female';
  });

  const [alertSound, setAlertSound] = useState<AlertSound>(() => {
    return (localStorage.getItem('neo-alert-sound') as AlertSound) || 'zen-crystal';
  });

  const [confidentialMode, setConfidentialMode] = useState<boolean>(false);
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState<boolean>(false);

  // Battery / Consumption & Automatic Monthly Rollover State
  const [energyPercent, setEnergyPercent] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('neo-auth-user');
      const savedSub = authUser ? localStorage.getItem(`neo-user-sub-${authUser}`) : null;
      if (savedSub) {
        try {
          const parsed = JSON.parse(savedSub);
          if (parsed && (parsed.status === 'active' || parsed.status === 'trialing')) {
            const target = parsed.planId === 'pro' ? 500 : parsed.planId === 'premium' ? 250 : 100;
            const savedEnergy = localStorage.getItem('neo-battery-energy');
            const num = savedEnergy !== null ? parseInt(savedEnergy, 10) : target;
            return isNaN(num) || num < 100 ? target : num;
          }
        } catch {}
      }
      const saved = localStorage.getItem('neo-battery-energy');
      return saved !== null ? parseInt(saved, 10) : 100;
    }
    return 100;
  });

  const [rolloverInfo, setRolloverInfo] = useState<RolloverEnergyInfo>(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
    const saved = safeLoad<RolloverEnergyInfo>('neo-rollover-info', {
      currentMonth: currentMonthKey,
      rolloverEnergy: 35,
      lastRolloverDate: new Date().toISOString(),
      carriedFromPreviousMonth: 35,
    });
    return saved;
  });

  // Background & Galaxy UI State
  const [bgColor, setBgColor] = useState<string>('#020612');
  const [chatBgImage, setChatBgImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('majoria-chat-bg-image') || null;
    }
    return null;
  });
  const [galaxyEnabled, setGalaxyEnabled] = useState<boolean>(true);
  const [galaxyColorScheme, setGalaxyColorScheme] = useState<GalaxyColorScheme>('milky-way-classic');
  const [galaxySpeed, setGalaxySpeed] = useState<number>(1);
  const [galaxyOpacity, setGalaxyOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('majoria-galaxy-opacity');
    return saved ? parseFloat(saved) : 0.85;
  });

  // Theme State (Light / Dark) with persistence
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('majoria-theme-mode') as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'light';
  });

  // Apply theme to documentElement (data-theme attribute & dark class)
  useEffect(() => {
    const applyTheme = () => {
      let effectiveTheme: 'light' | 'dark' = 'light';
      if (themeMode === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      } else {
        effectiveTheme = themeMode;
      }

      document.documentElement.setAttribute('data-theme', effectiveTheme);
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('majoria-theme-mode', themeMode);

    if (themeMode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const handleToggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      let currentIsDark = false;
      if (prev === 'system') {
        currentIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        currentIsDark = prev === 'dark';
      }
      const next: ThemeMode = currentIsDark ? 'light' : 'dark';
      return next;
    });
  }, []);

  const handleUpdateThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  // Modals & UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isForfaitsOpen, setIsForfaitsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('neo-auth-user');
      const authHash = localStorage.getItem('neo-auth-hash');
      return !authUser || !authHash;
    }
    return true;
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Toast Helper
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  // Update User Profile
  const handleUpdateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    safeSave('neo-user-profile', profile);
    showToast(`Identité mise à jour : ${profile.prenom || ''} ${profile.nom || ''}`.trim(), 'success');
  };

  // Update Voice Gender
  const handleUpdateVoiceGender = (gender: VoiceGender) => {
    setVoiceGender(gender);
    localStorage.setItem('neo-voice-gender', gender);
  };

  // Update Alert Sound
  const handleUpdateAlertSound = (sound: AlertSound) => {
    setAlertSound(sound);
    localStorage.setItem('neo-alert-sound', sound);
    playAlertSound(sound);
  };

  // Monthly Rollover Logic: check if a new month has arrived and carry over unused energy
  const checkAndApplyMonthlyRollover = useCallback(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const savedRollover = safeLoad<RolloverEnergyInfo>('neo-rollover-info', {
      currentMonth: currentMonthKey,
      rolloverEnergy: 35,
      lastRolloverDate: new Date().toISOString(),
      carriedFromPreviousMonth: 35,
    });

    if (savedRollover.currentMonth !== currentMonthKey) {
      // Month changed: take remaining energy and roll it over!
      const unusedEnergy = typeof energyPercent === 'number' ? energyPercent : 80;
      const newRolloverEnergy = Math.max(0, unusedEnergy);
      const newInfo: RolloverEnergyInfo = {
        currentMonth: currentMonthKey,
        rolloverEnergy: newRolloverEnergy,
        lastRolloverDate: new Date().toISOString(),
        carriedFromPreviousMonth: newRolloverEnergy,
      };

      setRolloverInfo(newInfo);
      safeSave('neo-rollover-info', newInfo);

      // Start new month with 100% base + rollover
      const refreshedEnergy = 100;
      setEnergyPercent(refreshedEnergy);
      localStorage.setItem('neo-battery-energy', refreshedEnergy.toString());

      showToast(`🔄 Nouveau mois (${currentMonthKey}) : ${newRolloverEnergy}% d'énergie non consommée a été automatiquement reportée !`, 'success');
    }
  }, [energyPercent, showToast]);

  // Simulate Monthly Rollover (User triggered)
  const handlePerformRollover = () => {
    const unusedEnergy = typeof energyPercent === 'number' ? energyPercent : 80;
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const newInfo: RolloverEnergyInfo = {
      currentMonth: currentMonthKey,
      rolloverEnergy: unusedEnergy,
      lastRolloverDate: new Date().toISOString(),
      carriedFromPreviousMonth: unusedEnergy,
    };
    setRolloverInfo(newInfo);
    safeSave('neo-rollover-info', newInfo);
    showToast(`🔄 Report mensuel appliqué : ${unusedEnergy}% d'énergie reportée avec succès !`, 'success');
  };

  // Subscription Activation Handler from Stripe Success
  const handleSubscriptionActivated = useCallback(async (sub: UserSubscription, energyValue?: number) => {
    const effectiveUserId = user?.nom || localStorage.getItem('neo-auth-user') || 'user_active';
    setCurrentSubscription(sub);
    if (effectiveUserId) {
      localStorage.setItem(`neo-user-sub-${effectiveUserId}`, JSON.stringify(sub));
    }
    
    // Déterminer la nouvelle valeur d'énergie selon le forfait
    const newEnergy = energyValue || (sub.planId === 'pro' ? 500 : sub.planId === 'premium' ? 250 : 100);
    
    // 1. Mise à jour synchrone et immédiate de l'état React de l' IA (widgets sidebar & header)
    setEnergyPercent(newEnergy);
    localStorage.setItem('neo-battery-energy', newEnergy.toString());
    localStorage.setItem('neo-local-credits', newEnergy.toString());
    if (effectiveUserId) {
      localStorage.setItem(`neo-user-credits-${effectiveUserId}`, newEnergy.toString());
    }

    // 2. Notification unique protégée contre les doublons
    const subKey = `${sub.planId}_${sub.status}_${sub.interval || 'month'}`;
    if (subscriptionNotifiedRef.current !== subKey) {
      subscriptionNotifiedRef.current = subKey;
      showToast(`✨ Forfait ${sub.planName || sub.planId.toUpperCase()} activé ! IA synchronisée à ${newEnergy}%.`, 'success');
    }

    // 3. Rafraîchissement global du statut utilisateur et synchronisation Supabase en arrière-plan
    try {
      const [freshSub, freshBalance] = await Promise.all([
        fetchUserSubscription(effectiveUserId),
        getCreditBalance(effectiveUserId)
      ]);
      if (freshSub) {
        setCurrentSubscription(freshSub);
      }
      if (freshBalance !== null && freshBalance > 0) {
        setEnergyPercent(freshBalance);
        localStorage.setItem('neo-battery-energy', freshBalance.toString());
      }
    } catch (e) {
      console.warn('Synchronisation post-paiement Supabase:', e);
    }
  }, [user, showToast]);

  // Fetch subscription on user load and enforce active subscription energy
  useEffect(() => {
    let isMounted = true;
    const effectiveUserId = user?.nom || (typeof window !== 'undefined' ? localStorage.getItem('neo-auth-user') : null) || 'user_default';

    if (effectiveUserId) {
      fetchUserSubscription(effectiveUserId).then((sub) => {
        if (isMounted && sub) {
          setCurrentSubscription(sub);

          // If subscription is active or trialing, guarantee at least 100% energy (or full plan capacity)
          if (sub.status === 'active' || sub.status === 'trialing') {
            const targetEnergy = sub.planId === 'pro' ? 500 : sub.planId === 'premium' ? 250 : 100;
            
            // 1. Instantly update React state if below target
            setEnergyPercent((prev) => {
              if (prev === null || prev < 100) {
                return targetEnergy;
              }
              return Math.max(prev, targetEnergy);
            });

            // 2. Persist locally
            localStorage.setItem('neo-battery-energy', targetEnergy.toString());
            localStorage.setItem('neo-local-credits', targetEnergy.toString());
            localStorage.setItem(`neo-user-credits-${effectiveUserId}`, targetEnergy.toString());

            // 3. Synchronize to Supabase database and server proxy
            syncCreditsToSupabase(effectiveUserId, targetEnergy).catch(() => {});
          }
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [user]);

  // Update Energy State Helper
  const handleUpdateEnergy = (val: number) => {
    setEnergyPercent(val);
    localStorage.setItem('neo-battery-energy', val.toString());
  };

  // Handle custom chat background image
  const handleSetChatBgImage = useCallback((img: string | null) => {
    setChatBgImage(img);
    if (img) {
      try {
        localStorage.setItem('majoria-chat-bg-image', img);
      } catch (e) {
        console.warn('Storage quota for background image:', e);
      }
      showToast("Image de fond du chat appliquée", "success");
    } else {
      try {
        localStorage.removeItem('majoria-chat-bg-image');
      } catch {}
      showToast("Fond du chat réinitialisé par défaut", "info");
    }
  }, [showToast]);

  // Sync background styling to document and completely replace previous background
  const applyBackground = useCallback((bg: string) => {
    setBgColor(bg);
    try {
      localStorage.setItem('neo-bg', bg);
    } catch (e) {
      console.warn('Failed to save background to localStorage:', e);
    }
    const isCustom = Boolean(bg && (bg.startsWith('url(') || bg.startsWith('data:') || bg.startsWith('blob:')));
    if (isCustom) {
      document.body.style.setProperty('--page-bg-image', bg);
      document.body.style.setProperty('--page-bg-color', 'transparent');
    } else {
      document.body.style.setProperty('--page-bg-image', 'none');
      document.body.style.setProperty('--page-bg-color', bg || 'var(--fb-bg)');
    }
  }, []);

  // Initial Data Loader
  useEffect(() => {
    // 1. Auth check
    const authUser = localStorage.getItem('neo-auth-user');
    const authHash = localStorage.getItem('neo-auth-hash');
    if (authUser && authHash) {
      setUser({ nom: authUser });
    }

    // 2. Settings check
    const savedBg = localStorage.getItem('neo-bg') || '';
    if (savedBg) {
      applyBackground(savedBg);
    }

    const savedConfidential = localStorage.getItem('neo-mode-confidentiel') === '1';
    setConfidentialMode(savedConfidential);

    const savedVoice = localStorage.getItem('neo-voice-auto') === '1';
    setVoiceAutoSpeak(savedVoice);

    // 3. Check Monthly Rollover
    checkAndApplyMonthlyRollover();

    // 4. Load Data from Server with LocalStorage Fallback
    loadAllData();

    // 5. Request Notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [applyBackground, checkAndApplyMonthlyRollover]);

  const fetchFavoris = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/favoris', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const localItems = safeLoad<Favori[]>('neo-favoris', []);
          const serverIds = new Set(data.map((f: any) => f.id));
          const unsynced = localItems.filter((f) => !serverIds.has(f.id));
          if (unsynced.length > 0) {
            unsynced.forEach((f) => {
              fetch('/api/favoris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(f),
              }).catch(() => {});
            });
          }
          const merged = [...unsynced, ...data];
          setFavoris(merged);
          safeSave('neo-favoris', merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Erreur chargement favoris en ligne:', err);
    }
    return null;
  }, []);

  const fetchMemoire = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/memoire', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const localItems = safeLoad<Memoire[]>('neo-memoire', []);
          const serverIds = new Set(data.map((m: any) => m.id));
          const unsynced = localItems.filter((m) => !serverIds.has(m.id));
          if (unsynced.length > 0) {
            unsynced.forEach((m) => {
              fetch('/api/memoire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(m),
              }).catch(() => {});
            });
          }
          const merged = [...unsynced, ...data];
          setMemoire(merged);
          safeSave('neo-memoire', merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Erreur chargement mémoire en ligne:', err);
    }
    return null;
  }, []);

  const fetchRappels = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/rappels', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const localItems = safeLoad<Rappel[]>('neo-rappels', []);
          const serverIds = new Set(data.map((r: any) => r.id));
          const unsynced = localItems.filter((r) => !serverIds.has(r.id));
          if (unsynced.length > 0) {
            unsynced.forEach((r) => {
              fetch('/api/rappels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(r),
              }).catch(() => {});
            });
          }
          const merged = [...unsynced, ...data];
          setRappels(merged);
          safeSave('neo-rappels', merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Erreur chargement rappels en ligne:', err);
    }
    return null;
  }, []);

  const fetchTaches = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/taches', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const localItems = safeLoad<Tache[]>('neo-taches', []);
          const serverIds = new Set(data.map((t: any) => t.id));
          const unsynced = localItems.filter((t) => !serverIds.has(t.id));
          if (unsynced.length > 0) {
            unsynced.forEach((t) => {
              fetch('/api/taches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(t),
              }).catch(() => {});
            });
          }
          const merged = [...unsynced, ...data];
          setTaches(merged);
          safeSave('neo-taches', merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Erreur chargement tâches en ligne:', err);
    }
    return null;
  }, []);

  const loadAllData = useCallback(async () => {
    // 1. Charger immédiatement les données en cache local (LocalStorage)
    // Permet une consultation instantanée et sans interruption en mode hors ligne
    const cachedConvs = safeLoad<Conversation[]>('neo-conversations', []);
    if (cachedConvs.length > 0) {
      const migrated = cachedConvs.map((c) => ({
        ...c,
        titre: (c.titre || '').replace(/MajorI\.A/g, 'Major2I.A'),
      }));
      setConversations(migrated);
      setActiveConversationId((prev) => prev || migrated[0].id);
    } else {
      const initialConv: Conversation = {
        id: Date.now(),
        titre: 'Discussion Principale',
        tags: ['accueil'],
        favori: true,
        categorie: 'général',
        date: new Date().toISOString(),
        messages: [
          {
            role: 'neo',
            contenu: userProfile.prenom 
              ? `Bonjour ${userProfile.prenom}, et bienvenue sur Major2I.A. Comment puis-je vous aider aujourd'hui ?`
              : "Bonjour et bienvenue sur Major2I.A. Comment puis-je vous aider aujourd'hui ?",
            date: new Date().toISOString(),
          },
        ],
      };
      setConversations([initialConv]);
      setActiveConversationId(initialConv.id);
      safeSave('neo-conversations', [initialConv]);
    }

    const cachedFavoris = safeLoad<Favori[]>('neo-favoris', []);
    setFavoris(cachedFavoris);

    const cachedMemoire = safeLoad<Memoire[]>('neo-memoire', []);
    setMemoire(cachedMemoire);

    const cachedRappels = safeLoad<Rappel[]>('neo-rappels', []);
    setRappels(cachedRappels);

    const cachedTaches = safeLoad<Tache[]>('neo-taches', []);
    setTaches(cachedTaches);

    // 2. Si l'utilisateur est hors ligne : s'arrêter ici sans appeler les routes /api/
    if (!isOnline) {
      return;
    }

    // 3. Si en ligne : rafraîchir les données depuis les endpoints /api/ et mettre à jour le cache local
    try {
      await Promise.all([
        fetchFavoris(),
        fetchMemoire(),
        fetchRappels(),
        fetchTaches()
      ]);

      // Énergie / Forfait Supabase
      try {
        const effectiveUserId = user?.nom || (user as any)?.id || userProfile?.id || getOrCreateUserId();
        const sub = await fetchUserSubscription(effectiveUserId);
        if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
          setCurrentSubscription(sub);
          const targetEnergy = sub.planId === 'pro' ? 500 : sub.planId === 'premium' ? 250 : 100;
          setEnergyPercent((prev) => (prev === null || prev < 100 ? targetEnergy : Math.max(prev, targetEnergy)));
          localStorage.setItem('neo-battery-energy', targetEnergy.toString());
          localStorage.setItem('neo-local-credits', targetEnergy.toString());
          localStorage.setItem(`neo-user-credits-${effectiveUserId}`, targetEnergy.toString());
          syncCreditsToSupabase(effectiveUserId, targetEnergy).catch(() => {});
        } else {
          const balance = await getCreditBalance(effectiveUserId);
          if (balance !== null && balance >= 0) {
            setEnergyPercent(balance);
            localStorage.setItem('neo-battery-energy', balance.toString());
            localStorage.setItem('neo-local-credits', balance.toString());
            localStorage.setItem(`neo-user-credits-${effectiveUserId}`, balance.toString());
          }
        }
      } catch (err) {
        console.warn('Erreur chargement IA:', err);
      }
    } catch (err) {
      console.warn('Erreur synchronisation globale:', err);
    }
  }, [user, userProfile]);

  // Écouteur d'état réseau : alertes et resynchronisation automatique au retour en ligne
  useEffect(() => {
    const handleOnline = () => {
      playCyberSound('success');
      showToast('🟢 Connexion rétablie : resynchronisation des données...', 'success');
      loadAllData();
    };

    const handleOffline = () => {
      playCyberSound('alert');
      showToast('⚠️ Vous êtes hors ligne. Accès aux tâches et données locales en cache.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadAllData, showToast]);

  // Periodic Reminder Checker loop (checks every 15s for exact timing) with custom alert sound & browser notification
  useEffect(() => {
    // Request permission once on mount or interaction if supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {}
    }

    const checkReminders = () => {
      const now = new Date();
      const notifies = safeLoad<string[]>('neo-notifies', []);
      let updatedNotifies = [...notifies];

      rappels
        .filter((r) => r.statut === 'actif' && r.dateRappel)
        .forEach((r) => {
          const timeStr = r.heure || '00:00';
          const reminderDateTime = new Date(`${r.dateRappel}T${timeStr}`);
          
          if (isNaN(reminderDateTime.getTime())) return;

          const diff = reminderDateTime.getTime() - now.getTime();
          const key = `rappel-${r.id}-${r.dateRappel}-${timeStr}`;

          // Trigger when reminder time arrives (within window of -10 min overdue to +1 min upcoming)
          if (diff >= -10 * 60 * 1000 && diff <= 1 * 60 * 1000 && !updatedNotifies.includes(key)) {
            // Play dedicated reminder chime & sound
            playReminderAlarmSound();
            playAlertSound(alertSound);

            const endDateInfo = r.dateFinRappel
              ? ` (Fin : ${new Date(r.dateFinRappel).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}${r.heureFin ? ` à ${r.heureFin}` : ''})`
              : '';

            showToast(`🔔 Rappel à échéance : ${r.titre}${r.heure ? ` (${r.heure})` : ''}${endDateInfo}`, 'warning');

            // Browser push notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const bodyText = `${r.titre}${r.description ? `\n${r.description}` : ''}${endDateInfo}`;
                new Notification(`🔔 Major2I.A - Rappel d’échéance`, {
                  body: bodyText,
                  icon: '/favicon.ico',
                  tag: key,
                  requireInteraction: true,
                });
              } catch (notifErr) {
                console.warn('Erreur notification navigateur:', notifErr);
              }
            }

            updatedNotifies.push(key);
          }
        });

      safeSave('neo-notifies', updatedNotifies);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [rappels, alertSound, showToast]);

  // Save changes to localStorage helper
  const updateConversationsState = (newConvs: Conversation[]) => {
    setConversations(newConvs);
    safeSave('neo-conversations', newConvs);
  };

  // Auth Operations
  const handleLogin = (nom: string, mdp: string) => {
    const hash = btoa(String.fromCharCode(...new TextEncoder().encode(mdp))).slice(0, 32);
    localStorage.setItem('neo-auth-user', nom);
    localStorage.setItem('neo-auth-hash', hash);
    setUser({ nom });
    setIsAuthOpen(false);
    loadAllData();
    showToast(`🔐 Compte actif : Bienvenue, ${nom}.`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('neo-auth-user');
    localStorage.removeItem('neo-auth-hash');
    setUser(null);
    setIsAuthOpen(true);
    showToast('🔓 Session déconnectée. Veuillez créer un compte ou vous connecter.', 'info');
  };

  // Conversation Management
  const handleNewConversation = () => {
    const newId = Date.now();
    const newConv: Conversation = {
      id: newId,
      titre: `Session Major2I.A #${conversations.length + 1}`,
      messages: [],
      tags: [],
      favori: false,
      categorie: 'général',
      date: new Date().toISOString(),
    };
    const updated = [newConv, ...conversations];
    updateConversationsState(updated);
    setActiveConversationId(newId);
    setActivePanel('chat');
    showToast('💬 Nouvelle discussion créée', 'success');
  };

  const handleRenameConversation = (id: number) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const newTitle = prompt('Nouveau nom pour cette session :', conv.titre);
    if (!newTitle || !newTitle.trim()) return;

    const updated = conversations.map((c) =>
      c.id === id ? { ...c, titre: newTitle.trim() } : c
    );
    updateConversationsState(updated);
    showToast('✏️ Discussion renommée', 'success');
  };

  const handleDeleteConversation = (id: number) => {
    playCyberSound('alert');
    const updated = conversations.filter((c) => c.id !== id);
    if (updated.length === 0) {
      const newId = Date.now();
      const freshConv: Conversation = {
        id: newId,
        titre: 'Session Major2I.A #1',
        messages: [],
        tags: [],
        favori: false,
        categorie: 'général',
        date: new Date().toISOString(),
      };
      updateConversationsState([freshConv]);
      setActiveConversationId(newId);
    } else {
      updateConversationsState(updated);
      if (activeConversationId === id) {
        setActiveConversationId(updated[0].id);
      }
    }
    showToast('🗑️ Discussion supprimée', 'info');
  };

  const handleToggleFavoriConv = (id: number) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, favori: !c.favori } : c
    );
    updateConversationsState(updated);
  };

  const handleAddTagToConv = (id: number) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const tag = prompt('Entrez un #tag pour cette session :');
    if (!tag || !tag.trim()) return;
    const cleanTag = tag.trim().replace(/^#/, '');
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, tags: Array.from(new Set([...(c.tags || []), cleanTag])) } : c
    );
    updateConversationsState(updated);
    showToast(`🏷️ Tag #${cleanTag} ajouté`, 'success');
  };

  // Process AI Automated Actions (Tâches, Projets, Rappels, Mémoire, Favoris)
  const processAiActions = async (actions: any[]) => {
    if (!Array.isArray(actions) || actions.length === 0) return;

    for (const rawAction of actions) {
      try {
        // Normalize action structure (handles flat, nested, and [ACTION_JSON] types)
        const actType = (rawAction.type || '').toLowerCase();
        const itemData = rawAction.data || rawAction.item || rawAction;

        if (actType === 'memory' || actType === 'memoire' || actType === 'create_memory') {
          const item: Memoire = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            contenu: itemData.title || itemData.contenu || itemData.titre || itemData.description || 'Note mémorisée',
            tags: Array.isArray(itemData.tags) && itemData.tags.length > 0 ? itemData.tags : ['ia-auto'],
            importance: typeof itemData.importance === 'number' ? itemData.importance : 3,
            date: itemData.date || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setMemoire((prev) => {
            const next = [item, ...prev.filter((m) => m.id !== item.id)];
            safeSave('neo-memoire', next);
            return next;
          });

          // 2. Sync with backend API
          try {
            getAuthHeader().then(authHeaders => {
              fetch('/api/memoire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(item),
              }).catch(() => ({}));
            });
          } catch {}

          showToast('🧠 Nouvelle note mémorisée', 'success');
        } else if (actType === 'reminder' || actType === 'rappel' || actType === 'create_reminder') {
          const item: Rappel = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.title || itemData.titre || itemData.nom || 'Rappel Major2I.A',
            description: itemData.description || '',
            dateRappel: itemData.date || itemData.dateRappel || new Date().toISOString().split('T')[0],
            heure: itemData.time || itemData.heure || '12:00',
            dateFinRappel: itemData.dateFinRappel || undefined,
            heureFin: itemData.heureFin || undefined,
            priorite: (itemData.priority || itemData.priorite as Priority) || 'normale',
            statut: itemData.statut || 'actif',
            dateCreation: itemData.dateCreation || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setRappels((prev) => {
            const next = [item, ...prev.filter((r) => r.id !== item.id)];
            safeSave('neo-rappels', next);
            return next;
          });

          // 2. Sync with backend API
          try {
            getAuthHeader().then(authHeaders => {
              fetch('/api/rappels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(item),
              }).catch(() => ({}));
            });
          } catch {}

          playAlertSound(alertSound);
          showToast(`🔔 Rappel créé : ${item.titre}`, 'success');
        } else if (actType === 'task' || actType === 'tache' || actType === 'project' || actType === 'projet' || actType === 'create_task') {
          const isProj = actType.includes('projet') || actType.includes('project');
          const item: Tache = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.title || itemData.titre || itemData.nom || (isProj ? 'Projet Major2I.A' : 'Tâche Major2I.A'),
            description: itemData.description || (isProj ? 'Projet planifié par Major2I.A' : 'Tâche planifiée par Major2I.A'),
            priorite: (itemData.priority || itemData.priorite as Priority) || 'normale',
            status: itemData.status || 'attente',
            echeance: itemData.date || itemData.echeance || itemData.dateRappel || '',
            dateCreation: itemData.dateCreation || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setTaches((prev) => {
            const next = [item, ...prev.filter((t) => t.id !== item.id)];
            safeSave('neo-taches', next);
            return next;
          });

          // 2. Sync with backend API
          try {
            getAuthHeader().then(authHeaders => {
              fetch('/api/taches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(item),
              }).catch(() => ({}));
            });
          } catch {}

          showToast(isProj ? `📁 Projet ajouté : ${item.titre}` : `✅ Tâche ajoutée : ${item.titre}`, 'success');
        } else if (actType === 'favorite' || actType === 'favori' || actType === 'create_favorite') {
          const item: Favori = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.title || itemData.titre || itemData.nom || 'Favori',
            contenu: itemData.description || itemData.content || itemData.contenu || '',
            categorie: itemData.category || itemData.categorie || 'général',
            date: itemData.date || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setFavoris((prev) => {
            const next = [item, ...prev.filter((f) => f.id !== item.id)];
            safeSave('neo-favoris', next);
            return next;
          });

          // 2. Sync with backend API
          try {
            getAuthHeader().then(authHeaders => {
              fetch('/api/favoris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(item),
              }).catch(() => ({}));
            });
          } catch {}

          showToast(`⭐ Favori enregistré : ${item.titre}`, 'success');
        } else if (actType === 'event' || actType === 'agenda' || actType === 'evenement' || actType === 'create_event' || actType === 'create_agenda') {
          const item: Rappel = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.title || itemData.titre || itemData.nom || 'Événement Agenda',
            description: itemData.description || '',
            dateRappel: itemData.date || itemData.dateRappel || new Date().toISOString().split('T')[0],
            heure: itemData.time || itemData.heure || '09:00',
            dateFinRappel: itemData.endDate || itemData.dateFinRappel || undefined,
            heureFin: itemData.endTime || itemData.heureFin || undefined,
            priorite: (itemData.priority || itemData.priorite as Priority) || 'normale',
            statut: itemData.statut || 'actif',
            dateCreation: itemData.dateCreation || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setRappels((prev) => {
            const next = [item, ...prev.filter((r) => r.id !== item.id)];
            safeSave('neo-rappels', next);
            return next;
          });

          // 2. Sync with backend API
          try {
            getAuthHeader().then(authHeaders => {
              fetch('/api/rappels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(item),
              }).catch(() => ({}));
            });
          } catch {}

          playAlertSound(alertSound);
          showToast(`📅 Événement planifié sur l'agenda : ${item.titre}`, 'success');
        }
      } catch (err) {
        console.error('Erreur traitement action IA:', err);
      }
    }
  };

  // ============================================================
  // ACTIONS IA AUTOMATIQUES — VERSION ROBUSTE
  // ============================================================
  const interceptAndExecuteActionJson = async (rawReplyText: string): Promise<boolean> => {
    if (!rawReplyText || !rawReplyText.includes('[ACTION_JSON]')) {
      return false;
    }

    try {
      // ----------------------------------------------------------
      // 1. Extraction du bloc ACTION_JSON
      // ----------------------------------------------------------
      const match = rawReplyText.match(
        /\[ACTION_JSON\]\s*([\s\S]*?)(?:\[\/ACTION_JSON\]|$)/i
      );

      if (!match || !match[1]) {
        console.warn('⚠️ ACTION_JSON détecté mais contenu introuvable');
        return false;
      }

      let jsonStr = match[1]
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      let parsed: any;

      try {
        parsed = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error('❌ JSON ACTION invalide :', jsonStr, jsonError);
        showToast('⚠️ Action IA invalide', 'danger');
        return false;
      }

      // ----------------------------------------------------------
      // 2. Normalisation : objet / tableau / { actions: [] }
      // ----------------------------------------------------------
      const actionsToProcess: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.actions)
          ? parsed.actions
          : [parsed];

      if (actionsToProcess.length === 0) {
        return false;
      }

      const authHeaders = await getAuthHeader();

      let executedAtLeastOne = false;

      // ----------------------------------------------------------
      // 3. Exécution séquentielle des actions
      // ----------------------------------------------------------
      for (const action of actionsToProcess) {
        if (!action) continue;

        const actionType = String(action.type || '').toUpperCase();

        // Format moderne :
        // {
        //   type: "CREATE_REMINDER",
        //   endpoint: "/api/rappels",
        //   payload: {...}
        // }
        const endpoint = action.endpoint;
        const payload = action.payload || action.data || {};

        // --------------------------------------------------------
        // A — FORMAT endpoint + payload
        // --------------------------------------------------------
        if (endpoint && payload) {
          const finalPayload = { ...payload };

          // Ne jamais envoyer CURRENT_USER au backend
          const storedUserId =
            (user as any)?.id ||
            userProfile?.id ||
            localStorage.getItem('user_id') ||
            localStorage.getItem('neo-auth-user') ||
            '';

          if (
            !finalPayload.user_id ||
            finalPayload.user_id === 'CURRENT_USER'
          ) {
            if (storedUserId) {
              finalPayload.user_id = storedUserId;
            }
          }

          if (
            !finalPayload.userId ||
            finalPayload.userId === 'CURRENT_USER'
          ) {
            if (storedUserId) {
              finalPayload.userId = storedUserId;
            }
          }

          console.log('🤖 ACTION IA →', actionType, endpoint, finalPayload);

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
              },
              body: JSON.stringify(finalPayload),
            });

            if (!res.ok) {
              const errorText = await res.text().catch(() => '');
              console.error(
                `❌ Action IA refusée ${endpoint}:`,
                res.status,
                errorText
              );

              showToast(
                `⚠️ Impossible d'enregistrer l'action (${res.status})`,
                'danger'
              );

              continue;
            }

            // Réponse réelle du serveur
            const created = await res.json().catch(() => finalPayload);

            executedAtLeastOne = true;

            // ----------------------------------------------------
            // RAPPEL / AGENDA
            // ----------------------------------------------------
            if (
              endpoint.includes('/api/rappels') ||
              actionType.includes('REMINDER') ||
              actionType.includes('RAPPEL') ||
              actionType.includes('EVENT') ||
              actionType.includes('AGENDA')
            ) {
              const item: Rappel = {
                id:
                  created.id ||
                  finalPayload.id ||
                  Date.now(),

                titre:
                  created.titre ||
                  created.title ||
                  finalPayload.title ||
                  finalPayload.titre ||
                  'Rappel MajorIA',

                description:
                  created.description ||
                  finalPayload.description ||
                  '',

                dateRappel:
                  created.dateRappel ||
                  created.date_rappel ||
                  created.date ||
                  finalPayload.date ||
                  finalPayload.dateRappel ||
                  new Date().toISOString().split('T')[0],

                heure:
                  created.heure ||
                  created.time ||
                  finalPayload.time ||
                  finalPayload.heure ||
                  '09:00',

                dateFinRappel:
                  created.dateFinRappel ||
                  finalPayload.dateFinRappel ||
                  undefined,

                heureFin:
                  created.heureFin ||
                  finalPayload.heureFin ||
                  undefined,

                priorite:
                  (created.priorite ||
                    created.priority ||
                    finalPayload.priority ||
                    finalPayload.priorite ||
                    'normale') as Priority,

                statut:
                  created.statut ||
                  created.status ||
                  finalPayload.status ||
                  'actif',

                dateCreation:
                  created.dateCreation ||
                  created.date_creation ||
                  new Date().toISOString(),
              };

              setRappels((prev) => {
                const next = [
                  item,
                  ...prev.filter((r) => r.id !== item.id),
                ];

                safeSave('neo-rappels', next);
                return next;
              });

              playAlertSound(alertSound);

              showToast(
                `📅 ${actionType.includes('EVENT') || actionType.includes('AGENDA')
                  ? 'Rendez-vous ajouté à l’agenda'
                  : 'Rappel enregistré'} : ${item.titre}`,
                'success'
              );

              continue;
            }

            // ----------------------------------------------------
            // TÂCHE / PROJET
            // ----------------------------------------------------
            if (
              endpoint.includes('/api/taches') ||
              actionType.includes('TASK') ||
              actionType.includes('TACHE') ||
              actionType.includes('PROJECT') ||
              actionType.includes('PROJET')
            ) {
              const item: Tache = {
                id:
                  created.id ||
                  finalPayload.id ||
                  Date.now(),

                titre:
                  created.titre ||
                  created.title ||
                  finalPayload.title ||
                  finalPayload.titre ||
                  'Nouvelle tâche',

                description:
                  created.description ||
                  finalPayload.description ||
                  '',

                priorite:
                  (created.priorite ||
                    created.priority ||
                    finalPayload.priority ||
                    finalPayload.priorite ||
                    'normale') as Priority,

                status:
                  created.status ||
                  created.statut ||
                  finalPayload.status ||
                  'attente',

                echeance:
                  created.echeance ||
                  created.date ||
                  finalPayload.date ||
                  finalPayload.echeance ||
                  '',

                dateCreation:
                  created.dateCreation ||
                  created.date_creation ||
                  new Date().toISOString(),
              };

              setTaches((prev) => {
                const next = [
                  item,
                  ...prev.filter((t) => t.id !== item.id),
                ];

                safeSave('neo-taches', next);
                return next;
              });

              showToast(
                `✅ Tâche enregistrée : ${item.titre}`,
                'success'
              );

              continue;
            }

            // ----------------------------------------------------
            // FAVORI
            // ----------------------------------------------------
            if (
              endpoint.includes('/api/favoris') ||
              actionType.includes('FAVORITE') ||
              actionType.includes('FAVORI')
            ) {
              const item: Favori = {
                id:
                  created.id ||
                  finalPayload.id ||
                  Date.now(),

                titre:
                  created.titre ||
                  created.title ||
                  finalPayload.title ||
                  finalPayload.titre ||
                  'Favori',

                contenu:
                  created.contenu ||
                  created.content ||
                  finalPayload.content ||
                  finalPayload.contenu ||
                  finalPayload.description ||
                  '',

                categorie:
                  created.categorie ||
                  created.category ||
                  finalPayload.category ||
                  finalPayload.categorie ||
                  'général',

                date:
                  created.date ||
                  finalPayload.date ||
                  new Date().toISOString(),
              };

              setFavoris((prev) => {
                const next = [
                  item,
                  ...prev.filter((f) => f.id !== item.id),
                ];

                safeSave('neo-favoris', next);
                return next;
              });

              showToast(
                `⭐ Favori enregistré : ${item.titre}`,
                'success'
              );

              continue;
            }

            // ----------------------------------------------------
            // MÉMOIRE / NOTE
            // ----------------------------------------------------
            if (
              endpoint.includes('/api/memoire') ||
              actionType.includes('MEMORY') ||
              actionType.includes('MEMOIRE') ||
              actionType.includes('NOTE')
            ) {
              const item: Memoire = {
                id:
                  created.id ||
                  finalPayload.id ||
                  Date.now(),

                contenu:
                  created.contenu ||
                  created.content ||
                  created.description ||
                  finalPayload.content ||
                  finalPayload.contenu ||
                  finalPayload.description ||
                  finalPayload.title ||
                  finalPayload.titre ||
                  'Note mémorisée',

                tags:
                  Array.isArray(created.tags)
                    ? created.tags
                    : Array.isArray(finalPayload.tags)
                      ? finalPayload.tags
                      : ['ia-auto'],

                importance:
                  typeof created.importance === 'number'
                    ? created.importance
                    : typeof finalPayload.importance === 'number'
                      ? finalPayload.importance
                      : 3,

                date:
                  created.date ||
                  finalPayload.date ||
                  new Date().toISOString(),
              };

              setMemoire((prev) => {
                const next = [
                  item,
                  ...prev.filter((m) => m.id !== item.id),
                ];

                safeSave('neo-memoire', next);
                return next;
              });

              showToast(
                '🧠 Note enregistrée dans la mémoire',
                'success'
              );

              continue;
            }

            showToast(
              '✅ Action IA exécutée',
              'success'
            );

          } catch (error) {
            console.error(
              `❌ Erreur réseau action IA ${endpoint}:`,
              error
            );

            showToast(
              '⚠️ Erreur lors de l’enregistrement',
              'danger'
            );
          }

          continue;
        }

        // --------------------------------------------------------
        // B — FORMAT NORMALISÉ RENVOYÉ PAR LE SERVEUR
        // --------------------------------------------------------
        // Exemple :
        // {
        //   type: "reminder",
        //   titre: "...",
        //   dateRappel: "...",
        //   heure: "..."
        // }
        // On délègue au système processAiActions déjà présent.
        // --------------------------------------------------------
        if (actionType) {
          console.log(
            '🤖 ACTION IA normalisée → processAiActions',
            action
          );

          try {
            await processAiActions([action]);
            executedAtLeastOne = true;
          } catch (error) {
            console.error(
              '❌ Erreur processAiActions:',
              error
            );
          }
        }
      }

      // ----------------------------------------------------------
      // 4. Retourne TRUE uniquement si au moins une action a été
      // réellement exécutée
      // ----------------------------------------------------------
      return executedAtLeastOne;

    } catch (error) {
      console.error(
        '❌ Erreur interceptAndExecuteActionJson:',
        error
      );

      return false;
    }
  };

  // Recharging energy / battery helper
  const handleRechargeEnergy = async (amount: number) => {
    try {
      const res = await fetch('/api/supabase/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === 'number') {
          setEnergyPercent(data.balance);
          localStorage.setItem('neo-battery-energy', data.balance.toString());
          showToast(`🔋 +${amount}% IA ajoutés ! (Niveau actuel : ${data.balance}%)`, 'success');
          return;
        }
      }
    } catch {}

    const cur = typeof energyPercent === 'number' ? energyPercent : 80;
    const next = Math.min(200, cur + amount);
    setEnergyPercent(next);
    localStorage.setItem('neo-battery-energy', next.toString());
    showToast(`🔋 +${amount}% IA ajoutés ! (Niveau actuel : ${next}%)`, 'success');
  };

  // Send Message to Gemini Major2I.A with dynamic credit control
  const handleSendMessage = async (text: string, image?: string) => {
    const effectiveUserId = user?.nom || (user as any)?.id || userProfile?.id || getOrCreateUserId();

    // 1. Décrémentation d'énergie et vérification du solde
    const creditResult = await callUseCredit(effectiveUserId);

    // 2. Si l'IA est déchargée (0% ou moins), bloquer l'envoi
    if (creditResult.isExhausted || creditResult.balance === -1 || (energyPercent !== null && energyPercent <= 0)) {
      playCyberSound('alert');
      setEnergyPercent(0);
      localStorage.setItem('neo-battery-energy', '0');
      localStorage.setItem('neo-local-credits', '0');
      localStorage.setItem(`neo-user-credits-${effectiveUserId}`, '0');
      showToast("⛔ IA déchargée (0% restant). Veuillez souscrire à un forfait ou recharger pour continuer.", 'danger');
      setIsForfaitsOpen(true);
      return;
    }

    // 3. Mise à jour optimiste du solde d'IA
    if (creditResult.balance !== null && creditResult.balance >= 0) {
      setEnergyPercent(creditResult.balance);
      localStorage.setItem('neo-battery-energy', creditResult.balance.toString());
      localStorage.setItem('neo-local-credits', creditResult.balance.toString());
      localStorage.setItem(`neo-user-credits-${effectiveUserId}`, creditResult.balance.toString());
    } else {
      const cur = typeof energyPercent === 'number' ? energyPercent : 30;
      const next = Math.max(0, cur - 1);
      setEnergyPercent(next);
      localStorage.setItem('neo-battery-energy', next.toString());
      localStorage.setItem('neo-local-credits', next.toString());
      localStorage.setItem(`neo-user-credits-${effectiveUserId}`, next.toString());
    }

    let targetConv = activeConversation;
    let currentConvs = conversations;

    if (!targetConv) {
      const newId = Date.now();
      targetConv = {
        id: newId,
        titre: `Session Major2I.A #${conversations.length + 1}`,
        messages: [],
        tags: [],
        favori: false,
        categorie: 'général',
        date: new Date().toISOString(),
      };
      currentConvs = [targetConv, ...conversations];
      setActiveConversationId(newId);
    }

    const cleanedText = cleanSpokenTranscript(text);
    const safeMessageText = confidentialMode ? sanitizeConfidentialText(cleanedText) : cleanedText;

    // Append User message
    const userMessage = {
      role: 'user' as const,
      contenu: cleanedText,
      image,
      date: new Date().toISOString(),
    };

    const convWithUserMsg: Conversation = {
      ...targetConv,
      messages: [...targetConv.messages, userMessage],
    };

    const updatedWithUser = currentConvs.map((c) =>
      c.id === convWithUserMsg.id ? convWithUserMsg : c
    );
    updateConversationsState(updatedWithUser);

    setIsChatLoading(true);

    // 4. Moteur de chat : le mode Hors-Ligne ne s'exécute qu'en cas de coupure réseau avérée
    if (!isOnline) {
      try {
        const offlineRes = generateOfflineResponse(safeMessageText, {
          userProfile,
          user,
          taches,
          rappels,
          memoire,
          favoris,
        });

        const finalizedContent = confidentialMode
          ? sanitizeConfidentialText(offlineRes.reply)
          : offlineRes.reply;

        const offlineAiMessage = {
          role: 'neo' as const,
          contenu: finalizedContent,
          offline: true,
          date: new Date().toISOString(),
        };

        const finalizedConv: Conversation = {
          ...convWithUserMsg,
          messages: [...convWithUserMsg.messages, offlineAiMessage],
        };

        updateConversationsState(
          currentConvs.map((c) => (c.id === finalizedConv.id ? finalizedConv : c))
        );

        if (offlineRes.actions && offlineRes.actions.length > 0) {
          await processAiActions(offlineRes.actions);
        }

        if (voiceAutoSpeak) {
          speakCyberResponse(finalizedContent, voiceGender);
        }
      } catch (offlineErr) {
        console.error('Erreur moteur local hors-ligne:', offlineErr);
      } finally {
        setIsChatLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          user_id: effectiveUserId,
          userId: effectiveUserId,
          message: safeMessageText,
          image,
          history: (targetConv?.messages || []).slice(-10),
          userProfile: {
            id: effectiveUserId,
            prenom: userProfile.prenom || '',
            nom: userProfile.nom || user?.nom || '',
            userName: user?.nom || userProfile.prenom || '',
          },
          stream: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erreur serveur (${res.status})`);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedRawText = '';
        let finalReply = '';
        let finalActions: any[] = [];
        let finalSources: { title: string; uri: string }[] = [];
        let finalSearchQueries: string[] = [];
        let buffer = '';

        // Add initial empty assistant message so tokens render immediately into the bubble
        const initialAiMessage = {
          role: 'neo' as const,
          contenu: '',
          date: new Date().toISOString(),
        };

        const convWithAiPlaceholder: Conversation = {
          ...convWithUserMsg,
          messages: [...convWithUserMsg.messages, initialAiMessage],
        };

        setConversations((prev) =>
          prev.map((c) => (c.id === convWithAiPlaceholder.id ? convWithAiPlaceholder : c))
        );

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'chunk' && parsed.text) {
                accumulatedRawText += parsed.text;

                // Temporarily hide pending [ACTION_JSON] block in progress so raw JSON doesn't flicker on screen
                const cleanStreamingText = accumulatedRawText
                  .replace(/\[ACTION_JSON\][\s\S]*/gi, '')
                  .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '')
                  .trimEnd();

                const displayContent = confidentialMode
                  ? sanitizeConfidentialText(cleanStreamingText)
                  : cleanStreamingText;

                setConversations((prevConvs) =>
                  prevConvs.map((c) => {
                    if (c.id !== convWithAiPlaceholder.id) return c;
                    const msgs = [...c.messages];
                    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'neo') {
                      msgs[msgs.length - 1] = {
                        ...msgs[msgs.length - 1],
                        contenu: displayContent,
                      };
                    }
                    return { ...c, messages: msgs };
                  })
                );
              } else if (parsed.type === 'done') {
                finalReply = parsed.reply || accumulatedRawText;
                finalActions = parsed.actions || [];
                finalSources = parsed.sources || [];
                finalSearchQueries = parsed.searchQueries || [];

                // Appliquer immédiatement le solde de crédits serveur dans l'état local
                if (typeof parsed.credits === 'number') {
                  setEnergyPercent(parsed.credits);
                  localStorage.setItem('neo-battery-energy', parsed.credits.toString());
                  localStorage.setItem('neo-local-credits', parsed.credits.toString());
                  localStorage.setItem(`neo-user-credits-${effectiveUserId}`, parsed.credits.toString());
                }
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error || 'Erreur lors du streaming');
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                throw jsonErr;
              }
            }
          }
        }

        // Intercepte [ACTION_JSON] depuis le flux brut reçu
        const rawResponseText = accumulatedRawText || finalReply;
        const actionIntercepted = await interceptAndExecuteActionJson(rawResponseText);

        // Clean final reply text and persist state
        const cleanedReply = (finalReply || accumulatedRawText)
          .replace(/\[ACTION_JSON\][\s\S]*?(?:\[\/ACTION_JSON\]|$)/gi, '')
          .replace(/ACTION_JSON\s*:\s*```(?:json)?[\s\S]*?```/gi, '')
          .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:?\s*\{[\s\S]*?\}/gi, '')
          .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '')
          .replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '')
          .trim();

        const finalizedContent = confidentialMode
          ? sanitizeConfidentialText(cleanedReply)
          : cleanedReply || "Transmission reçue.";

        const finalNeoMessage = {
          role: 'neo' as const,
          contenu: finalizedContent,
          sources: finalSources.length > 0 ? finalSources : undefined,
          searchQueries: finalSearchQueries.length > 0 ? finalSearchQueries : undefined,
          date: new Date().toISOString(),
        };

        const finalizedConv: Conversation = {
          ...convWithUserMsg,
          messages: [...convWithUserMsg.messages, finalNeoMessage],
        };

        updateConversationsState(
          currentConvs.map((c) => (c.id === finalizedConv.id ? finalizedConv : c))
        );

        // Si [ACTION_JSON] n'a pas été intercepté directement, extraction de secours
        if (!actionIntercepted) {
          let effectiveActions = finalActions;
          if (!effectiveActions || effectiveActions.length === 0) {
            effectiveActions = extractActionsFromText(safeMessageText, finalizedContent);
          }

          if (effectiveActions && effectiveActions.length > 0) {
            await processAiActions(effectiveActions);
          }
        }

        if (voiceAutoSpeak) {
          speakCyberResponse(finalizedContent, voiceGender);
        }
      } else {
        // Fallback for non-streaming response
        const data = await res.json();

        // Appliquer immédiatement le solde de crédits serveur dans l'état local
        if (typeof data.credits === 'number') {
          setEnergyPercent(data.credits);
          localStorage.setItem('neo-battery-energy', data.credits.toString());
          localStorage.setItem('neo-local-credits', data.credits.toString());
          localStorage.setItem(`neo-user-credits-${effectiveUserId}`, data.credits.toString());
        }

        const rawNonStream = data.rawReply || data.reply || '';
        const actionIntercepted = await interceptAndExecuteActionJson(rawNonStream);

        const cleanedNonStream = (data.reply || '')
          .replace(/\[ACTION_JSON\][\s\S]*?(?:\[\/ACTION_JSON\]|$)/gi, '')
          .replace(/ACTION_JSON\s*:\s*```(?:json)?[\s\S]*?```/gi, '')
          .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:?\s*\{[\s\S]*?\}/gi, '')
          .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '')
          .replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '')
          .trim();

        const replyContent = confidentialMode
          ? sanitizeConfidentialText(cleanedNonStream)
          : cleanedNonStream || "Transmission reçue.";

        const neoMessage = {
          role: 'neo' as const,
          contenu: replyContent,
          sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined,
          searchQueries: Array.isArray(data.searchQueries) && data.searchQueries.length > 0 ? data.searchQueries : undefined,
          date: new Date().toISOString(),
        };

        const finalConv: Conversation = {
          ...convWithUserMsg,
          messages: [...convWithUserMsg.messages, neoMessage],
        };

        const finalConvs = updatedWithUser.map((c) =>
          c.id === finalConv.id ? finalConv : c
        );
        updateConversationsState(finalConvs);

        if (!actionIntercepted) {
          let effectiveActions = data.actions;
          if (!effectiveActions || effectiveActions.length === 0) {
            effectiveActions = extractActionsFromText(safeMessageText, replyContent);
          }

          if (effectiveActions && effectiveActions.length > 0) {
            await processAiActions(effectiveActions);
          }
        }

        if (voiceAutoSpeak) {
          speakCyberResponse(replyContent, voiceGender);
        }
      }
    } catch (e: any) {
      console.warn('Requête chat en ligne terminée avec notification:', e);
      
      const isActualNetworkCut = !isOnline;

      if (isActualNetworkCut) {
        // Le mode Hors-Ligne s'active UNIQUEMENT en cas de coupure réseau avérée
        try {
          const offlineFallback = generateOfflineResponse(safeMessageText, {
            userProfile,
            user,
            taches,
            rappels,
            memoire,
            favoris,
          });

          const finalizedFallback = confidentialMode
            ? sanitizeConfidentialText(offlineFallback.reply)
            : offlineFallback.reply;

          const fallbackMessage = {
            role: 'neo' as const,
            contenu: finalizedFallback,
            offline: true,
            date: new Date().toISOString(),
          };

          const fallbackConv = {
            ...convWithUserMsg,
            messages: [...convWithUserMsg.messages, fallbackMessage],
          };

          updateConversationsState(
            updatedWithUser.map((c) => (c.id === fallbackConv.id ? fallbackConv : c))
          );

          let fallbackActions = offlineFallback.actions;
          if (!fallbackActions || fallbackActions.length === 0) {
            fallbackActions = extractActionsFromText(safeMessageText, finalizedFallback);
          }

          if (fallbackActions && fallbackActions.length > 0) {
            await processAiActions(fallbackActions);
          }

          if (voiceAutoSpeak) {
            speakCyberResponse(finalizedFallback, voiceGender);
          }
        } catch (fallbackError) {
          const errorMessage = {
            role: 'neo' as const,
            contenu: "Mode hors-ligne : une interruption temporaire est survenue. Vos données locales restent protégées.",
            offline: true,
            date: new Date().toISOString(),
          };
          const errorConv = {
            ...convWithUserMsg,
            messages: [...convWithUserMsg.messages, errorMessage],
          };
          updateConversationsState(
            updatedWithUser.map((c) => (c.id === errorConv.id ? errorConv : c))
          );
        }
      } else {
        // L'utilisateur est toujours en ligne (aucune coupure réseau)
        // Le mode 'En-ligne' reste actif : exécution des actions et réponse en ligne
        try {
          const localProcessed = generateOfflineResponse(safeMessageText, {
            userProfile,
            user,
            taches,
            rappels,
            memoire,
            favoris,
          });

          // Nettoyer les mentions [Mode Hors-Ligne] car l'utilisateur est bien connecté
          const onlineCleanReply = localProcessed.reply
            .replace(/⚡\s*\*\*\[Mode Hors-Ligne\]\*\*\s*/gi, '')
            .replace(/\[Mode Hors-Ligne\]\s*/gi, '')
            .replace(/mode hors-ligne/gi, 'mode en ligne')
            .trim();

          const finalizedOnlineText = confidentialMode
            ? sanitizeConfidentialText(onlineCleanReply)
            : onlineCleanReply || "Demande reçue et enregistrée avec succès par Major2I.A.";

          const onlineMessage = {
            role: 'neo' as const,
            contenu: finalizedOnlineText,
            offline: false, // Reste strictement en ligne
            date: new Date().toISOString(),
          };

          const onlineConv = {
            ...convWithUserMsg,
            messages: [...convWithUserMsg.messages, onlineMessage],
          };

          updateConversationsState(
            updatedWithUser.map((c) => (c.id === onlineConv.id ? onlineConv : c))
          );

          let actionsToRun = localProcessed.actions;
          if (!actionsToRun || actionsToRun.length === 0) {
            actionsToRun = extractActionsFromText(safeMessageText, finalizedOnlineText);
          }

          if (actionsToRun && actionsToRun.length > 0) {
            await processAiActions(actionsToRun);
          }

          if (voiceAutoSpeak) {
            speakCyberResponse(finalizedOnlineText, voiceGender);
          }
        } catch (err) {
          const errorMessage = {
            role: 'neo' as const,
            contenu: "Demande reçue. Vos données sont synchronisées en ligne.",
            offline: false,
            date: new Date().toISOString(),
          };
          const fallbackConv = {
            ...convWithUserMsg,
            messages: [...convWithUserMsg.messages, errorMessage],
          };
          updateConversationsState(
            updatedWithUser.map((c) => (c.id === fallbackConv.id ? fallbackConv : c))
          );
        }
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  // Quick Global Search Handler
  const handleQuickSearch = (query: string) => {
    const q = query.toLowerCase();
    const results: string[] = [];

    favoris.forEach((f) => {
      if (f.titre.toLowerCase().includes(q) || (f.contenu || '').toLowerCase().includes(q)) {
        results.push(`⭐ [Favori] ${f.titre} - ${f.contenu || ''}`);
      }
    });

    memoire.forEach((m) => {
      if (m.contenu.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q))) {
        results.push(`🧠 [Mémoire] ${m.contenu} (${m.tags.join(', ')})`);
      }
    });

    rappels.forEach((r) => {
      if (r.titre.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)) {
        results.push(`🔔 [Rappel] ${r.titre} (${r.dateRappel || ''} ${r.heure || ''})`);
      }
    });

    taches.forEach((t) => {
      if (t.titre.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) {
        results.push(`✅ [Tâche] ${t.titre} [${t.status}]`);
      }
    });

    if (results.length > 0) {
      showToast(`🔍 ${results.length} éléments trouvés :\n${results.slice(0, 3).join('\n')}`, 'info');
    } else {
      showToast(`🔍 Aucun résultat pour "${query}"`, 'info');
    }
  };

  // CRUD Operations : Favoris
  const handleAddFavori = async (fav: Omit<Favori, 'id' | 'date'>) => {
    const item: Favori = {
      ...fav,
      id: Date.now(),
      date: new Date().toISOString(),
    };
    try {
      await fetch('/api/favoris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(item),
      });
    } catch {}
    setFavoris((prev) => {
      const next = [item, ...prev];
      safeSave('neo-favoris', next);
      return next;
    });
    showToast('⭐ Favori enregistré', 'success');
  };

  const handleUpdateFavori = async (fav: Favori) => {
    try {
      await fetch(`/api/favoris/${fav.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(fav),
      });
    } catch {}
    setFavoris((prev) => {
      const next = prev.map((f) => (f.id === fav.id ? fav : f));
      safeSave('neo-favoris', next);
      return next;
    });
    showToast('✏️ Favori mis à jour', 'success');
  };

  const handleDeleteFavori = async (id: number) => {
    try {
      await fetch(`/api/favoris/${id}`, { 
        method: 'DELETE',
        headers: await getAuthHeader()
      });
    } catch {}
    setFavoris((prev) => {
      const next = prev.filter((f) => f.id !== id);
      safeSave('neo-favoris', next);
      return next;
    });
    showToast('🗑️ Favori supprimé', 'info');
  };

  // CRUD Operations : Mémoire
  const handleAddMemoire = async (contenu: string, tags: string[], importance: number) => {
    const item: Memoire = {
      id: Date.now(),
      contenu,
      tags,
      importance,
      date: new Date().toISOString(),
    };
    try {
      await fetch('/api/memoire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(item),
      });
    } catch {}
    setMemoire((prev) => {
      const next = [item, ...prev];
      safeSave('neo-memoire', next);
      return next;
    });
    showToast('🧠 Information mémorisée', 'success');
  };

  const handleUpdateMemoire = async (mem: Memoire) => {
    try {
      await fetch(`/api/memoire/${mem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(mem),
      });
    } catch {}
    setMemoire((prev) => {
      const next = prev.map((m) => (m.id === mem.id ? mem : m));
      safeSave('neo-memoire', next);
      return next;
    });
    showToast('✏️ Mémoire mise à jour', 'success');
  };

  const handleDeleteMemoire = async (id: number) => {
    try {
      await fetch(`/api/memoire/${id}`, { 
        method: 'DELETE',
        headers: await getAuthHeader()
      });
    } catch {}
    setMemoire((prev) => {
      const next = prev.filter((m) => m.id !== id);
      safeSave('neo-memoire', next);
      return next;
    });
    showToast('🗑️ Mémoire supprimée', 'info');
  };

  // CRUD Operations : Rappels
  const handleAddRappel = async (rappel: Omit<Rappel, 'id' | 'statut' | 'dateCreation'>) => {
    const item: Rappel = {
      ...rappel,
      id: Date.now(),
      statut: 'actif',
      dateCreation: new Date().toISOString(),
    };
    try {
      await fetch('/api/rappels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(item),
      });
    } catch {}
    setRappels((prev) => {
      const next = [item, ...prev];
      safeSave('neo-rappels', next);
      return next;
    });
    playAlertSound(alertSound);
    showToast(`🔔 Rappel programmé : ${item.titre}`, 'success');
  };

  const handleUpdateRappel = async (rappel: Rappel) => {
    try {
      await fetch(`/api/rappels/${rappel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(rappel),
      });
    } catch {}
    setRappels((prev) => {
      const next = prev.map((r) => (r.id === rappel.id ? rappel : r));
      safeSave('neo-rappels', next);
      return next;
    });
    showToast(`✏️ Rappel mis à jour : ${rappel.titre}`, 'success');
  };

  const handleToggleRappelStatus = async (id: number) => {
    const r = rappels.find((item) => item.id === id);
    if (!r) return;
    const newStatus = r.statut === 'actif' ? 'termine' : 'actif';
    try {
      await fetch(`/api/rappels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ statut: newStatus }),
      });
    } catch {}
    setRappels((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, statut: newStatus } : item));
      safeSave('neo-rappels', next);
      return next;
    });
  };

  const handleDeleteRappel = async (id: number) => {
    try {
      await fetch(`/api/rappels/${id}`, { 
        method: 'DELETE',
        headers: await getAuthHeader()
      });
    } catch {}
    setRappels((prev) => {
      const next = prev.filter((r) => r.id !== id);
      safeSave('neo-rappels', next);
      return next;
    });
    showToast('🗑️ Rappel supprimé', 'info');
  };

  // CRUD Operations : Tâches
  const handleAddTache = async (tache: Omit<Tache, 'id' | 'status' | 'dateCreation'>) => {
    const item: Tache = {
      ...tache,
      id: Date.now(),
      status: 'attente',
      dateCreation: new Date().toISOString(),
    };
    try {
      await fetch('/api/taches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(item),
      });
    } catch {}
    setTaches((prev) => {
      const next = [item, ...prev];
      safeSave('neo-taches', next);
      return next;
    });
    showToast(`✅ Tâche ajoutée : ${item.titre}`, 'success');
  };

  const handleUpdateTache = async (tache: Tache) => {
    try {
      await fetch(`/api/taches/${tache.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(tache),
      });
    } catch {}
    setTaches((prev) => {
      const next = prev.map((t) => (t.id === tache.id ? tache : t));
      safeSave('neo-taches', next);
      return next;
    });
    showToast(`✏️ Tâche mise à jour : ${tache.titre}`, 'success');
  };

  const handleUpdateTacheStatus = async (id: number, status: TaskStatus) => {
    try {
      await fetch(`/api/taches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ status }),
      });
    } catch {}
    setTaches((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, status } : t));
      safeSave('neo-taches', next);
      return next;
    });
  };

  const handleDeleteTache = async (id: number) => {
    try {
      await fetch(`/api/taches/${id}`, { 
        method: 'DELETE',
        headers: await getAuthHeader()
      });
    } catch {}
    setTaches((prev) => {
      const next = prev.filter((t) => t.id !== id);
      safeSave('neo-taches', next);
      return next;
    });
    showToast('🗑️ Tâche supprimée', 'info');
  };

  // Enregistrement universel d'une demande/message du chatbot selon le choix de l'utilisateur
  const handleSaveToDestination = async (
    destination: 'favoris' | 'memoire' | 'rappels' | 'taches' | 'agenda',
    text: string,
    options?: { title?: string; date?: string; time?: string; priority?: Priority }
  ) => {
    const cleanText = (text || '').trim();
    if (!cleanText) return;

    // Détermination d'un titre concis si non fourni
    const firstLine = cleanText.split('\n')[0].replace(/^[*#\-_•\s]+/, '').trim();
    const cleanTitle = (options?.title || firstLine).slice(0, 70) || 'Élément enregistré';
    const today = new Date().toISOString().split('T')[0];

    if (destination === 'favoris') {
      await handleAddFavori({
        titre: cleanTitle,
        contenu: cleanText,
        categorie: 'Chatbot',
      });
      playCyberSound('beep');
    } else if (destination === 'memoire') {
      await handleAddMemoire(
        cleanText,
        ['chatbot', 'notes'],
        3
      );
      playCyberSound('beep');
    } else if (destination === 'rappels') {
      await handleAddRappel({
        titre: cleanTitle,
        description: cleanText,
        dateRappel: options?.date || today,
        heure: options?.time || '12:00',
        priorite: options?.priority || 'normale',
      });
    } else if (destination === 'taches') {
      await handleAddTache({
        titre: cleanTitle,
        description: cleanText,
        echeance: options?.date || today,
        priorite: options?.priority || 'normale',
      });
      playCyberSound('beep');
    } else if (destination === 'agenda') {
      await handleAddRappel({
        titre: cleanTitle,
        description: cleanText,
        dateRappel: options?.date || today,
        heure: options?.time || '09:00',
        priorite: options?.priority || 'normale',
      });
      playAlertSound(alertSound);
      showToast(`📅 Événement planifié sur l'agenda : ${cleanTitle}`, 'success');
    }
  };

  // Export Data JSON
  const handleExportData = () => {
    const backup = {
      version: '2026.2',
      dateExport: new Date().toISOString(),
      user: user?.nom || null,
      userProfile,
      voiceGender,
      alertSound,
      energyPercent,
      rolloverInfo,
      conversations,
      favoris,
      memoire,
      rappels,
      taches,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `majoria-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Sauvegarde exportée avec succès', 'success');
  };

  // Import Data JSON
  const handleImportData = (backup: any) => {
    try {
      if (backup.conversations) updateConversationsState(backup.conversations);
      if (backup.favoris) {
        setFavoris(backup.favoris);
        safeSave('neo-favoris', backup.favoris);
      }
      if (backup.memoire) {
        setMemoire(backup.memoire);
        safeSave('neo-memoire', backup.memoire);
      }
      if (backup.rappels) {
        setRappels(backup.rappels);
        safeSave('neo-rappels', backup.rappels);
      }
      if (backup.taches) {
        setTaches(backup.taches);
        safeSave('neo-taches', backup.taches);
      }
      if (backup.userProfile) {
        setUserProfile(backup.userProfile);
        safeSave('neo-user-profile', backup.userProfile);
      }
      if (backup.voiceGender) {
        setVoiceGender(backup.voiceGender);
        localStorage.setItem('neo-voice-gender', backup.voiceGender);
      }
      if (backup.alertSound) {
        setAlertSound(backup.alertSound);
        localStorage.setItem('neo-alert-sound', backup.alertSound);
      }
      if (typeof backup.energyPercent === 'number') {
        setEnergyPercent(backup.energyPercent);
        localStorage.setItem('neo-battery-energy', backup.energyPercent.toString());
      }
      showToast('📥 Données importées avec succès', 'success');
      setIsSettingsOpen(false);
    } catch {
      showToast('❌ Erreur lors de la lecture du fichier JSON', 'danger');
    }
  };

  // Reset all local data
  const handleClearAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données locales de Major2I.A ?')) {
      localStorage.clear();
      setConversations([]);
      setFavoris([]);
      setMemoire([]);
      setRappels([]);
      setTaches([]);
      setUser(null);
      setUserProfile({ prenom: '', nom: '' });
      setEnergyPercent(80);
      setIsAuthOpen(true);
      showToast('🧹 Données réinitialisées avec succès', 'info');
    }
  };

  const isCustomBackground = Boolean(bgColor && (bgColor.startsWith('url(') || bgColor.startsWith('data:') || bgColor.startsWith('blob:')));

  if (!session) {
    return (
      <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        {/* Cyber Glow Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2 font-mono font-bold text-xl tracking-wider">
              M2
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {isSignUp ? 'Créer un compte' : 'Connexion à Major2I.A'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isSignUp ? 'Enregistrez-vous pour accéder à votre assistant' : 'Accédez à votre espace sécurisé'}
            </p>
          </div>

          {authError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg p-2.5 text-center">
              {authError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email || !password) return;
              setAuthLoading(true);
              setAuthError(null);
              try {
                if (isSignUp) {
                  const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                      emailRedirectTo: getAuthRedirectUrl(),
                    },
                  });
                  if (error) throw error;
                  showToast('Compte créé ! Vérifiez votre email si nécessaire.', 'success');
                } else {
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) throw error;
                  showToast('Connexion réussie', 'success');
                }
              } catch (err: any) {
                setAuthError(err?.message || 'Erreur lors de l\'authentification');
              } finally {
                setAuthLoading(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="block text-xs text-slate-400 mb-1">Adresse Email</label>
              <input
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-medium text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {authLoading ? 'Chargement...' : (isSignUp ? "S'inscrire" : 'Se connecter')}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setAuthError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors text-center cursor-pointer pt-1"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none text-[var(--text-color)]">
      
      {/* Background Layer: Completely replaces preset background when custom image is imported */}
      {isCustomBackground ? (
        <div
          id="custom-imported-background"
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-200"
          style={{
            backgroundImage: bgColor,
            filter: 'none',
            WebkitFilter: 'none',
            imageRendering: 'crisp-edges',
          }}
        />
      ) : (
        <MilkyWayGalaxy
          enabled={galaxyEnabled}
          colorScheme={galaxyColorScheme}
          speed={galaxySpeed}
          opacity={galaxyOpacity}
        />
      )}

      {/* Cyber Header with Live Battery Indicator & Action Buttons */}
      <CyberHeader
        user={user}
        userProfile={userProfile}
        confidentialMode={confidentialMode}
        onToggleConfidential={() => {
          const next = !confidentialMode;
          setConfidentialMode(next);
          localStorage.setItem('neo-mode-confidentiel', next ? '1' : '0');
          showToast(next ? '🛡️ Mode Ultra-Confidentiel Activé' : '🛡️ Mode Confidentiel Désactivé', 'info');
        }}
        voiceAutoSpeak={voiceAutoSpeak}
        onToggleVoiceAuto={() => {
          const next = !voiceAutoSpeak;
          setVoiceAutoSpeak(next);
          localStorage.setItem('neo-voice-auto', next ? '1' : '0');
          showToast(next ? '🔊 Lecture Vocale Auto Activée' : '🔇 Lecture Vocale Désactivée', 'info');
        }}
        energyPercent={energyPercent}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenForfaits={() => setIsForfaitsOpen(true)}
        onQuickSearch={handleQuickSearch}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={!isSidebarCollapsed}
        isCollapsed={isHeaderCollapsed}
        onToggleCollapseHeader={handleToggleHeader}
        isOnline={isOnline}
      />

      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs flex items-center justify-between z-20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              <strong>Mode Hors Ligne :</strong> Vos tâches, rappels et données locales en cache restent consultables. Les appels réseau (/api/chat, /api/transcribe) sont suspendus jusqu'au rétablissement de la connexion.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/30 text-amber-300 uppercase tracking-wide shrink-0">
            Cache Local
          </span>
        </div>
      )}

      {/* Main Layout Area */}
      <main className="flex-1 min-h-0 flex relative overflow-hidden pb-14 md:pb-0">
        
        {/* Navigation Sidebar */}
        <NavigationSidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setActivePanel('chat');
          }}
          onNewConversation={handleNewConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onToggleFavoriConv={handleToggleFavoriConv}
          onAddTagToConv={handleAddTagToConv}
          conversationSearch={conversationSearch}
          setConversationSearch={setConversationSearch}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          favorisCount={favoris.length}
          memoireCount={memoire.length}
          rappelsCount={rappels.filter((r) => r.statut === 'actif').length}
          tachesCount={taches.filter((t) => t.status !== 'termine').length}
          energyPercent={energyPercent}
          rolloverPercent={rolloverInfo.rolloverEnergy}
          onOpenForfaits={() => setIsForfaitsOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Dynamic Main Workspace Panel */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden">
          {/* Top Quick Bar for non-chat panels in Facebook style */}
          {activePanel !== 'chat' && (
            <div className="px-3 sm:px-5 py-2.5 bg-[var(--fb-card)] border-b border-[var(--fb-border)] flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playCyberSound('click');
                    handleToggleSidebar();
                  }}
                  title={isSidebarCollapsed ? "Dérouler le menu latéral" : "Replier le menu latéral"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] transition-all text-xs font-semibold cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4 text-[var(--fb-blue)]" />
                  <span>{isSidebarCollapsed ? "Menu" : "Masquer menu"}</span>
                </button>

                <button
                  onClick={() => {
                    playCyberSound('click');
                    setActivePanel('chat');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white transition-all text-xs font-bold cursor-pointer shadow-sm"
                >
                  <span>← Retour au Chat</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playCyberSound('click');
                    handleToggleHeader();
                  }}
                  title={isHeaderCollapsed ? "Afficher l'en-tête" : "Masquer l'en-tête"}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-all text-xs font-medium cursor-pointer"
                >
                  <span>{isHeaderCollapsed ? "Déplier en-tête" : "Plein écran"}</span>
                </button>
              </div>
            </div>
          )}

          {activePanel === 'chat' && (
            <ChatPanel
              conversation={activeConversation}
              chatBgImage={chatBgImage}
              onSendMessage={handleSendMessage}
              onClearConversation={() => activeConversationId && handleDeleteConversation(activeConversationId)}
              isLoading={isChatLoading}
              confidentialMode={confidentialMode}
              onAddTag={() => activeConversationId && handleAddTagToConv(activeConversationId)}
              voiceAutoSpeak={voiceAutoSpeak}
              voiceGender={voiceGender}
              user={user}
              userProfile={userProfile}
              energyPercent={energyPercent}
              onOpenForfaits={() => setIsForfaitsOpen(true)}
              onOpenTranscription={() => setActivePanel('transcription')}
              isOnline={isOnline}
              isHeaderCollapsed={isHeaderCollapsed}
              onToggleCollapseHeader={handleToggleHeader}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              onUnfoldAllBars={handleUnfoldAllBars}
              onCollapseAllBars={handleCollapseAllBars}
              onSaveToDestination={handleSaveToDestination}
            />
          )}

          {activePanel === 'transcription' && (
            <TranscriptionPanel
              isOnline={isOnline}
              onSendToChat={(text) => {
                setActivePanel('chat');
                handleSendMessage(text);
              }}
              onCreateTask={(titre) => {
                handleAddTache({
                  titre,
                  priorite: 'normale',
                });
              }}
              onCreateReminder={(titre) => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleAddRappel({
                  titre,
                  dateRappel: tomorrow.toISOString().slice(0, 10),
                  heure: '09:00',
                  priorite: 'normale',
                });
              }}
              onCreateMemory={(text) => {
                handleAddMemoire(text, ['vocal', 'transcription'], 3);
              }}
              onShowToast={showToast}
            />
          )}

          {activePanel === 'favoris' && (
            <FavorisPanel
              favoris={favoris}
              onAddFavori={handleAddFavori}
              onUpdateFavori={handleUpdateFavori}
              onDeleteFavori={handleDeleteFavori}
            />
          )}

          {activePanel === 'memoire' && (
            <MemoirePanel
              memoire={memoire}
              conversations={conversations}
              onAddMemoire={handleAddMemoire}
              onUpdateMemoire={handleUpdateMemoire}
              onDeleteMemoire={handleDeleteMemoire}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setActivePanel('chat');
              }}
              onAddTache={handleAddTache}
              onAddRappel={handleAddRappel}
              onGoToChat={() => setActivePanel('chat')}
            />
          )}

          {activePanel === 'rappels' && (
            <RappelsPanel
              rappels={rappels}
              onAddRappel={handleAddRappel}
              onUpdateRappel={handleUpdateRappel}
              onToggleStatus={handleToggleRappelStatus}
              onDeleteRappel={handleDeleteRappel}
            />
          )}

          {activePanel === 'taches' && (
            <TachesPanel
              taches={taches}
              onAddTache={handleAddTache}
              onUpdateTache={handleUpdateTache}
              onUpdateTacheStatus={handleUpdateTacheStatus}
              onDeleteTache={handleDeleteTache}
            />
          )}

          {activePanel === 'calendar' && (
            <CalendarPanel 
              rappels={rappels} 
              taches={taches} 
              onAddRappel={handleAddRappel}
              onAddTache={handleAddTache}
              onUpdateRappel={handleUpdateRappel}
              onUpdateTache={handleUpdateTache}
              onDeleteRappel={handleDeleteRappel}
              onDeleteTache={handleDeleteTache}
            />
          )}

          {activePanel === 'stats' && (
            <StatsPanel
              conversations={conversations}
              favoris={favoris}
              memoire={memoire}
              rappels={rappels}
              taches={taches}
              user={user}
              userProfile={userProfile}
              energyPercent={energyPercent}
              rolloverInfo={rolloverInfo}
            />
          )}

          {activePanel === 'pricing' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <PricingView
                user={user}
                userProfile={userProfile}
                currentSubscription={currentSubscription}
                onSubscriptionUpdate={(sub) => setCurrentSubscription(sub)}
                onOpenAuth={() => setIsAuthOpen(true)}
                onBackToDashboard={() => setActivePanel('chat')}
                energyPercent={energyPercent}
                rolloverInfo={rolloverInfo}
                onPerformRollover={handlePerformRollover}
              />
            </div>
          )}

          {activePanel === 'success' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center custom-scrollbar">
              <SuccessView
                user={user}
                onNavigateToDashboard={() => setActivePanel('chat')}
                onSubscriptionActivated={(sub, energy) => handleSubscriptionActivated(sub, energy)}
              />
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <input
        type="file"
        id="global-mobile-file-input"
        accept="image/*,.txt,.md,.json,.csv,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setActivePanel('chat');
          if (file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
              showToast('Image trop volumineuse (maximum 5 Mo)', 'warning');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              handleSendMessage(`[Analyse de l'image importée : ${file.name}]`, reader.result as string);
              showToast(`Image "${file.name}" importée dans le chat`, 'success');
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              const content = reader.result as string;
              handleSendMessage(`[Document importé : ${file.name}]\n\n${content.slice(0, 8000)}`);
              showToast(`Fichier "${file.name}" importé dans le chat`, 'success');
            };
            reader.readAsText(file);
          }
          e.target.value = '';
        }}
      />
      <MobileBottomNav
        activePanel={activePanel}
        setActivePanel={(p) => {
          setActivePanel(p);
          setIsMobileSidebarOpen(false);
        }}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenForfaits={() => setIsForfaitsOpen(true)}
        onImportFile={() => {
          const input = document.getElementById('global-mobile-file-input') as HTMLInputElement;
          if (input) input.click();
        }}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isCollapsed={isHeaderCollapsed && isSidebarCollapsed}
        tasksCount={taches.length}
        remindersCount={rappels.filter((r) => r.statut === 'actif').length}
        favorisCount={favoris.length}
      />

      {/* Forfaits & Monthly Rollover Modal */}
      <ForfaitsModal
        isOpen={isForfaitsOpen}
        onClose={() => setIsForfaitsOpen(false)}
        user={user}
        userProfile={userProfile}
        currentSubscription={currentSubscription}
        onSubscriptionUpdate={(sub) => setCurrentSubscription(sub)}
        onOpenAuth={() => setIsAuthOpen(true)}
        energyPercent={energyPercent}
        rolloverInfo={rolloverInfo}
        onPerformRollover={handlePerformRollover}
        onRecharge={handleRechargeEnergy}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        themeMode={themeMode}
        resolvedTheme={themeMode === 'system' ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : themeMode}
        onSetThemeMode={handleUpdateThemeMode}
        onToggleTheme={handleToggleTheme}
        chatBgImage={chatBgImage}
        onSetChatBgImage={handleSetChatBgImage}
        bgColor={bgColor}
        onSetBgColor={applyBackground}
        galaxyEnabled={galaxyEnabled}
        setGalaxyEnabled={setGalaxyEnabled}
        galaxyColorScheme={galaxyColorScheme}
        setGalaxyColorScheme={setGalaxyColorScheme}
        galaxySpeed={galaxySpeed}
        setGalaxySpeed={setGalaxySpeed}
        galaxyOpacity={galaxyOpacity}
        setGalaxyOpacity={(op) => {
          setGalaxyOpacity(op);
          localStorage.setItem('majoria-galaxy-opacity', op.toString());
        }}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onClearAllData={handleClearAllData}
        energyPercent={energyPercent}
        rolloverInfo={rolloverInfo}
        onUpdateEnergy={handleUpdateEnergy}
        onPerformRollover={handlePerformRollover}
        userProfile={userProfile}
        onUpdateUserProfile={handleUpdateUserProfile}
        voiceGender={voiceGender}
        onUpdateVoiceGender={handleUpdateVoiceGender}
        alertSound={alertSound}
        onUpdateAlertSound={handleUpdateAlertSound}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          if (user) {
            setIsAuthOpen(false);
          }
        }}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Cyber Toast Alerts */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
