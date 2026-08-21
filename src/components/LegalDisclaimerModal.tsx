import React, { useState } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  Scale, 
  Server, 
  X, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck,
  Cpu,
  Database,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { playCyberSound } from '../utils/security';

interface LegalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cgv' | 'lcen';
}

export const LegalDisclaimerModal: React.FC<LegalDisclaimerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cgv'
}) => {
  const [activeTab, setActiveTab] = useState<'cgv' | 'lcen'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-4xl w-full border-[0.5px] border-white/20 rounded-2xl bg-[#030914]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border-[0.5px] border-sky-400/30 text-sky-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-lg sm:text-xl flex items-center gap-2">
                Cadre Juridique & Mentions Légales
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Conditions Générales de Vente, Clause de non-responsabilité IA et Conformité LCEN
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            aria-label="Fermer"
            className="p-1.5 rounded-xl border-[0.5px] border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border-[0.5px] border-white/10 w-fit">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setActiveTab('cgv');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'cgv'
                ? 'bg-sky-500/20 text-sky-300 border-[0.5px] border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Clause de Non-Responsabilité & CGV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setActiveTab('lcen');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'lcen'
                ? 'bg-sky-500/20 text-sky-300 border-[0.5px] border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Mentions Légales (Loi LCEN)</span>
          </button>
        </div>

        {/* Tab 1: CGV & Disclaimer */}
        {activeTab === 'cgv' && (
          <div className="space-y-5 text-slate-200 text-xs sm:text-sm leading-relaxed">
            
            {/* Disclaimer Highlight */}
            <div className="p-4 rounded-xl bg-amber-500/10 border-[0.5px] border-amber-400/30 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Clause de Non-Responsabilité Générale (Disclaimer IA)</span>
              </div>
              <p>
                L'application <strong>MajorI.A</strong> intègre des modèles de traitement automatique du langage naturel et d'intelligence artificielle générative. Les réponses, analyses, codes, résumés, calculs et prédictions fournis par l'assistant ont une vocation strictement <strong>informative, consultative et d'assistance à la productivité</strong>.
              </p>
              <p>
                L'Éditeur ne garantit en aucun cas l'exactitude absolue, l'exhaustivité ou l'actualité en temps réel des informations générées. L'utilisateur demeure <strong>seul responsable</strong> de la vérification préalable et de l'utilisation qu'il fait des contenus générés. Les sorties de l'IA ne se substituent en aucun cas à un conseil professionnel certifié (médical, juridique, financier, fiscal, comptable ou technique).
              </p>
            </div>

            {/* Clause 1 : Propriété Intellectuelle */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-sky-400">
                <FileCheck className="w-4 h-4 text-sky-400 shrink-0" />
                1. Propriété Intellectuelle & Droits sur les Contenus Générés
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>
                  <strong>Contenus fournis par l'Utilisateur (Prompts & Entrées) :</strong> L'Utilisateur conserve l'intégralité de ses droits de propriété intellectuelle sur les textes, images, documents ou données qu'il transmet à l'assistant MajorI.A. L'Utilisateur garantit qu'il dispose de tous les droits et autorisations nécessaires sur ces éléments.
                </li>
                <li>
                  <strong>Contenus générés par l'IA (Outputs) :</strong> Dans la mesure permise par les lois applicables (notamment le Code de la Propriété Intellectuelle français), les résultats bruts générés par l'assistant en réponse aux requêtes de l'Utilisateur sont mis à la disposition de ce dernier pour un usage personnel ou professionnel, commercial ou non commercial.
                </li>
                <li>
                  <strong>Éléments logiciels & Marque :</strong> L'architecture logicielle, le code source, le design d'interface, les algorithmes de routage, les éléments graphiques et la marque <em>MajorI.A</em> demeurent la propriété exclusive de l'Éditeur. Toute reproduction, décompilation ou rétro-ingénierie non autorisée est formellement prohibée.
                </li>
              </ul>
            </div>

            {/* Clause 2 : Gestion des Requêtes Abusives & Sécurité */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-rose-400">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                2. Gestion des Requêtes Abusives, Sécurité & Suspension d'Accès
              </h3>
              <p className="text-slate-300">
                Afin de garantir la stabilité du service et le respect de l'ordre public, l'utilisation de MajorI.A est soumise aux règles de modération suivantes :
              </p>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>
                  <strong>Interdictions formelles :</strong> Il est strictement interdit d'utiliser le service pour générer, inciter ou diffuser des contenus illicites, haineux, diffamatoires, terroristes, à caractère pédopornographique, portant atteinte à la vie privée d'autrui, ou visant à concevoir des cyberattaques (malwares, exploits, phishing).
                </li>
                <li>
                  <strong>Tentatives de contournement (Jailbreak / Prompt Injection) :</strong> Toute tentative délibérée de contourner les filtres de sécurité, de saturer l'infrastructure par des requêtes massives automatisées (DDoS/Spam) ou d'extraire des données de tiers est prohibée.
                </li>
                <li>
                  <strong>Mesures conservatoires :</strong> L'Éditeur se réserve le droit de bloquer immédiatement une requête, de suspendre temporairement ou de résilier définitivement le compte et l'accès à la formule d'un utilisateur en cas de manquement constaté, sans préavis ni remboursement des énergies/crédits restants.
                </li>
              </ul>
            </div>

            {/* Modalités des Formules & Report d'Énergie */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                3. Consommation d'Énergie IA & Report Automatique
              </h3>
              <p className="text-slate-300">
                Chaque compte dispose d'un forfait d'énergie calculé en pourcentage ou crédits. Le report automatique s'applique à la fin de chaque cycle de facturation : toute énergie non consommée est cumulative et reportée sur la période suivante tant que le compte demeure actif.
              </p>
            </div>

          </div>
        )}

        {/* Tab 2: Mentions Légales LCEN */}
        {activeTab === 'lcen' && (
          <div className="space-y-5 text-slate-200 text-xs sm:text-sm leading-relaxed">
            
            {/* LCEN Introduction */}
            <div className="p-4 rounded-xl bg-sky-500/10 border-[0.5px] border-sky-400/30 text-sky-200">
              <p>
                Conformément aux dispositions des <strong>articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN)</strong>, les présentes mentions légales sont portées à la connaissance des utilisateurs et visiteurs de l'application <strong>MajorI.A</strong>.
              </p>
            </div>

            {/* Éditeur de l'application */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-sky-400">
                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                1. Édition & Publication du Service
              </h3>
              <ul className="space-y-1.5 text-slate-300">
                <li><strong>Nom de l'application :</strong> MajorI.A (Assistant Personnel & Plateforme IA)</li>
                <li><strong>Responsable de publication :</strong> Julien (Contact : <span className="font-mono text-sky-300">julien26730@gmail.com</span>)</li>
                <li><strong>Statut :</strong> Édition de service numérique & applicatif web interactif</li>
                <li><strong>Contact Support :</strong> <span className="font-mono text-sky-300">julien26730@gmail.com</span></li>
              </ul>
            </div>

            {/* Hébergement & Infrastructure Technique Déclarée */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-indigo-400">
                <Server className="w-4 h-4 text-indigo-400 shrink-0" />
                2. Hébergement & Infrastructure Technique Déclarée
              </h3>
              <p className="text-slate-300">
                L'infrastructure technique de l'application repose sur un ensemble de fournisseurs de services cloud hautement sécurisés :
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-black/40 border-[0.5px] border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-sky-300">
                    <Cpu className="w-3.5 h-3.5" />
                    Hébergeur Cloud & Exécution Serveur
                  </div>
                  <div className="text-slate-300 text-xs">
                    <strong>Google Cloud Platform (Google LLC / Google Ireland Ltd)</strong><br />
                    Gordon House, Barrow Street, Dublin 4, Irlande<br />
                    Infrastructure Cloud Run & Edge Computing (Région Europe-West)
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border-[0.5px] border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-emerald-300">
                    <Database className="w-3.5 h-3.5" />
                    Base de Données & Authentification
                  </div>
                  <div className="text-slate-300 text-xs">
                    <strong>Supabase Inc. / PostgreSQL Cloud</strong><br />
                    970 Toa Payoh North #07-04, Singapore<br />
                    Données chiffrées en transit (TLS 1.3) et au repos (AES-256)
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border-[0.5px] border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-purple-300">
                    <Cpu className="w-3.5 h-3.5" />
                    Moteurs de Traitement IA
                  </div>
                  <div className="text-slate-300 text-xs">
                    <strong>Google GenAI APIs (Modèles Gemini 2.5 / 3.7)</strong><br />
                    Traitement sécurisé des prompts sans réentraînement sur données utilisateur privées
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border-[0.5px] border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-teal-300">
                    <Lock className="w-3.5 h-3.5" />
                    Protection & Confidentialité
                  </div>
                  <div className="text-slate-300 text-xs">
                    <strong>Chiffrement Client AES-GCM</strong><br />
                    Filtre local de protection des identifiants et données sensibles
                  </div>
                </div>
              </div>
            </div>

            {/* RGPD & Données personnelles */}
            <div className="p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                3. Protection des Données Personnelles (RGPD)
              </h3>
              <p className="text-slate-300">
                Conformément au Règlement Général sur la Protection des Données (RGPD 2016/679) et à la Loi Informatique et Libertés du 6 janvier 1978 modifiée :
              </p>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                <li>L'utilisateur dispose d'un droit d'accès, de rectification, de portabilité et de suppression de l'ensemble de ses données (mémoires, tâches, rappels, discussions).</li>
                <li>L'application met à disposition un outil d'export complet en format JSON ainsi qu'un bouton de suppression définitive en 1 clic dans les Paramètres.</li>
                <li>Pour toute demande relative aux données personnelles : contactez <span className="font-mono text-sky-300">julien26730@gmail.com</span>.</li>
              </ul>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-sky-400" />
            <span>Document légal en vigueur — Version 2026</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border-[0.5px] border-white/20 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
