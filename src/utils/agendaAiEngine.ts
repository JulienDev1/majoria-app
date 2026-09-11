/**
 * Moteur d'Intelligence Artificielle de l'agenda Majoria
 * Référence temporelle : 11 Septembre 2026
 */

export const AGENDA_AI_SYSTEM_PROMPT = `Tu es le moteur d'intelligence artificielle de l'agenda Majoria.
Aujourd'hui nous sommes le 11 Septembre 2026.

Ta seule mission est d'analyser la demande de l'utilisateur et de renvoyer STRICTEMENT un objet JSON valide respectant cette structure :

{
  "action": "CREER" | "LIRE" | "SUPPRIMER" | "INCONNU",
  "evenement": {
    "titre": string | null,
    "dateDebut": "YYYY-MM-DDTHH:mm:ss" | null,
    "dateFin": "YYYY-MM-DDTHH:mm:ss" | null
  },
  "reponse": "Message fluide et court de confirmation pour le chat"
}

RÈGLES :
- Si l'utilisateur demande d'ajouter un RDV, action = "CREER".
- Si l'heure de fin n'est pas spécifiée, met la dateFin à 1h après dateDebut.
- Calcule les dates ("demain", "lundi") à partir du 11 Septembre 2026.`;

export type AgendaActionType = 'CREER' | 'LIRE' | 'SUPPRIMER' | 'INCONNU';

export interface AgendaEvenement {
  titre: string | null;
  dateDebut: string | null; // Format : "YYYY-MM-DDTHH:mm:ss"
  dateFin: string | null;   // Format : "YYYY-MM-DDTHH:mm:ss"
}

export interface AgendaAiResult {
  action: AgendaActionType;
  evenement: AgendaEvenement;
  reponse: string;
}

