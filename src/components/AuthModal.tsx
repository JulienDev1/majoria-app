import React, { useState, useEffect } from 'react';
import { Lock, User, LogOut, X, UserPlus, LogIn, CheckCircle2, AlertCircle } from 'lucide-react';
import { playCyberSound } from '../utils/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { nom: string } | null;
  onLogin: (username: string, password: string) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      try {
        const savedAccounts = JSON.parse(localStorage.getItem('neo-registered-accounts') || '{}');
        if (Object.keys(savedAccounts).length > 0) {
          setAuthMode('login');
        } else {
          setAuthMode('register');
        }
      } catch {
        setAuthMode('register');
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const isMandatory = !user;

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg("Veuillez saisir un nom d'utilisateur.");
      return;
    }
    if (cleanUser.length < 2) {
      setErrorMsg("Le nom d'utilisateur doit comporter au moins 2 caractères.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      const accounts = JSON.parse(localStorage.getItem('neo-registered-accounts') || '{}');
      const hash = btoa(String.fromCharCode(...new TextEncoder().encode(password))).slice(0, 32);
      
      accounts[cleanUser.toLowerCase()] = {
        displayName: cleanUser,
        hash,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('neo-registered-accounts', JSON.stringify(accounts));

      playCyberSound('success');
      onLogin(cleanUser, password);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      onClose();
    } catch (err) {
      onLogin(cleanUser, password);
      onClose();
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg("Veuillez saisir votre identifiant.");
      return;
    }
    if (!password) {
      setErrorMsg("Veuillez saisir votre mot de passe.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      const accounts = JSON.parse(localStorage.getItem('neo-registered-accounts') || '{}');
      const account = accounts[cleanUser.toLowerCase()];
      const currentHash = btoa(String.fromCharCode(...new TextEncoder().encode(password))).slice(0, 32);

      if (account) {
        if (account.hash !== currentHash) {
          setErrorMsg("Mot de passe incorrect pour ce compte.");
          playCyberSound('alert');
          return;
        }
      } else {
        accounts[cleanUser.toLowerCase()] = {
          displayName: cleanUser,
          hash: currentHash,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('neo-registered-accounts', JSON.stringify(accounts));
      }

      playCyberSound('success');
      onLogin(cleanUser, password);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      onClose();
    } catch (err) {
      onLogin(cleanUser, password);
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isMandatory ? 'bg-[#030914]/90 backdrop-blur-2xl' : 'bg-black/80 backdrop-blur-xl'
      }`}
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-md w-full border-[0.5px] border-white/20 rounded-2xl bg-[#030914]/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-base font-bold text-white">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border-[0.5px] border-white/20 flex items-center justify-center text-sky-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="leading-tight">Connexion & Espace Sécurisé</div>
              {isMandatory && (
                <div className="text-[11px] font-normal text-rose-300">
                  Création de compte ou connexion obligatoire
                </div>
              )}
            </div>
          </div>
          
          {!isMandatory ? (
            <button
              onClick={() => {
                playCyberSound('click');
                onClose();
              }}
              className="p-1.5 rounded-xl border-[0.5px] border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border-[0.5px] border-rose-400">
              Accès requis
            </span>
          )}
        </div>

        {user ? (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-white/[0.04] border-[0.5px] border-white/15 space-y-2.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Session Active & Sécurisée</span>
              </div>
              <p className="text-slate-200 text-xs sm:text-sm">
                Vous êtes connecté sous l'identifiant <strong className="text-white font-bold">{user.nom}</strong>.
              </p>
              <div className="text-xs text-slate-400 pt-1 border-t border-white/10">
                Vos mémoires, rappels, tâches et discussions sont chiffrés avec votre clé personnelle.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  playCyberSound('alert');
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 border-[0.5px] border-white/20 text-white font-semibold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 border-[0.5px] border-white/20 text-white hover:bg-white/20 font-semibold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] rounded-xl border-[0.5px] border-white/10">
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-sky-600/80 text-white shadow-md border-[0.5px] border-white/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Créer un compte</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setAuthMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-sky-600/80 text-white shadow-md border-[0.5px] border-white/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {authMode === 'register'
                ? "Créez votre compte pour sécuriser vos discussions, rappels et données personnelles."
                : "Connectez-vous avec votre identifiant et mot de passe pour accéder à votre espace de travail."}
            </p>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border-[0.5px] border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {authMode === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Nom d'utilisateur / Identifiant</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Julien, Sarah..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="Au moins 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 border-[0.5px] border-white/30 text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  Valider la création du compte
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Nom d'utilisateur / Identifiant</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Votre identifiant"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 border-[0.5px] border-white/30 text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  Se connecter
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
