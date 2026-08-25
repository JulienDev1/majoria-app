import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  UserSubscription
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
      const authUser = localStorage.getItem('neo-auth-user');
      const authHash = localStorage.getItem('neo-auth-hash');
      if (authUser && authHash) {
        return { nom: authUser };
      }
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
  const [galaxyEnabled, setGalaxyEnabled] = useState<boolean>(true);
  const [galaxyColorScheme, setGalaxyColorScheme] = useState<GalaxyColorScheme>('milky-way-classic');
  const [galaxySpeed, setGalaxySpeed] = useState<number>(1);
  const [galaxyOpacity, setGalaxyOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('majoria-galaxy-opacity');
    return saved ? parseFloat(saved) : 0.85;
  });

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
    
    // 1. Mise à jour synchrone et immédiate de l'état React de la batterie (widgets sidebar & header)
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
      showToast(`✨ Forfait ${sub.planName || sub.planId.toUpperCase()} activé ! Batterie synchronisée à ${newEnergy}%.`, 'success');
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
      document.body.style.setProperty('--page-bg-color', bg || '#020612');
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
    const savedBg = localStorage.getItem('neo-bg') || '#020612';
    applyBackground(savedBg);

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

  const loadAllData = async () => {
    // Load Conversations
    const savedConvs = safeLoad<Conversation[]>('neo-conversations', []);
    if (savedConvs.length > 0) {
      setConversations(savedConvs);
      setActiveConversationId(savedConvs[0].id);
    } else {
      // Seed Initial Greeting Conversation with user name if present
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
              ? `Bonjour ${userProfile.prenom}, et bienvenue sur MajorI.A. Comment puis-je vous aider aujourd'hui ?`
              : "Bonjour et bienvenue sur MajorI.A. Comment puis-je vous aider aujourd'hui ?",
            date: new Date().toISOString(),
          },
        ],
      };
      setConversations([initialConv]);
      setActiveConversationId(initialConv.id);
      safeSave('neo-conversations', [initialConv]);
    }

    // Load Favoris
    try {
      const res = await fetch(`${API}/favoris`);
      if (res.ok) {
        const data = await res.json();
        setFavoris(data);
      } else {
        setFavoris(safeLoad('neo-favoris', []));
      }
    } catch {
      setFavoris(safeLoad('neo-favoris', []));
    }

    // Load Memoire
    try {
      const res = await fetch(`${API}/memoire`);
      if (res.ok) {
        const data = await res.json();
        setMemoire(data);
      } else {
        setMemoire(safeLoad('neo-memoire', []));
      }
    } catch {
      setMemoire(safeLoad('neo-memoire', []));
    }

    // Load Rappels
    try {
      const res = await fetch(`${API}/rappels`);
      if (res.ok) {
        const data = await res.json();
        setRappels(data);
      } else {
        setRappels(safeLoad('neo-rappels', []));
      }
    } catch {
      setRappels(safeLoad('neo-rappels', []));
    }

    // Load Taches
    try {
      const res = await fetch(`${API}/taches`);
      if (res.ok) {
        const data = await res.json();
        setTaches(data);
      } else {
        setTaches(safeLoad('neo-taches', []));
      }
    } catch {
      setTaches(safeLoad('neo-taches', []));
    }

    // Load Supabase Energy / Battery with Subscription priority
    try {
      const authUser = localStorage.getItem('neo-auth-user') || undefined;
      const sub = await fetchUserSubscription(authUser);
      if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
        setCurrentSubscription(sub);
        const targetEnergy = sub.planId === 'pro' ? 500 : sub.planId === 'premium' ? 250 : 100;
        setEnergyPercent((prev) => (prev === null || prev < 100 ? targetEnergy : Math.max(prev, targetEnergy)));
        localStorage.setItem('neo-battery-energy', targetEnergy.toString());
        localStorage.setItem('neo-local-credits', targetEnergy.toString());
        if (authUser) {
          localStorage.setItem(`neo-user-credits-${authUser}`, targetEnergy.toString());
        }
        syncCreditsToSupabase(authUser, targetEnergy).catch(() => {});
      } else {
        const balance = await getCreditBalance(authUser);
        if (balance !== null && balance >= 0) {
          setEnergyPercent(balance);
          localStorage.setItem('neo-battery-energy', balance.toString());
        }
      }
    } catch (err) {
      console.warn('Erreur chargement batterie IA:', err);
    }
  };

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
                new Notification(`🔔 MajorI.A - Rappel d’échéance`, {
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
      titre: `Session MajorI.A #${conversations.length + 1}`,
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
        titre: 'Session MajorI.A #1',
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

  // Process AI Automated Actions (Tâches, Rappels, Mémoire, Favoris)
  const processAiActions = async (actions: any[]) => {
    if (!Array.isArray(actions) || actions.length === 0) return;

    for (const rawAction of actions) {
      try {
        // Normalize action structure (handles both flat { type: 'task', titre: '...' } and nested { type: 'tache', action: 'add', item: { ... } })
        const actType = (rawAction.type || '').toLowerCase();
        const itemData = rawAction.item || rawAction;

        if (actType === 'memory' || actType === 'memoire') {
          const item: Memoire = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            contenu: itemData.contenu || itemData.titre || itemData.description || 'Note mémorisée',
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

          // 2. Sync with backend if available
          try {
            fetch(`${API}/memoire`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch(() => {});
          } catch {}

          showToast('🧠 Nouvelle note mémorisée', 'success');
        } else if (actType === 'reminder' || actType === 'rappel') {
          const item: Rappel = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.titre || itemData.nom || 'Rappel MajorI.A',
            description: itemData.description || '',
            dateRappel: itemData.dateRappel || new Date().toISOString().split('T')[0],
            heure: itemData.heure || '12:00',
            dateFinRappel: itemData.dateFinRappel || undefined,
            heureFin: itemData.heureFin || undefined,
            priorite: (itemData.priorite as Priority) || 'normale',
            statut: itemData.statut || 'actif',
            dateCreation: itemData.dateCreation || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setRappels((prev) => {
            const next = [item, ...prev.filter((r) => r.id !== item.id)];
            safeSave('neo-rappels', next);
            return next;
          });

          // 2. Sync with backend if available
          try {
            fetch(`${API}/rappels`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch(() => {});
          } catch {}

          playAlertSound(alertSound);
          showToast(`🔔 Rappel créé : ${item.titre}`, 'success');
        } else if (actType === 'task' || actType === 'tache') {
          const item: Tache = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.titre || itemData.nom || 'Tâche MajorI.A',
            description: itemData.description || '',
            priorite: (itemData.priorite as Priority) || 'normale',
            status: itemData.status || 'attente',
            echeance: itemData.echeance || itemData.dateRappel || '',
            dateCreation: itemData.dateCreation || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setTaches((prev) => {
            const next = [item, ...prev.filter((t) => t.id !== item.id)];
            safeSave('neo-taches', next);
            return next;
          });

          // 2. Sync with backend if available
          try {
            fetch(`${API}/taches`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch(() => {});
          } catch {}

          showToast(`✅ Tâche ajoutée : ${item.titre}`, 'success');
        } else if (actType === 'favorite' || actType === 'favori') {
          const item: Favori = {
            id: itemData.id || Date.now() + Math.floor(Math.random() * 1000),
            titre: itemData.titre || itemData.nom || 'Favori',
            contenu: itemData.contenu || itemData.description || '',
            categorie: itemData.categorie || 'général',
            date: itemData.date || new Date().toISOString(),
          };

          // 1. Update React state immediately
          setFavoris((prev) => {
            const next = [item, ...prev.filter((f) => f.id !== item.id)];
            safeSave('neo-favoris', next);
            return next;
          });

          // 2. Sync with backend if available
          try {
            fetch(`${API}/favoris`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch(() => {});
          } catch {}

          showToast(`⭐ Favori enregistré : ${item.titre}`, 'success');
        }
      } catch (err) {
        console.error('Erreur traitement action IA:', err);
      }
    }
  };

  // Recharging energy / battery helper
  const handleRechargeEnergy = async (amount: number) => {
    try {
      const res = await fetch(`${API}/supabase/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === 'number') {
          setEnergyPercent(data.balance);
          localStorage.setItem('neo-battery-energy', data.balance.toString());
          showToast(`🔋 +${amount}% Batterie ajoutés ! (Niveau actuel : ${data.balance}%)`, 'success');
          return;
        }
      }
    } catch {}

    const cur = typeof energyPercent === 'number' ? energyPercent : 80;
    const next = Math.min(200, cur + amount);
    setEnergyPercent(next);
    localStorage.setItem('neo-battery-energy', next.toString());
    showToast(`🔋 +${amount}% Batterie ajoutés ! (Niveau actuel : ${next}%)`, 'success');
  };

  // Send Message to Gemini MajorI.A with Supabase RPC consumption call
  const handleSendMessage = async (text: string, image?: string) => {
    // 1. Décrémentation d'énergie via Supabase RPC
    const creditResult = await callUseCredit(user?.nom);

    // 2. Si la batterie est déchargée (-1 ou 0%), bloquer l'envoi
    if (creditResult.isExhausted || creditResult.balance === -1 || (energyPercent !== null && energyPercent <= 0)) {
      playCyberSound('alert');
      setEnergyPercent(0);
      localStorage.setItem('neo-battery-energy', '0');
      showToast("⛔ Batterie IA déchargée (0% restant). Veuillez souscrire à un forfait ou recharger pour continuer.", 'danger');
      setIsForfaitsOpen(true);
      return;
    }

    // 3. Mettre à jour le pourcentage de batterie restant
    if (creditResult.balance !== null && creditResult.balance >= 0) {
      setEnergyPercent(creditResult.balance);
      localStorage.setItem('neo-battery-energy', creditResult.balance.toString());
    } else {
      // Local decrement fallback (e.g. -2% per query)
      const cur = typeof energyPercent === 'number' ? energyPercent : 80;
      const next = Math.max(0, cur - 1);
      setEnergyPercent(next);
      localStorage.setItem('neo-battery-energy', next.toString());
    }

    let targetConv = activeConversation;
    let currentConvs = conversations;

    if (!targetConv) {
      const newId = Date.now();
      targetConv = {
        id: newId,
        titre: `Session MajorI.A #${conversations.length + 1}`,
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

    // 4. Hybrid Chat Engine: If client is offline, process immediately with local offline engine
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
        },
        body: JSON.stringify({
          message: safeMessageText,
          image,
          history: (targetConv?.messages || []).slice(-10),
          userProfile: {
            prenom: userProfile.prenom || '',
            nom: userProfile.nom || '',
            userName: user?.nom || '',
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

                // Temporarily hide pending ACTION_JSON block in progress so raw JSON doesn't flicker on screen
                const cleanStreamingText = accumulatedRawText
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

        // Clean final reply text and persist state
        const cleanedReply = (finalReply || accumulatedRawText)
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

        // Extract actions from server or fallback NLP extractor
        let effectiveActions = finalActions;
        if (!effectiveActions || effectiveActions.length === 0) {
          effectiveActions = extractActionsFromText(safeMessageText, finalizedContent);
        }

        if (effectiveActions && effectiveActions.length > 0) {
          await processAiActions(effectiveActions);
        }

        if (voiceAutoSpeak) {
          speakCyberResponse(finalizedContent, voiceGender);
        }
      } else {
        // Fallback for non-streaming response
        const data = await res.json();

        const replyContent = confidentialMode
          ? sanitizeConfidentialText(data.reply)
          : data.reply || "Transmission reçue.";

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

        let effectiveActions = data.actions;
        if (!effectiveActions || effectiveActions.length === 0) {
          effectiveActions = extractActionsFromText(safeMessageText, replyContent);
        }

        if (effectiveActions && effectiveActions.length > 0) {
          await processAiActions(effectiveActions);
        }

        if (voiceAutoSpeak) {
          speakCyberResponse(replyContent, voiceGender);
        }
      }
    } catch (e: any) {
      console.warn('Requête en ligne échouée, activation du basculement automatique hors-ligne:', e);
      
      // Automatic Fallback to lightweight local AI engine
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
          contenu: e?.message || "Désolé, une erreur de communication est survenue. Veuillez vérifier votre réseau ou renvoyer votre message.",
          date: new Date().toISOString(),
        };
        const errorConv = {
          ...convWithUserMsg,
          messages: [...convWithUserMsg.messages, errorMessage],
        };
        updateConversationsState(
          updatedWithUser.map((c) => (c.id === errorConv.id ? errorConv : c))
        );
        showToast('⚠️ Réseau indisponible : basculement de secours', 'danger');
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
      await fetch(`${API}/favoris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/favoris/${fav.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/favoris/${id}`, { method: 'DELETE' });
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
      await fetch(`${API}/memoire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/memoire/${mem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/memoire/${id}`, { method: 'DELETE' });
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
      await fetch(`${API}/rappels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/rappels/${rappel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/rappels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/rappels/${id}`, { method: 'DELETE' });
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
      await fetch(`${API}/taches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/taches/${tache.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/taches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API}/taches/${id}`, { method: 'DELETE' });
    } catch {}
    setTaches((prev) => {
      const next = prev.filter((t) => t.id !== id);
      safeSave('neo-taches', next);
      return next;
    });
    showToast('🗑️ Tâche supprimée', 'info');
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
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données locales de MajorI.A ?')) {
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

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none text-slate-100">
      
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenForfaits={() => setIsForfaitsOpen(true)}
        onQuickSearch={handleQuickSearch}
      />

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
        />

        {/* Dynamic Main Workspace Panel */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden">
          {activePanel === 'chat' && (
            <ChatPanel
              conversation={activeConversation}
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
            />
          )}

          {activePanel === 'transcription' && (
            <TranscriptionPanel
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
              onAddMemoire={handleAddMemoire}
              onUpdateMemoire={handleUpdateMemoire}
              onDeleteMemoire={handleDeleteMemoire}
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
