/**
 * Intelligent Action Extractor for MajorI.A
 * Extracts structured commands (Reminders, Tasks, Memory Notes, Favorites)
 * from both explicit ACTION_JSON blocks and natural conversational language.
 */

export interface ExtractedAction {
  type: 'reminder' | 'rappel' | 'task' | 'tache' | 'memory' | 'memoire' | 'favorite' | 'favori';
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
    /```json\s*(\{\s*"actions"[\s\S]*?\})\s*```/i
  ];

  for (const regex of jsonRegexes) {
    const match = (aiReply || '').match(regex) || combined.match(regex);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          return parsed.actions;
        } else if (parsed.type) {
          return [parsed];
        }
      } catch (err) {
        // Continue to fallback
      }
    }
  }

  // 2. Natural Language Intent Detection on User Prompt
  const cleanPrompt = (userPrompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  // Helper date calculators
  const now = new Date();
  const getTodayStr = () => now.toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Check Reminder Intent: "rappelle-moi...", "ajoute un rappel...", "n'oublie pas..."
  const isReminder = (
    lower.startsWith('rappel') ||
    lower.includes('rappelle-moi') ||
    lower.includes('rappelle moi') ||
    lower.includes('rappeler de') ||
    lower.includes('ajoute un rappel') ||
    lower.includes('ajouter un rappel') ||
    lower.includes('crée un rappel') ||
    lower.includes('créer un rappel') ||
    lower.includes('programme un rappel') ||
    lower.includes('mets une alerte') ||
    lower.includes('mets une alarme') ||
    lower.includes("n'oublie pas de me rappeler")
  );

  if (isReminder) {
    let reminderTitle = cleanPrompt
      .replace(/^(rappel|rappelle-moi|rappelle moi|ajoute un rappel|ajouter un rappel|crée un rappel|créer un rappel|programme un rappel|mets une alerte pour|mets une alarme pour|n'oublie pas de me rappeler)\s*:?\s*/i, '')
      .replace(/^(de|que|pour|à)\s+/i, '')
      .trim();

    // Extract potential time (ex: à 14h, à 14h30, vers 9:00, à 15:45)
    let reminderHour = '09:00';
    const timeMatch = lower.match(/(?:à|vers|a|pour)\s*(\d{1,2})[h:]?(\d{2})?/i);
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = (timeMatch[2] || '00').padStart(2, '0');
      reminderHour = `${h}:${m}`;
    }

    // Extract potential date (demain, après-demain, aujourd'hui, date format)
    let reminderDate = getTodayStr();
    if (lower.includes('demain')) {
      reminderDate = getTomorrowStr();
    } else if (lower.includes('après-demain') || lower.includes('apres-demain')) {
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
      .replace(/(?:demain|après-demain|aujourd'hui|(?:à|vers|pour)\s*\d{1,2}[h:]?\d{0,2})/gi, '')
      .trim();

    if (!reminderTitle) reminderTitle = 'Rappel programmé';

    const isUrgent = lower.includes('urgent') || lower.includes('important') || lower.includes('prioritaire');

    actions.push({
      type: 'reminder',
      titre: reminderTitle,
      description: `Rappel créé automatiquement pour ${reminderDate} à ${reminderHour}`,
      dateRappel: reminderDate,
      heure: reminderHour,
      priorite: isUrgent ? 'haute' : 'normale',
    });

    return actions;
  }

  // Check Task Intent: "ajoute une tâche...", "tâche : ...", "todo..."
  const isTask = (
    lower.startsWith('tâche') ||
    lower.startsWith('tache') ||
    lower.includes('ajoute une tâche') ||
    lower.includes('ajouter une tâche') ||
    lower.includes('crée une tâche') ||
    lower.includes('créer une tâche') ||
    lower.includes('nouvelle tâche') ||
    lower.includes('rajoute une tâche') ||
    lower.includes('ajoute dans les tâches') ||
    lower.includes('ajoute dans mes tâches') ||
    lower.includes('ajoute à faire') ||
    lower.startsWith('todo ') ||
    (lower.startsWith('ajoute ') && !lower.includes('mémoire') && !lower.includes('favori') && !lower.includes('note'))
  );

  if (isTask) {
    let taskTitle = cleanPrompt
      .replace(/^(tâche|tache|todo|ajoute une tâche|ajouter une tâche|crée une tâche|créer une tâche|nouvelle tâche|rajoute une tâche|ajoute dans les tâches|ajoute dans mes tâches|ajoute à faire|ajoute)\s*:?\s*/i, '')
      .replace(/^(de|pour|qui consiste à|dans le menu|dans les tâches|dans mes tâches)\s+/i, '')
      .trim();

    if (!taskTitle) taskTitle = 'Nouvelle tâche';

    const isUrgent = lower.includes('urgent') || lower.includes('important') || lower.includes('prioritaire');

    actions.push({
      type: 'task',
      titre: taskTitle,
      description: `Tâche enregistrée par MajorI.A`,
      priorite: isUrgent ? 'haute' : 'normale',
    });

    return actions;
  }

  // Check Memory / Note Intent: "note que...", "note dans le menu...", "mémorise...", "garde en mémoire..."
  const isMemory = (
    lower.startsWith('note ') ||
    lower.startsWith('note que') ||
    lower.startsWith('note dans le menu') ||
    lower.includes('note dans le menu') ||
    lower.includes('note dans ma mémoire') ||
    lower.includes('note-moi') ||
    lower.includes('note moi') ||
    lower.startsWith('mémoire') ||
    lower.startsWith('memoire') ||
    lower.includes('mémorise') ||
    lower.includes('mémoriser') ||
    lower.includes('garde en mémoire') ||
    lower.includes('garde en tête') ||
    lower.includes('garde ceci en mémoire') ||
    lower.includes('retiens que') ||
    lower.includes('souviens-toi de') ||
    lower.includes('souviens-toi que') ||
    lower.includes('enregistre en mémoire') ||
    lower.includes('enregistre dans la mémoire') ||
    lower.includes('enregistre dans le menu') ||
    lower.includes('mets en mémoire') ||
    lower.includes('sauvegarde en mémoire') ||
    lower.includes('sauvegarder en mémoire')
  );

  if (isMemory) {
    let memoContent = cleanPrompt
      .replace(/^(note dans le menu que|note dans le menu|note dans ma mémoire que|note dans ma mémoire|note-moi que|note moi que|note-moi|note moi|note que|note|mémoire|memoire|mémorise|mémoriser|garde en mémoire que|garde en mémoire|garde en tête que|garde en tête|garde ceci en mémoire|retiens que|souviens-toi de|souviens-toi que|enregistre en mémoire|enregistre dans la mémoire|enregistre dans le menu|mets en mémoire|sauvegarde en mémoire|sauvegarder en mémoire)\s*:?\s*/i, '')
      .trim();

    if (!memoContent) memoContent = cleanPrompt;

    actions.push({
      type: 'memory',
      contenu: memoContent,
      tags: ['ia-auto', 'mémoire', 'menu'],
      importance: 4,
    });

    return actions;
  }

  // Check Favorite Intent: "ajoute aux favoris...", "mets en favori..."
  const isFavorite = (
    lower.includes('favori') ||
    lower.includes('favoris') ||
    lower.includes('ajoute aux favoris') ||
    lower.includes('ajouter aux favoris') ||
    lower.includes('mets en favori') ||
    lower.includes('mettre en favori') ||
    lower.includes('enregistre dans mes favoris') ||
    lower.includes('marque comme favori')
  );

  if (isFavorite) {
    let favTitle = cleanPrompt
      .replace(/^(ajoute aux favoris|ajouter aux favoris|mets en favori|mettre en favori|enregistre dans mes favoris|marque comme favori|favori)\s*:?\s*/i, '')
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

  return actions;
}