// Date de référence fixée au 11 Septembre 2026 (vendredi)
export const AGENDA_BASE_DATE = new Date(2026, 8, 11, 9, 0, 0); // 11 Septembre 2026 09:00:00

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatIsoDateTime(d: Date): string {
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const seconds = padZero(d.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Moteur d'analyse déterministe respectant à la lettre les règles de l'agenda Majoria
 * Référence : 11 Septembre 2026 (vendredi)
 */
export function parseAgendaAiRequest(userPrompt: string): AgendaAiResult {
  const text = (userPrompt || '').trim();
  const lower = text.toLowerCase();
  const norm = lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Détection de l'action
  const isDelete =
    norm.includes('supprime') ||
    norm.includes('supprimer') ||
    norm.includes('annule') ||
    norm.includes('annuler') ||
    norm.includes('retire') ||
    norm.includes('enleve') ||
    norm.includes('efface');

  const isRead =
    norm.includes('affiche') ||
    norm.includes('voir') ||
    norm.includes('montre') ||
    norm.includes('consulter') ||
    norm.includes('quels sont') ||
    norm.includes('quelles sont') ||
    norm.includes('qu est ce que j ai') ||
    norm.includes('qu est ce que j ai de prevu') ||
    norm.includes('ai je') ||
    norm.includes('ai-je') ||
    norm.includes('liste des rdv') ||
    norm.includes('liste de mes rdv') ||
    norm.includes('mes rendez vous') ||
    norm.includes('mes rdv') ||
    (norm.includes('planning') && !norm.includes('ajoute') && !norm.includes('planifie')) ||
    (norm.includes('agenda') && !norm.includes('ajoute') && !norm.includes('ajouter') && !norm.includes('programme') && !norm.includes('planifie') && !isDelete);

  const isExplicitCreate =
    norm.includes('ajoute') ||
    norm.includes('ajouter') ||
    norm.includes('programme') ||
    norm.includes('programmer') ||
    norm.includes('planifie') ||
    norm.includes('planifier') ||
    norm.includes('fixe') ||
    norm.includes('fixer') ||
    norm.includes('bloque') ||
    norm.includes('bloquer') ||
    norm.includes('cree') ||
    norm.includes('creer') ||
    norm.includes('prends rdv') ||
    norm.includes('prendre rdv') ||
    norm.includes('nouveau rdv') ||
    norm.includes('nouvelle reunion');

  const isRdvMention =
    norm.includes('rdv') ||
    norm.includes('rendez vous') ||
    norm.includes('rendez-vous') ||
    norm.includes('reunion') ||
    norm.includes('meeting') ||
    norm.includes('dentiste') ||
    norm.includes('docteur') ||
    norm.includes('medecin');

  let action: AgendaActionType = 'INCONNU';
  if (isDelete) {
    action = 'SUPPRIMER';
  } else if (isRead) {
    action = 'LIRE';
  } else if (isExplicitCreate || isRdvMention) {
    // RÈGLE : Si l'utilisateur demande d'ajouter un RDV, action = "CREER"
    action = 'CREER';
  }

  if (action === 'INCONNU') {
    return {
      action: 'INCONNU',
      evenement: {
        titre: null,
        dateDebut: null,
        dateFin: null,
      },
      reponse: "Je n'ai pas identifié d'action précise pour votre agenda Majoria. Vous pouvez me demander de planifier, consulter ou annuler un rendez-vous.",
    };
  }

  // 2. Calcul des dates à partir du 11 Septembre 2026
  // 11 Septembre 2026 est un Vendredi (day = 4)
  const baseYear = 2026;
  const baseMonth = 8; // Septembre
  const baseDay = 11;
  let targetDate = new Date(baseYear, baseMonth, baseDay);

  if (norm.includes('demain')) {
    // Demain à partir du 11 Septembre 2026 = 11 Septembre 2026 (Vendredi)
    targetDate = new Date(baseYear, baseMonth, baseDay + 1);
  } else if (norm.includes('apres demain') || norm.includes('apres-demain')) {
    targetDate = new Date(baseYear, baseMonth, baseDay + 2);
  } else if (norm.includes('lundi')) {
    // 11 Septembre 2026 est Vendredi (+4 jours = Lundi 14 Septembre 2026)
    targetDate = new Date(baseYear, baseMonth, 14);
  } else if (norm.includes('mardi')) {
    targetDate = new Date(baseYear, baseMonth, 15);
  } else if (norm.includes('mercredi')) {
    targetDate = new Date(baseYear, baseMonth, 16);
  } else if (norm.includes('jeudi prochain')) {
    targetDate = new Date(baseYear, baseMonth, 17);
  } else if (norm.includes('vendredi')) {
    targetDate = new Date(baseYear, baseMonth, 11);
  } else if (norm.includes('samedi')) {
    targetDate = new Date(baseYear, baseMonth, 12);
  } else if (norm.includes('dimanche')) {
    targetDate = new Date(baseYear, baseMonth, 13);
  } else {
    // Vérification date explicite (ex: 15/09, 15 septembre)
    const specificDateMatch = text.match(/(\d{1,2})\s*(?:septembre|sept|\/09|\-09)/i);
    if (specificDateMatch) {
      const dayNum = parseInt(specificDateMatch[1], 10);
      if (dayNum >= 1 && dayNum <= 30) {
        targetDate = new Date(baseYear, baseMonth, dayNum);
      }
    }
  }

  // 3. Extraction de l'heure de début
  let startHour = 9;
  let startMin = 0;
  let hasSpecificTime = false;

  const timeRangeMatch = text.match(/(?:de|entre)\s*(\d{1,2})[h:]?(\d{2})?\s*(?:à|a|et)\s*(\d{1,2})[h:]?(\d{2})?/i);
  const singleTimeMatch = text.match(/(?:à|vers|pour|a)\s*(\d{1,2})[h:]?(\d{2})?/i) || text.match(/(\d{1,2})h(?:(\d{2}))?/i);

  if (timeRangeMatch) {
    startHour = parseInt(timeRangeMatch[1], 10);
    startMin = timeRangeMatch[2] ? parseInt(timeRangeMatch[2], 10) : 0;
    hasSpecificTime = true;
  } else if (singleTimeMatch) {
    startHour = parseInt(singleTimeMatch[1], 10);
    startMin = singleTimeMatch[2] ? parseInt(singleTimeMatch[2], 10) : 0;
    hasSpecificTime = true;
  } else if (norm.includes('ce soir')) {
    startHour = 20;
    startMin = 0;
    hasSpecificTime = true;
  } else if (norm.includes('apres midi') || norm.includes('cet apres midi')) {
    startHour = 14;
    startMin = 0;
    hasSpecificTime = true;
  } else if (norm.includes('matin') || norm.includes('ce matin')) {
    startHour = 9;
    startMin = 0;
    hasSpecificTime = true;
  }

  // 4. Construction de dateDebut
  targetDate.setHours(startHour, startMin, 0, 0);
  const dateDebutStr = formatIsoDateTime(targetDate);

  // 5. Construction de dateFin
  // RÈGLE : Si l'heure de fin n'est pas spécifiée, met la dateFin à 1h après dateDebut.
  let endDate = new Date(targetDate.getTime());
  if (timeRangeMatch && timeRangeMatch[3]) {
    const endHour = parseInt(timeRangeMatch[3], 10);
    const endMin = timeRangeMatch[4] ? parseInt(timeRangeMatch[4], 10) : 0;
    endDate.setHours(endHour, endMin, 0, 0);
  } else {
    endDate = new Date(targetDate.getTime() + 60 * 60 * 1000); // Exactement 1h après
  }
  const dateFinStr = formatIsoDateTime(endDate);

  // 6. Extraction du titre de l'événement
  let titre = text
    .replace(/^(bonjour|salut|peux-tu|peux tu|s'il te plaît|svp)?\s*(?:ajoute à l'agenda|ajoute à mon agenda|ajouter à mon agenda|ajoute dans mon agenda|ajoute au calendrier|mettre sur mon agenda|ajoute|ajouter|programme|programmer|planifie|planifier|bloque|bloquer|crée|creer|mets|mettre|fixe|fixer|cale|caler)?\s*(?:un|une|mon|mes|le|la|les)?\s*(?:rendez-vous|rendez vous|rdv|reunion|meeting|evenement)?\s*(?:avec|chez|pour|\bde\b)?\s*:?\s*/i, '')
    .replace(/\b(?:demain|après-demain|apres-demain|aujourd'hui|ce soir|ce matin|cet après-midi|cet apres-midi|lundi|mardi|mercredi|jeudi prochain|jeudi|vendredi|samedi|dimanche)\b/gi, '')
    .replace(/(?:de|entre)\s*\d{1,2}[h:]?\d{0,2}\s*(?:à|a|et)\s*\d{1,2}[h:]?\d{0,2}/gi, '')
    .replace(/(?:à|vers|pour|a)\s*\d{1,2}[h:]?\d{0,2}/gi, '')
    .replace(/\b\d{1,2}h\d{0,2}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  titre = titre.replace(/^(annule|annuler|supprime|supprimer|retire|retirer|efface|effacer)\b\s*/i, '').trim();
  titre = titre.replace(/^(avec|chez|pour|de|le|la|les|un|une|mon|ma)\b\s*/i, '').trim();
  titre = titre.replace(/^(rdv|rendez-vous|rendez vous)\b\s*/i, '').trim();
  titre = titre.replace(/^(chez|avec|pour|de)\b\s*/i, '').trim();
  if (!titre) {
    titre = norm.includes('dentiste') ? 'Dentiste'
      : norm.includes('medecin') || norm.includes('docteur') ? 'Médecin'
      : norm.includes('reunion') ? 'Réunion'
      : 'Rendez-vous';
  } else {
    // Capitaliser la première lettre
    titre = titre.charAt(0).toUpperCase() + titre.slice(1);
  }

  // 7. Message fluide et court de confirmation pour le chat
  let reponse = '';
  const dayNameFr = getFrenchDayName(targetDate);
  const dateFormattedFr = `${dayNameFr} ${targetDate.getDate()} septembre 2026`;
  const timeFormattedFr = `${padZero(startHour)}h${padZero(startMin)}`;

  if (action === 'CREER') {
    reponse = `C'est noté ! J'ai ajouté votre rendez-vous « ${titre} » pour le ${dateFormattedFr} à ${timeFormattedFr} dans votre agenda Majoria.`;
  } else if (action === 'LIRE') {
    reponse = `Voici vos événements prévus pour le ${dateFormattedFr} dans l'agenda Majoria.`;
  } else if (action === 'SUPPRIMER') {
    reponse = `Le rendez-vous « ${titre} » a bien été supprimé de votre agenda Majoria.`;
  }

  return {
    action,
    evenement: {
      titre: action === 'CREER' || action === 'SUPPRIMER' ? titre : null,
      dateDebut: dateDebutStr,
      dateFin: dateFinStr,
    },
    reponse,
  };
}

function getFrenchDayName(d: Date): string {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return days[d.getDay()];
}
