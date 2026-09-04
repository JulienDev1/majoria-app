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

// Built-in Knowledge Base for Offline Mode
const KNOWLEDGE_BASE: { keywords: string[]; title: string; content: string }[] = [
  {
    keywords: ['capitale de la france', 'capitale france', 'capital of france'],
    title: 'Capitale de la France',
    content: 'La capitale de la France est **Paris**, traversée par la Seine et célèbre pour ses monuments comme la Tour Eiffel, le Musée du Louvre et la Cathédrale Notre-Dame.',
  },
  {
    keywords: ['capitale de', 'capitale du', 'capitale des', 'capital of'],
    title: 'Géographie Mondiale',
    content: 'Voici les capitales des principaux pays :\n- **France :** Paris\n- **Royaume-Uni :** Londres\n- **Espagne :** Madrid\n- **Italie :** Rome\n- **Allemagne :** Berlin\n- **États-Unis :** Washington D.C.\n- **Canada :** Ottawa\n- **Japon :** Tokyo\n- **Chine :** Pékin\n- **Brésil :** Brasília\n- **Australie :** Canberra\n- **Suisse :** Berne\n- **Belgique :** Bruxelles',
  },
  {
    keywords: ['planetes', 'système solaire', 'planète', 'planete'],
    title: 'Le Système Solaire',
    content: 'Le système solaire compte **8 planètes** principales en orbite autour du Soleil :\n1. **Mercure** (la plus proche du Soleil)\n2. **Vénus** (la plus chaude)\n3. **Terre** (notre planète)\n4. **Mars** (la planète rouge)\n5. **Jupiter** (la plus grande, géante gazeuse)\n6. **Saturne** (célèbre pour ses anneaux)\n7. **Uranus** (géante de glace)\n8. **Neptune** (la plus éloignée)',
  },
  {
    keywords: ['qui est tu', 'qui es tu', 'qui es-tu', 'major2i.a', 'majoria'],
    title: 'Identité de Major2I.A',
    content: 'Je suis **Major2I.A**, votre assistant personnel intelligent conçu pour optimiser votre productivité, gérer votre planning, vos notes, vos rappels et répondre à vos questions avec précision.',
  },
  {
    keywords: ['pomodoro', 'technique pomodoro', 'méthode pomodoro'],
    title: 'Technique Pomodoro',
    content: 'La **technique Pomodoro** est une méthode de gestion du temps efficace :\n1. Choisissez une tâche à accomplir.\n2. Travaillez concentré pendant **25 minutes** (un pomodoro).\n3. Prenez une courte pause de **5 minutes**.\n4. Répétez le cycle 4 fois, puis prenez une pause plus longue de **15 à 30 minutes**.',
  },
  {
    keywords: ['matrice eisenhower', 'eisenhower'],
    title: "Matrice d'Eisenhower",
    content: "La **matrice d'Eisenhower** classe les activités selon 4 quadrants :\n1. **Urgent & Important :** À faire immédiatement soi-même.\n2. **Non Urgent & Important :** À planifier avec précision.\n3. **Urgent & Non Important :** À déléguer si possible.\n4. **Non Urgent & Non Important :** À éliminer ou minimiser.",
  },
];

/**
 * Intelligent NLP engine for Major2I.A
 * Supports both online assistance and fully autonomous offline fallback.
 */
