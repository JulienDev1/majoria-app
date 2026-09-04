/**
 * Intelligent Action Extractor for Major2I.A
 * Extracts structured commands (Reminders, Tasks, Memory Notes, Favorites)
 * from explicit ACTION_JSON blocks as well as natural conversational French language.
 */

export interface ExtractedAction {
  type: 'reminder' | 'rappel' | 'task' | 'tache' | 'project' | 'projet' | 'memory' | 'memoire' | 'favorite' | 'favori' | 'event' | 'agenda' | 'evenement';
  action?: 'add' | 'update' | 'delete';
  item?: any;
  titre?: string;
  contenu?: string;
  description?: string;
  dateRappel?: string;
  heure?: string;
  dateFinRappel?: string;
  heureFin?: string;
  priorite?: 'basse' | 'normale' | 'haute';
  importance?: number;
  tags?: string[];
  categorie?: string;
}

/**
 * Normalizes text to simplify NLP matching
 */
function normalizePrompt(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents for robust matching
    .replace(/[’']/g, ' ')
    .trim();
}

/**
 * Parses and extracts actions from AI reply or User Prompt
 */
export function extractActionsFromText(userPrompt: string, aiReply?: string): ExtractedAction[] {
  const combined = `${aiReply || ''}\n${userPrompt || ''}`;
  const actions: ExtractedAction[] = [];

  // 1. Try to extract explicit ACTION_JSON block (with or without markdown/backticks)
  const jsonRegexes = [
    /ACTION_JSON\s*:\s*```(?:json)?\s*([\s\S]*?)\s*```/i,
    /ACTION_JSON\s*:\s*(\{[\s\S]*?\})/i,
    /\[ACTION_JSON\]\s*(\{[\s\S]*?\})/i,
    /```json\s*(\{\s*"actions"[\s\S]*?\})\s*```/i,
    /\{"actions"\s*:\s*\[[\s\S]*?\]\}/i
  ];

  for (const regex of jsonRegexes) {
    const match = (aiReply || '').match(regex) || combined.match(regex);
    if (match) {
      const jsonStr = match[1] || match[0];
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          return parsed.actions;
        } else if (parsed.type) {
          return [parsed];
        }
      } catch (err) {
        // Fallthrough to NLP matching
      }
    }
  }

  // 2. Natural Language Intent Detection on User Prompt
  const cleanPrompt = (userPrompt || '').trim();
  if (!cleanPrompt) return actions;

  const norm = normalizePrompt(cleanPrompt);
  const lower = cleanPrompt.toLowerCase();

  // Helper date calculators
  const now = new Date();
  const getTodayStr = () => now.toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // -------------------------------------------------------------
  // INTENT A: Reminder / Rappel
  // -------------------------------------------------------------
  const isReminder = (
    norm.startsWith('rappel') ||
    norm.includes('rappelle moi') ||
    norm.includes('rappelle-moi') ||
    norm.includes('rappeler de') ||
    norm.includes('me rappeler de') ||
    norm.includes('peux tu me rappeler') ||
    norm.includes('pourrais tu me rappeler') ||
    norm.includes('ajoute un rappel') ||
    norm.includes('ajouter un rappel') ||
    norm.includes('cree un rappel') ||
    norm.includes('creer un rappel') ||
    norm.includes('programme un rappel') ||
    norm.includes('programmer un rappel') ||
    norm.includes('mets une alerte') ||
    norm.includes('mettre une alerte') ||
    norm.includes('mets une alarme') ||
    norm.includes('n oublie pas de me rappeler')
  );

  if (isReminder) {
    let reminderTitle = cleanPrompt
      .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(rappel|rappelle-moi|rappelle moi|me rappeler de|rappeler de|ajoute un rappel|ajouter un rappel|crée un rappel|créer un rappel|programme un rappel|programmer un rappel|mets une alerte pour|mets une alarme pour|n'oublie pas de me rappeler)\s*:?\s*/i, '')
      .replace(/^(de|que|pour|à|a)\s+/i, '')
      .trim();

    // Extract potential time (ex: à 14h, à 14h30, vers 9:00, à 15:45)
    let reminderHour = '09:00';
    const timeMatch = lower.match(/(?:à|vers|a|pour)\s*(\d{1,2})[h:]?(\d{2})?/i);
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = (timeMatch[2] || '00').padStart(2, '0');
      reminderHour = `${h}:${m}`;
    }

    // Extract potential date
    let reminderDate = getTodayStr();
    if (norm.includes('demain')) {
      reminderDate = getTomorrowStr();
    } else if (norm.includes('apres demain') || norm.includes('apres-demain')) {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      reminderDate = d.toISOString().split('T')[0];
    } else {
      const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : now.getFullYear();
        reminderDate = `${year}-${month}-${day}`;
      }
    }

    // Clean extraneous date phrases from title
    reminderTitle = reminderTitle
      .replace(/(?:demain|après-demain|apres-demain|aujourd'hui|(?:à|vers|pour|a)\s*\d{1,2}[h:]?\d{0,2})/gi, '')
      .trim();

    if (!reminderTitle) reminderTitle = 'Rappel programmé';

    const isUrgent = norm.includes('urgent') || norm.includes('important') || norm.includes('prioritaire');

    actions.push({
      type: 'reminder',
      titre: reminderTitle,
      description: `Rappel pour le ${reminderDate} à ${reminderHour}`,
      dateRappel: reminderDate,
      heure: reminderHour,
      priorite: isUrgent ? 'haute' : 'normale',
    });

    return actions;
  }

  // -------------------------------------------------------------
  // INTENT B: Task / Tâche / Projet
  // -------------------------------------------------------------
  const isTask = (
    norm.startsWith('tache') ||
    norm.startsWith('todo') ||
    norm.startsWith('projet') ||
    norm.includes('ajoute un projet') ||
    norm.includes('ajouter un projet') ||
    norm.includes('cree un projet') ||
    norm.includes('creer un projet') ||
    norm.includes('nouveau projet') ||
    norm.includes('rajoute un projet') ||
    norm.includes('dans mes projets') ||
    norm.includes('ajoute une tache') ||
    norm.includes('ajouter une tache') ||
    norm.includes('cree une tache') ||
    norm.includes('creer une tache') ||
    norm.includes('nouvelle tache') ||
    norm.includes('rajoute une tache') ||
    norm.includes('ajoute dans les taches') ||
    norm.includes('ajoute dans mes taches') ||
    norm.includes('ajoute a faire') ||
    norm.includes('mettre dans mes taches') ||
    norm.includes('inscris dans mes taches') ||
    (norm.startsWith('ajoute ') && !norm.includes('memoire') && !norm.includes('favori') && !norm.includes('note') && !norm.includes('rappel'))
  );

  if (isTask) {
    const isProject = norm.includes('projet');
    let taskTitle = cleanPrompt
      .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(projet|tâche|tache|todo|ajoute un projet|ajouter un projet|crée un projet|créer un projet|nouveau projet|rajoute un projet|ajoute une tâche|ajouter une tâche|crée une tâche|créer une tâche|nouvelle tâche|rajoute une tâche|ajoute dans les tâches|ajoute dans mes tâches|ajoute dans mes projets|ajoute à faire|mettre dans mes tâches|ajoute)\s*:?\s*/i, '')
      .replace(/^(de|pour|qui consiste à|dans le menu|dans les tâches|dans mes tâches|dans mes projets)\s+/i, '')
      .trim();

    if (!taskTitle) taskTitle = isProject ? 'Nouveau projet planifié' : 'Nouvelle tâche planifiée';

    const isUrgent = norm.includes('urgent') || norm.includes('important') || norm.includes('prioritaire');

    actions.push({
      type: isProject ? 'project' : 'task',
      titre: taskTitle,
      description: isProject ? 'Projet enregistré par Major2I.A' : 'Tâche enregistrée par Major2I.A',
      priorite: isUrgent ? 'haute' : 'normale',
    });

    return actions;
  }

  // -------------------------------------------------------------
  // INTENT C: Memory / Note / Enregistrement Menu
  // -------------------------------------------------------------
  const isMemory = (
    norm.startsWith('note ') ||
    norm.startsWith('note que') ||
    norm.startsWith('note ceci') ||
    norm.startsWith('note ca') ||
    norm.startsWith('note:') ||
    norm.startsWith('note :') ||
    norm.includes('note dans le menu') ||
    norm.includes('note dans la memoire') ||
    norm.includes('note dans ma memoire') ||
    norm.includes('note-moi') ||
    norm.includes('note moi') ||
    norm.includes('peux tu noter') ||
    norm.includes('peux-tu noter') ||
    norm.includes('pourrais tu noter') ||
    norm.includes('pourrais-tu noter') ||
    norm.includes('je veux que tu notes') ||
    norm.includes('je souhaite que tu notes') ||
    norm.includes('je te demande de noter') ||
    norm.includes('garde en note') ||
    norm.includes('garde en memoire') ||
    norm.includes('garde en tete') ||
    norm.includes('garde ceci') ||
    norm.includes('garde ca') ||
    norm.startsWith('memoire') ||
    norm.includes('memorise') ||
    norm.includes('memoriser') ||
    norm.includes('retiens que') ||
    norm.includes('retiens ceci') ||
    norm.includes('souviens toi') ||
    norm.includes('souviens-toi') ||
    norm.includes('enregistre en memoire') ||
    norm.includes('enregistre dans la memoire') ||
    norm.includes('enregistre dans le menu') ||
    norm.includes('enregistre cette note') ||
    norm.includes('enregistre ceci') ||
    norm.includes('mets en memoire') ||
    norm.includes('sauvegarde en memoire') ||
    norm.includes('sauvegarder en memoire') ||
    norm.includes('inscris dans mes notes') ||
    norm.includes('ajoute a mes notes') ||
    norm.includes('ajoute dans mes notes') ||
    norm.includes('n oublie pas que')
  );

  if (isMemory) {
    let memoContent = cleanPrompt
      .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(note dans le menu que|note dans le menu|note dans ma mémoire que|note dans ma mémoire|note-moi que|note moi que|note-moi|note moi|note que|note ceci|note ça|note :|note:|note|mémoire|memoire|mémorise|mémoriser|garde en mémoire que|garde en mémoire|garde en tête que|garde en tête|garde ceci en mémoire|garde en note|garde ceci|garde ça|retiens que|retiens ceci|souviens-toi de|souviens-toi que|souviens toi|enregistre en mémoire|enregistre dans la mémoire|enregistre dans le menu|enregistre cette note|enregistre ceci|mets en mémoire|sauvegarde en mémoire|sauvegarder en mémoire|inscris dans mes notes|ajoute à mes notes|ajoute dans mes notes|n'oublie pas que)\s*:?\s*/i, '')
      .replace(/^(de|que|pour|ceci|cela)\s+/i, '')
      .trim();

    if (!memoContent) memoContent = cleanPrompt;

    actions.push({
      type: 'memory',
      contenu: memoContent,
      tags: ['menu', 'mémoire', 'ia-auto'],
      importance: 4,
    });

    return actions;
  }

  // -------------------------------------------------------------
  // INTENT D: Favorite / Favori
  // -------------------------------------------------------------
  const isFavorite = (
    norm.includes('favori') ||
    norm.includes('favoris') ||
    norm.includes('ajoute aux favoris') ||
    norm.includes('ajouter aux favoris') ||
    norm.includes('mets en favori') ||
    norm.includes('mettre en favori') ||
    norm.includes('enregistre dans mes favoris') ||
    norm.includes('marque comme favori')
  );

  if (isFavorite) {
    let favTitle = cleanPrompt
      .replace(/^(bonjour|salut|peux-tu|peux tu)?\s*(ajoute aux favoris|ajouter aux favoris|mets en favori|mettre en favori|enregistre dans mes favoris|marque comme favori|favori)\s*:?\s*/i, '')
      .replace(/^(de|que|pour|ceci)\s+/i, '')
      .trim();

    if (!favTitle) favTitle = 'Favori enregistré';

    actions.push({
      type: 'favorite',
      titre: favTitle,
      contenu: cleanPrompt,
      categorie: 'général',
    });

    return actions;
  }

  // -------------------------------------------------------------
  // INTENT E: Agenda & Calendrier (Événement, Rendez-vous, Réunion)
  // -------------------------------------------------------------
  const isAgenda = (
    norm.includes('agenda') ||
    norm.includes('calendrier') ||
    norm.includes('ajoute a l agenda') ||
    norm.includes('ajoute a mon agenda') ||
    norm.includes('ajouter a mon agenda') ||
    norm.includes('dans mon agenda') ||
    norm.includes('sur mon agenda') ||
    norm.includes('sur mon calendrier') ||
    norm.includes('dans le calendrier') ||
    norm.includes('dans mon calendrier') ||
    norm.includes('cree un evenement') ||
    norm.includes('creer un evenement') ||
    norm.includes('planifie un evenement') ||
    norm.includes('planifie un rendez vous') ||
    norm.includes('planifie une reunion') ||
    norm.includes('prends rendez-vous') ||
    norm.includes('prends rdv') ||
    norm.includes('programme sur l agenda')
  );

  if (isAgenda) {
    let eventTitle = cleanPrompt
      .replace(/^(bonjour|salut|peux-tu|peux tu)?\s*(ajoute à l'agenda|ajoute à mon agenda|ajouter à mon agenda|ajoute dans mon agenda|ajoute au calendrier|sur mon agenda|sur mon calendrier|dans mon agenda|dans mon calendrier|crée un événement|créer un événement|planifie un événement|planifie un rendez-vous|planifie un rdv|planifie une réunion|programme sur l'agenda|agenda)\s*:?\s*/i, '')
      .replace(/^(de|que|pour|à|a)\s+/i, '')
      .trim();

    // Extract potential time
    let eventHour = '09:00';
    const timeMatch = lower.match(/(?:à|vers|a|pour)\s*(\d{1,2})[h:]?(\d{2})?/i);
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = (timeMatch[2] || '00').padStart(2, '0');
      eventHour = `${h}:${m}`;
    }

    // Extract potential date
    let eventDate = getTodayStr();
    if (norm.includes('demain')) {
      eventDate = getTomorrowStr();
    } else if (norm.includes('apres demain') || norm.includes('apres-demain')) {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      eventDate = d.toISOString().split('T')[0];
    } else {
      const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : now.getFullYear();
        eventDate = `${year}-${month}-${day}`;
      }
    }

    eventTitle = eventTitle
      .replace(/(?:demain|après-demain|apres-demain|aujourd'hui|(?:à|vers|pour|a)\s*\d{1,2}[h:]?\d{0,2})/gi, '')
      .trim();

    if (!eventTitle) eventTitle = 'Événement Agenda';

    actions.push({
      type: 'event',
      titre: eventTitle,
      description: `Événement prévu le ${eventDate} à ${eventHour}`,
      dateRappel: eventDate,
      heure: eventHour,
      priorite: 'normale',
    });

    return actions;
  }

  return actions;
}
