import { UserProfile, Tache, Rappel, Memoire, Favori } from '../types';

export interface OfflineContext {
  userProfile?: UserProfile;
  user?: { nom: string } | null;
  taches?: Tache[];
  rappels?: Rappel[];
  memoire?: Memoire[];
  favoris?: Favori[];
}

export interface OfflineAiResponse {
  reply: string;
  actions?: any[];
  sources?: { title: string; uri: string }[];
  offline: boolean;
}

/**
 * Intelligent client-side NLP engine for Major2I.A
 * Runs locally with zero internet connection requirement.
 */
export function generateOfflineResponse(
  prompt: string,
  context: OfflineContext
): OfflineAiResponse {
  const cleanPrompt = (prompt || '').trim();
  const lower = cleanPrompt.toLowerCase();
  const userName = context.userProfile?.prenom || context.user?.nom || 'Agent';

  const actions: any[] = [];
  let reply = '';

  // 1. Note / Memory intent: "note que...", "note dans le menu...", "mémorise...", "enregistre..."
  if (
    lower.startsWith('note ') ||
    lower.startsWith('note que') ||
    lower.startsWith('note dans le menu') ||
    lower.includes('note dans le menu') ||
    lower.includes('note-moi') ||
    lower.includes('note moi') ||
    lower.startsWith('mémoire') ||
    lower.startsWith('memoire') ||
    lower.includes('mémorise') ||
    lower.includes('mémoriser') ||
    lower.includes('retiens que') ||
    lower.includes('souviens-toi de') ||
    lower.includes('enregistre en mémoire') ||
    lower.includes('enregistre dans le menu')
  ) {
    let memoContent = cleanPrompt
      .replace(/^(note dans le menu que|note dans le menu|note-moi que|note moi que|note-moi|note moi|note que|note|mémoire|memoire|mémorise|mémoriser|retiens que|souviens-toi de|enregistre en mémoire|enregistre dans le menu)\s*:?\s*/i, '')
      .trim();

    if (!memoContent) memoContent = cleanPrompt;

    actions.push({
      type: 'memoire',
      action: 'add',
      item: {
        contenu: memoContent,
        tags: ['hors-ligne', 'menu'],
        importance: 4,
      },
    });

    reply = `⚡ **[Mode Hors-Ligne] Note enregistrée avec succès dans le menu Mémoire.**\n\n> *"${memoContent}"*\n\nCette information a été ajoutée à vos données neuronales locales et reste immédiatement accessible dans le panneau **Mémoire** du menu.`;
    return { reply, actions, offline: true };
  }

  // 2. Task intent: create/add a task
  if (
    lower.startsWith('tâche') ||
    lower.startsWith('tache') ||
    lower.includes('ajoute une tâche') ||
    lower.includes('ajouter une tâche') ||
    lower.includes('crée une tâche') ||
    lower.includes('créer une tâche') ||
    lower.includes('nouvelle tâche') ||
    lower.includes('rajoute une tâche') ||
    lower.startsWith('todo ') ||
    (lower.startsWith('ajoute ') && !lower.includes('rappel') && !lower.includes('favori'))
  ) {
    let taskTitle = cleanPrompt
      .replace(/^(tâche|tache|todo|ajoute une tâche|ajouter une tâche|crée une tâche|créer une tâche|nouvelle tâche|rajoute une tâche|ajoute)\s*:?\s*/i, '')
      .replace(/^(de|pour|qui consiste à|dans le menu)\s+/i, '')
      .trim();

    if (!taskTitle) taskTitle = 'Nouvelle tâche planifiée';

    const isHighPriority = lower.includes('urgent') || lower.includes('important') || lower.includes('prioritaire');
    const priority = isHighPriority ? 'haute' : 'normale';

    actions.push({
      type: 'tache',
      action: 'add',
      item: {
        titre: taskTitle,
        description: `Tâche créée en mode hors-ligne par Major2I.A pour ${userName}`,
        priorite: priority,
        status: 'attente',
      },
    });

    reply = `⚡ **[Mode Hors-Ligne] Tâche enregistrée avec succès dans le menu Tâches.**\n\n- **Intitulé :** ${taskTitle}\n- **Priorité :** ${priority === 'haute' ? '🔴 Haute' : '🔵 Normale'}\n- **Statut :** ⏳ En attente\n\n*La tâche est visible immédiatement dans la section **Tâches** de votre menu.*`;
    return { reply, actions, offline: true };
  }

  // 2. Reminder intent: create/add a reminder
  if (
    lower.startsWith('rappel') ||
    lower.includes('rappelle-moi') ||
    lower.includes('rappelle moi') ||
    lower.includes('ajoute un rappel') ||
    lower.includes('ajouter un rappel') ||
    lower.includes('crée un rappel') ||
    lower.includes('créer un rappel') ||
    lower.includes('programme un rappel')
  ) {
    let reminderTitle = cleanPrompt
      .replace(/^(rappel|rappelle-moi|rappelle moi|ajoute un rappel|ajouter un rappel|crée un rappel|créer un rappel)\s*:?\s*/i, '')
      .replace(/^(de|que|pour)\s+/i, '')
      .trim();

    if (!reminderTitle) reminderTitle = 'Rappel programmé';

    // Extract potential time (ex: à 14h, 15:30)
    let timeMatch = lower.match(/(?:à|vers|a)\s*(\d{1,2})[h:]?(\d{2})?/i);
    let reminderHour = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}` : '09:00';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    actions.push({
      type: 'rappel',
      action: 'add',
      item: {
        titre: reminderTitle,
        description: `Rappel généré en mode autonome par Major2I.A`,
        dateRappel: todayStr,
        heure: reminderHour,
        priorite: 'haute',
        statut: 'actif',
      },
    });

    reply = `⚡ **[Mode Hors-Ligne] Rappel configuré.**\n\n- **Objet :** ${reminderTitle}\n- **Date :** Aujourd'hui (${todayStr})\n- **Heure :** ${reminderHour}\n- **Statut :** 🔔 Actif\n\n*Votre alerte retentira conformément à vos préférences sonores.*`;
    return { reply, actions, offline: true };
  }

  // 3. Memory intent: store memory or note
  if (
    lower.startsWith('mémoire') ||
    lower.startsWith('memoire') ||
    lower.includes('mémorise') ||
    lower.includes('mémoriser') ||
    lower.includes('retiens que') ||
    lower.includes('souviens-toi de') ||
    lower.includes('enregistre en mémoire')
  ) {
    let memoContent = cleanPrompt
      .replace(/^(mémoire|memoire|mémorise|mémoriser|retiens que|souviens-toi de|enregistre en mémoire)\s*:?\s*/i, '')
      .trim();

    if (!memoContent) memoContent = 'Note enregistrée en mémoire';

    actions.push({
      type: 'memoire',
      action: 'add',
      item: {
        contenu: memoContent,
        tags: ['hors-ligne', 'automatique'],
        importance: 4,
      },
    });

    reply = `⚡ **[Mode Hors-Ligne] Donnée neuronale mémorisée.**\n\n> *"${memoContent}"*\n\nCette information est désormais ancrée dans votre banque de mémoire locale et restera disponible à tout moment.`;
    return { reply, actions, offline: true };
  }

  // 4. Favorite intent
  if (
    lower.includes('ajoute en favori') ||
    lower.includes('ajouter en favori') ||
    lower.includes('mets en favori') ||
    lower.includes('sauvegarde en favori')
  ) {
    let favTitle = cleanPrompt
      .replace(/.*(?:ajoute en favori|ajouter en favori|mets en favori|sauvegarde en favori)\s*:?\s*/i, '')
      .trim();

    if (!favTitle) favTitle = 'Favori sauvegardé';

    actions.push({
      type: 'favori',
      action: 'add',
      item: {
        titre: favTitle,
        contenu: `Sauvegarde locale par Major2I.A`,
        categorie: 'Général',
      },
    });

    reply = `⚡ **[Mode Hors-Ligne] Élément ajouté à vos favoris.**\n\n⭐ **${favTitle}** a été épinglé dans votre bibliothèque.`;
    return { reply, actions, offline: true };
  }

  // 5. Querying local tasks
  if (lower.includes('mes tâches') || lower.includes('mes taches') || lower.includes('liste des tâches') || lower.includes('que dois-je faire')) {
    const list = context.taches || [];
    if (list.length === 0) {
      reply = `⚡ **[Mode Hors-Ligne]** Vous n'avez actuellement aucune tâche en attente dans votre espace local. Tout est à jour !`;
    } else {
      const activeList = list.filter((t) => t.status !== 'termine');
      reply = `⚡ **[Mode Hors-Ligne] Synthèse de vos tâches locales (${activeList.length} actives) :**\n\n` +
        activeList.slice(0, 8).map((t, idx) => `${idx + 1}. **${t.titre}** — Priorité : *${t.priorite}* | Statut : *${t.status}*`).join('\n') +
        `\n\n*Toutes vos données restent synchronisées localement sans connexion.*`;
    }
    return { reply, offline: true };
  }

  // 6. Querying local reminders
  if (lower.includes('mes rappels') || lower.includes('liste des rappels') || lower.includes('prochains rappels')) {
    const list = (context.rappels || []).filter((r) => r.statut === 'actif');
    if (list.length === 0) {
      reply = `⚡ **[Mode Hors-Ligne]** Aucun rappel actif programmé pour le moment.`;
    } else {
      reply = `⚡ **[Mode Hors-Ligne] Vos rappels actifs (${list.length}) :**\n\n` +
        list.slice(0, 8).map((r, idx) => `${idx + 1}. 🔔 **${r.titre}** — ${r.dateRappel || 'Aujourd\'hui'} à ${r.heure || '09:00'}`).join('\n') +
        `\n\n*Les alertes sonores locales restent pleinement opérationnelles.*`;
    }
    return { reply, offline: true };
  }

  // 7. Querying local memory
  if (lower.includes('ma mémoire') || lower.includes('que sais-tu sur moi') || lower.includes('mes informations') || lower.includes('mes souvenirs')) {
    const list = context.memoire || [];
    if (list.length === 0) {
      reply = `⚡ **[Mode Hors-Ligne]** Votre banque de mémoire locale est actuellement vierge. Vous pouvez m'indiquer des informations à mémoriser (ex: *"Mémorise que..."*).`;
    } else {
      reply = `⚡ **[Mode Hors-Ligne] Connaissances locales mémorisées (${list.length}) :**\n\n` +
        list.slice(0, 6).map((m, idx) => `${idx + 1}. 🧠 *${m.contenu}* (${m.tags.join(', ')})`).join('\n');
    }
    return { reply, offline: true };
  }

  // 8. Calculations & Math expressions
  const mathMatch = cleanPrompt.match(/(?:calcule|calculer|combien font|combien fait|\=|\?)\s*([0-9\s\+\-\*\/\^\(\)\.\,]+)/i);
  if (mathMatch && mathMatch[1]) {
    try {
      const sanitizedExpr = mathMatch[1].replace(/,/g, '.').replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');
      if (sanitizedExpr.length >= 3 && /[\+\-\*\/]/.test(sanitizedExpr)) {
        // Safe evaluation without eval
        const fn = new Function(`return (${sanitizedExpr});`);
        const result = fn();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          reply = `⚡ **[Mode Hors-Ligne] Résultat du calcul :**\n\n$$\n${sanitizedExpr.trim()} = ${result}\n$$\n\nLe calcul a été exécuté instantanément par le processeur local.`;
          return { reply, offline: true };
        }
      }
    } catch {}
  }

  // 9. Time and Date
  if (
    lower.includes('heure est-il') ||
    lower.includes('quelle heure') ||
    lower.includes('la date') ||
    lower.includes('quel jour') ||
    lower.includes('aujourd\'hui')
  ) {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    reply = `⚡ **[Mode Hors-Ligne] Horloge Système :**\n\n- 📅 **Date :** ${dateFormatted}\n- ⏱️ **Heure locale :** ${timeFormatted}\n\n*Synchronisation sur l'horloge système interne.*`;
    return { reply, offline: true };
  }

  // 10. Greetings & Identity
  if (
    lower.startsWith('bonjour') ||
    lower.startsWith('salut') ||
    lower.startsWith('hello') ||
    lower.startsWith('coucou') ||
    lower.startsWith('hey') ||
    lower.includes('qui es-tu') ||
    lower.includes('présente-toi')
  ) {
    reply = `⚡ **[Mode Hors-Ligne] Bonjour ${userName} !**\n\nJe suis **Major2I.A**, votre assistant personnel intelligent opérant actuellement via son **moteur local de secours**.\n\nVous pouvez me demander de :\n- 📝 Gérer vos **tâches** (*"Ajoute une tâche..."*)\n- 🔔 Programmer des **rappels** (*"Rappelle-moi de..."*)\n- 🧠 Mémoriser des informations (*"Retiens que..."*)\n- 🧮 Réaliser des calculs mathématiques et conversions\n- 📊 Consulter votre agenda et vos notes locales\n\n*Dès que la connexion internet sera rétablie, les fonctionnalités avancées de recherche web et de génération multimodale reprendront automatiquement.*`;
    return { reply, offline: true };
  }

  // 11. Help / Assistance request
  if (lower.includes('aide') || lower.includes('help') || lower.includes('que peux-tu faire') || lower.includes('commandes')) {
    reply = `⚡ **[Mode Hors-Ligne] Guide des Fonctionnalités Autonomes :**\n\n1. **Organisation & Productivité :**\n   - *"Crée une tâche Réviser le rapport"* : ajoute instantanément une tâche.\n   - *"Rappelle-moi à 15h30 de téléphoner"* : active une alerte sonore.\n   - *"Retiens que le code d'accès est 4920"* : enregistre dans la mémoire neuronale.\n\n2. **Consultation Rapide :**\n   - *"Affiche mes tâches"* / *"Mes rappels"* / *"Ma mémoire"*\n   - *"Quelle heure est-il ?"*\n\n3. **Calculs & Logique :**\n   - *"Calcule 450 * 1.2"* ou expressions directes.\n\n*Toutes ces opérations fonctionnent à 100% hors-ligne sans consommer de bande passante.*`;
    return { reply, offline: true };
  }

  // 12. General structured response fallback
  reply = `⚡ **[Mode Hors-Ligne] Réponse du Moteur Local Major2I.A**\n\nVotre demande : *"${cleanPrompt}"*\n\nJe fonctionne actuellement en mode autonome (sans connexion active aux serveurs distants). J'ai bien pris en compte votre requête :\n\n- **État du système :** Moteur IA local actif\n- **Sécurité :** Vos données restent 100% confinées à votre appareil\n- **Actions possibles :** Vous pouvez me demander de créer des tâches, des rappels, d'enregistrer des notes ou de réaliser des calculs.\n\n*Pour les analyses approfondies avec recherche web en temps réel, reconnectez votre appareil à Internet.*`;

  return { reply, actions, offline: true };
}