export function generateOfflineResponse(
  prompt: string,
  context: OfflineContext,
  isActuallyOffline: boolean = false
): OfflineAiResponse {
  const cleanPrompt = (prompt || '').trim();
  const lower = cleanPrompt.toLowerCase();
  const userName = context.userProfile?.prenom || context.user?.nom || 'Agent';

  const prefix = isActuallyOffline ? '⚡ **[Mode Hors-Ligne]** ' : '';
  const actions: any[] = [];
  let reply = '';

  // 1. Task Creation intent
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
    (lower.startsWith('ajoute ') && !lower.includes('rappel') && !lower.includes('favori') && !lower.includes('note'))
  ) {
    let taskTitle = cleanPrompt
      .replace(/^(tâche|tache|todo|ajoute une tâche|ajouter une tâche|crée une tâche|créer une tâche|nouvelle tâche|rajoute une tâche|ajoute)\s*:?\s*/i, '')
      .replace(/^(de|pour|qui consiste à|dans le menu)\s+/i, '')
      .trim();

    if (!taskTitle) taskTitle = 'Nouvelle tâche planifiée';

    const isHighPriority = lower.includes('urgent') || lower.includes('important') || lower.includes('prioritaire') || lower.includes('haute');
    const priority = isHighPriority ? 'haute' : 'normale';

    actions.push({
      type: 'tache',
      action: 'add',
      item: {
        titre: taskTitle,
        description: isActuallyOffline 
          ? `Tâche créée en mode hors-ligne par Major2I.A pour ${userName}`
          : `Tâche créée par Major2I.A pour ${userName}`,
        priorite: priority,
        status: 'attente',
      },
    });

    reply = `${prefix}**Tâche enregistrée avec succès dans le menu Tâches.**\n\n- **Intitulé :** ${taskTitle}\n- **Priorité :** ${priority === 'haute' ? '🔴 Haute' : '🔵 Normale'}\n- **Statut :** ⏳ En attente\n\n*La tâche est visible immédiatement dans la section **Tâches** de votre menu.*`;
    return { reply, actions, offline: isActuallyOffline };
  }

  // 2. Reminder & Agenda / Rendez-vous Creation intent
  if (
    lower.startsWith('rappel') ||
    lower.includes('rappelle-moi') ||
    lower.includes('rappelle moi') ||
    lower.includes('ajoute un rappel') ||
    lower.includes('ajouter un rappel') ||
    lower.includes('crée un rappel') ||
    lower.includes('créer un rappel') ||
    lower.includes('programme un rappel') ||
    lower.includes('rendez-vous') ||
    lower.includes('rendez vous') ||
    lower.includes('rdv') ||
    lower.includes('agenda') ||
    lower.includes('planning') ||
    lower.includes('réunion') ||
    lower.includes('reunion') ||
    lower.includes('calendrier')
  ) {
    let reminderTitle = cleanPrompt
      .replace(/^(rappel|rappelle-moi|rappelle moi|ajoute un rappel|ajouter un rappel|crée un rappel|créer un rappel|ajoute un rendez-vous|ajoute un rdv|ajoute à mon agenda|ajoute dans mon agenda|programme un rappel|programme un rendez-vous)\s*:?\s*/i, '')
      .replace(/^(de|que|pour)\s+/i, '')
      .trim();

    if (!reminderTitle) reminderTitle = 'Rappel / Rendez-vous programmé';

    // Extract potential time (ex: à 14h, 15:30, 10h15)
    const timeMatch = lower.match(/(?:à|vers|a)\s*(\d{1,2})[h:]?(\d{2})?/i);
    const reminderHour = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}` : '09:00';

    // Extract potential date (demain, après-demain, ou aujourd'hui)
    let targetDate = new Date();
    if (lower.includes('après-demain') || lower.includes('apres-demain') || lower.includes('après demain')) {
      targetDate = new Date(Date.now() + 2 * 86400000);
    } else if (lower.includes('demain')) {
      targetDate = new Date(Date.now() + 86400000);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    const isAgendaEvent = lower.includes('rendez-vous') || lower.includes('rdv') || lower.includes('agenda') || lower.includes('réunion');

    actions.push({
      type: 'rappel',
      action: 'add',
      item: {
        titre: reminderTitle,
        description: isActuallyOffline
          ? (isAgendaEvent ? `Événement agenda créé en mode hors-ligne pour ${userName}` : `Rappel généré en mode autonome par Major2I.A`)
          : (isAgendaEvent ? `Événement agenda créé pour ${userName}` : `Rappel programmé par Major2I.A`),
        dateRappel: dateStr,
        heure: reminderHour,
        priorite: 'haute',
        statut: 'actif',
      },
    });

    reply = `${prefix}**${isAgendaEvent ? 'Rendez-vous / Agenda' : 'Rappel'} configuré avec succès.**\n\n- **Objet :** ${reminderTitle}\n- **Date :** ${dateStr} ${lower.includes('demain') ? '(Demain)' : ''}\n- **Heure :** ${reminderHour}\n- **Statut :** 🔔 Actif\n\n*L'événement est enregistré dans votre agenda et synchronisé.*`;
    return { reply, actions, offline: isActuallyOffline };
  }

  // 3. Memory & Note intent
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
        tags: isActuallyOffline ? ['hors-ligne', 'mémoire'] : ['mémoire'],
        importance: 4,
      },
    });

    reply = `${prefix}**Note enregistrée avec succès.**\n\n> *"${memoContent}"*\n\nCette information a été ajoutée à vos données neuronales et reste consultable dans la section **Mémoire**.`;
    return { reply, actions, offline: isActuallyOffline };
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
        contenu: `Sauvegarde enregistrée par Major2I.A`,
        categorie: 'Général',
      },
    });

    reply = `${prefix}**Élément ajouté à vos favoris.**\n\n⭐ **${favTitle}** a été épinglé dans votre bibliothèque de favoris.`;
    return { reply, actions, offline: isActuallyOffline };
  }

  // 5. Querying tasks
  if (lower.includes('mes tâches') || lower.includes('mes taches') || lower.includes('liste des tâches') || lower.includes('que dois-je faire')) {
    const list = context.taches || [];
    if (list.length === 0) {
      reply = `${prefix}Vous n'avez actuellement aucune tâche enregistrée.`;
    } else {
      const activeList = list.filter((t) => t.status !== 'termine');
      reply = `${prefix}**Synthèse de vos tâches (${activeList.length} actives) :**\n\n` +
        activeList.slice(0, 10).map((t, idx) => `${idx + 1}. **${t.titre}** — Priorité : *${t.priorite}* | Statut : *${t.status}*`).join('\n');
    }
    return { reply, offline: isActuallyOffline };
  }

  // 6. Querying reminders
  if (lower.includes('mes rappels') || lower.includes('liste des rappels') || lower.includes('prochains rappels')) {
    const list = (context.rappels || []).filter((r) => r.statut === 'actif');
    if (list.length === 0) {
      reply = `${prefix}Aucun rappel actif programmé pour le moment.`;
    } else {
      reply = `${prefix}**Vos rappels actifs (${list.length}) :**\n\n` +
        list.slice(0, 8).map((r, idx) => `${idx + 1}. 🔔 **${r.titre}** — ${r.dateRappel || 'Aujourd\'hui'} à ${r.heure || '09:00'}`).join('\n');
    }
    return { reply, offline: isActuallyOffline };
  }

  // 7. Querying memory
  if (lower.includes('ma mémoire') || lower.includes('que sais-tu sur moi') || lower.includes('mes informations') || lower.includes('mes souvenirs')) {
    const list = context.memoire || [];
    if (list.length === 0) {
      reply = `${prefix}Votre banque de mémoire est actuellement vide. Dites-moi ce que vous souhaitez mémoriser (ex: *"Mémorise que..."*).`;
    } else {
      reply = `${prefix}**Connaissances mémorisées (${list.length}) :**\n\n` +
        list.slice(0, 8).map((m, idx) => `${idx + 1}. 🧠 *${m.contenu}* (${(m.tags || []).join(', ')})`).join('\n');
    }
    return { reply, offline: isActuallyOffline };
  }

  // 8. Calculations & Math expressions
  const mathMatch = cleanPrompt.match(/(?:calcule|calculer|combien font|combien fait|\=|\?)\s*([0-9\s\+\-\*\/\^\(\)\.\,]+)/i);
  if (mathMatch && mathMatch[1]) {
    try {
      const sanitizedExpr = mathMatch[1].replace(/,/g, '.').replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');
      if (sanitizedExpr.length >= 3 && /[\+\-\*\/]/.test(sanitizedExpr)) {
        const fn = new Function(`return (${sanitizedExpr});`);
        const result = fn();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          reply = `${prefix}**Résultat du calcul :**\n\n$$\n${sanitizedExpr.trim()} = ${result}\n$$\n\n*Calcul validé.*`;
          return { reply, offline: isActuallyOffline };
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

    reply = `${prefix}**Horloge & Date :**\n\n- 📅 **Date :** ${dateFormatted}\n- ⏱️ **Heure :** ${timeFormatted}`;
    return { reply, offline: isActuallyOffline };
  }

  // 10. Email & Letter Writing Template Engine
  if (
    lower.includes('écris un email') ||
    lower.includes('ecris un email') ||
    lower.includes('rédige un email') ||
    lower.includes('redige un email') ||
    lower.includes('écris un mail') ||
    lower.includes('lettre de motivation') ||
    lower.includes('message de remerciement')
  ) {
    const topic = cleanPrompt
      .replace(/.*(?:écris un email|ecris un email|rédige un email|redige un email|écris un mail|lettre de motivation|message de remerciement)\s*(?:pour|à propos de|concernant)?\s*/i, '')
      .trim() || 'votre demande';

    reply = `${prefix}**Modèle de Rédaction Prêt à l'Emploi**\n\n` +
      `**Objet :** Suite à nos échanges concernant ${topic}\n\n` +
      `Bonjour,\n\n` +
      `Je me permets de vous contacter afin de faire le point sur ${topic}.\n\n` +
      `Comme convenu, je reste à votre entière disposition pour tout complément d'information ou pour convenir d'un échange à votre convenance.\n\n` +
      `En vous souhaitant une excellente journée,\n\n` +
      `Bien cordialement,\n` +
      `**${userName}**\n\n` +
      `*💡 Vous pouvez copier ce texte et l'adapter directement.*`;
    return { reply, offline: isActuallyOffline };
  }

  // 11. Knowledge Base Lookup
  for (const kb of KNOWLEDGE_BASE) {
    if (kb.keywords.some((kw) => lower.includes(kw))) {
      reply = `${prefix}**${kb.title} :**\n\n${kb.content}`;
      return { reply, offline: isActuallyOffline };
    }
  }

  // 12. Greetings & Identity
  if (
    lower.startsWith('bonjour') ||
    lower.startsWith('salut') ||
    lower.startsWith('hello') ||
    lower.startsWith('coucou') ||
    lower.startsWith('hey') ||
    lower.includes('qui es-tu') ||
    lower.includes('présente-toi')
  ) {
    reply = `${prefix}**Bonjour ${userName} !**\n\nJe suis **Major2I.A**, votre assistant personnel intelligent.\n\nVoici ce que vous pouvez me demander :\n- 📝 Gérer vos **tâches** (*"Ajoute une tâche..."*)\n- 🔔 Programmer des **rappels & rendez-vous** (*"Rappelle-moi de..."*)\n- 🧠 Mémoriser des informations (*"Note que..."*)\n- 🧮 Réaliser des calculs mathématiques (*"Calcule 45 * 12"*)\n- ✍️ Rédiger des modèles de messages (*"Rédige un email pour..."*)\n- 🕒 Consulter l'heure et la date`;
    return { reply, offline: isActuallyOffline };
  }

  // 13. Help / Assistance request
  if (lower.includes('aide') || lower.includes('help') || lower.includes('que peux-tu faire') || lower.includes('commandes')) {
    reply = `${prefix}**Guide d'Utilisation Major2I.A :**\n\n` +
      `1. **Productivité :**\n` +
      `   - *"Ajoute une tâche Préparer la réunion"* : crée une tâche.\n` +
      `   - *"Rappelle-moi à 14h de téléphoner"* : active une alerte dans l'agenda.\n` +
      `   - *"Note que le mot de passe est X"* : enregistre dans la mémoire.\n\n` +
      `2. **Consultation :**\n` +
      `   - *"Mes tâches"* / *"Mes rappels"* / *"Ma mémoire"*\n` +
      `   - *"Quelle heure est-il ?"*\n\n` +
      `3. **Calculs & Rédaction :**\n` +
      `   - *"Calcule 1500 * 1.2"* ou calculs complexes.\n` +
      `   - *"Rédige un email pour demander un devis"*`;
    return { reply, offline: isActuallyOffline };
  }

  // 14. Structured General Assistance
  reply = isActuallyOffline 
    ? `⚡ **[Mode Hors-Ligne] Assistant Major2I.A Local**\n\n` +
      `J'ai bien reçu votre message : **"${cleanPrompt}"**.\n\n` +
      `En mode hors-ligne autonome, je réponds directement depuis votre appareil. Voici quelques suggestions :\n` +
      `- **Créer une action :** Dites *"Ajoute une tâche..."* ou *"Rappelle-moi de..."*\n` +
      `- **Prendre une note :** Dites *"Note que..."*\n` +
      `- **Calculer :** Dites *"Calcule..."*\n` +
      `- **Rédiger :** Dites *"Rédige un email concernant..."*`
    : `**Bonjour ${userName} !**\n\nJ'ai bien reçu votre message : **"${cleanPrompt}"**.\n\nComment puis-je vous aider ? Vous pouvez me demander de gérer vos tâches, programmer des rappels dans l'agenda, sauvegarder une note ou effectuer un calcul.`;

  return { reply, actions, offline: isActuallyOffline };
}
