import React, { useState, useEffect } from 'react';
import { Lock, User, LogOut, X, UserPlus, LogIn, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
        isMandatory ? 'bg-black/80' : 'bg-black/60'
      }`}
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-md w-full border border-[#ced0d4] rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e6eb]">
          <div className="flex items-center gap-2.5 text-base font-bold text-[#050505]">
            <div className="w-9 h-9 rounded-full bg-[#1877f2] flex items-center justify-center text-white shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="leading-tight">Connexion & Espace Sécurisé</div>
              {isMandatory && (
                <div className="text-[11px] font-medium text-[#fa383e]">
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
              className="w-8 h-8 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676b] hover:text-[#050505] flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#fa383e] border border-rose-200">
              Accès requis
            </span>
          )}
        </div>

        {user ? (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-2xl bg-[#f0f2f5] border border-[#e4e6eb] space-y-2.5">
              <div className="flex items-center gap-2 text-[#42b72a] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Session Active & Sécurisée</span>
              </div>
              <p className="text-[#050505] text-xs sm:text-sm">
                Vous êtes connecté sous l'identifiant <strong className="font-bold text-[#1877f2]">{user.nom}</strong>.
              </p>
              <div className="text-xs text-[#65676b] pt-1 border-t border-[#e4e6eb] font-medium">
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fa383e] hover:bg-red-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-bold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f0f2f5] rounded-full border border-[#e4e6eb]">
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-[#1877f2] text-white shadow-xs'
                    : 'text-[#65676b] hover:text-[#050505]'
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
                className={`py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#1877f2] text-white shadow-xs'
                    : 'text-[#65676b] hover:text-[#050505]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            </div>

            <p className="text-xs text-[#65676b] font-medium leading-relaxed">
              {authMode === 'register'
                ? "Créez votre compte pour sécuriser vos discussions, rappels et données personnelles."
                : "Connectez-vous avec votre identifiant et mot de passe pour accéder à votre espace de travail."}
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#fa383e] text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {authMode === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#65676b] mb-1 font-bold">Nom d'utilisateur / Identifiant</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[#65676b]" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Julien, Sarah..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] focus:border-[#1877f2] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:ring-1 focus:ring-[#1877f2] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#65676b] mb-1 font-bold">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Au moins 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] focus:border-[#1877f2] focus:bg-white rounded-xl px-3 py-2 pr-10 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:ring-1 focus:ring-[#1877f2] font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                      title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#65676b] mb-1 font-bold">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Répétez le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] focus:border-[#1877f2] focus:bg-white rounded-xl px-3 py-2 pr-10 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:ring-1 focus:ring-[#1877f2] font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                      title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Case à cocher Afficher le mot de passe */}
                <div className="flex items-center gap-2 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#65676b] hover:text-[#050505] select-none text-xs font-medium">
                    <input
                      type="checkbox"
                      id="show-password-register"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-4 h-4 rounded border-[#ced0d4] text-[#1877f2] focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
                    />
                    <span>Afficher le mot de passe</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  Valider la création du compte
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#65676b] mb-1 font-bold">Nom d'utilisateur / Identifiant</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[#65676b]" />
                    <input
                      type="text"
                      required
                      placeholder="Votre identifiant"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] focus:border-[#1877f2] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:ring-1 focus:ring-[#1877f2] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#65676b] mb-1 font-bold">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] focus:border-[#1877f2] focus:bg-white rounded-xl px-3 py-2 pr-10 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:ring-1 focus:ring-[#1877f2] font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                      title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Case à cocher Afficher le mot de passe */}
                <div className="flex items-center gap-2 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#65676b] hover:text-[#050505] select-none text-xs font-medium">
                    <input
                      type="checkbox"
                      id="show-password-login"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-4 h-4 rounded border-[#ced0d4] text-[#1877f2] focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
                    />
                    <span>Afficher le mot de passe</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs shadow-sm transition-all active:scale-98 cursor-pointer"
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
