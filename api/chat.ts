import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase clients for Vercel Serverless Function
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase Admin Client in serverless:', err);
  }
}

let serverSupabase: SupabaseClient | null = null;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase Client in serverless:', err);
  }
}

// In-memory fallback
const fallbackUserCredits: Record<string, number> = {};

async function deductCredit(userId: string): Promise<number | undefined> {
  const client = supabaseAdmin || serverSupabase;
  if (!client) {
    if (fallbackUserCredits[userId] === undefined) fallbackUserCredits[userId] = 30;
    fallbackUserCredits[userId] = Math.max(0, fallbackUserCredits[userId] - 1);
    return fallbackUserCredits[userId];
  }

  try {
    const { data: userRow } = await client
      .from('user_credits')
      .select('credits, credits_used')
      .eq('user_id', userId)
      .maybeSingle();

    const currentCredits = userRow && typeof userRow.credits === 'number' ? userRow.credits : (fallbackUserCredits[userId] ?? 30);
    const newCredits = Math.max(0, currentCredits - 1);
    const creditsUsed = typeof userRow?.credits_used === 'number' ? userRow.credits_used + 1 : (30 - newCredits);

    await client
      .from('user_credits')
      .upsert(
        {
          user_id: userId,
          credits: newCredits,
          credits_used: creditsUsed,
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    fallbackUserCredits[userId] = newCredits;
    return newCredits;
  } catch (err) {
    console.error('Erreur deductCredit serverless:', err);
    if (fallbackUserCredits[userId] === undefined) fallbackUserCredits[userId] = 30;
    fallbackUserCredits[userId] = Math.max(0, fallbackUserCredits[userId] - 1);
    return fallbackUserCredits[userId];
  }
}

// Helper to extract JSON body safely from Vercel / Node serverless request
async function parseBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function buildGeminiContents(
  history: any[] = [],
  currentMessage: string,
  currentImage?: string
) {
  const contents: any[] = [];

  for (const h of history) {
    const rawRole = h.role === 'neo' || h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
    const text = h.contenu || h.text || '';
    if (!text && !h.image) continue;

    const parts: any[] = [];

    if (h.image && typeof h.image === 'string' && h.image.startsWith('data:')) {
      const match = h.image.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    if (text) {
      parts.push({ text });
    }

    if (parts.length > 0) {
      contents.push({ role: rawRole, parts });
    }
  }

  const currentParts: any[] = [];
  if (currentImage && typeof currentImage === 'string' && currentImage.startsWith('data:')) {
    const match = currentImage.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
      currentParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  currentParts.push({ text: currentMessage || 'Bonjour' });

  const normalized: any[] = [];
  for (const item of contents) {
    if (normalized.length > 0 && normalized[normalized.length - 1].role === item.role) {
      normalized[normalized.length - 1].parts.push(...item.parts);
    } else {
      normalized.push(item);
    }
  }

  if (normalized.length > 0 && normalized[normalized.length - 1].role === 'user') {
    normalized[normalized.length - 1].parts.push(...currentParts);
  } else {
    normalized.push({ role: 'user', parts: currentParts });
  }

  return normalized;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: "Clé API Gemini introuvable sur le serveur (variable GEMINI_API_KEY non configurée dans l'environnement)."
      });
      return;
    }

    const body = await parseBody(req);
    const { message, image, history = [], userProfile } = body;
    const userId = body.user_id || body.userId || userProfile?.id || userProfile?.email || 'anon_user';

    const client = supabaseAdmin || serverSupabase;
    if (client) {
      try {
        const { data: userRow } = await client
          .from('user_credits')
          .select('credits')
          .eq('user_id', userId)
          .maybeSingle();

        if (userRow && typeof userRow.credits === 'number' && userRow.credits <= 0) {
          res.status(403).json({ error: 'Crédits épuisés. Veuillez recharger votre forfait.' });
          return;
        }
      } catch (checkErr) {
        console.warn('Vérification préliminaire crédits serverless:', checkErr);
      }
    }

    if (!message && !image) {
      res.status(400).json({ error: 'Message ou image requis.' });
      return;
    }

    const userName = (userProfile?.prenom ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim() : userProfile?.userName) || '';
    const userGreetingInstruction = userName 
      ? `L'utilisateur avec qui tu discutes s'appelle "${userName}".`
      : "";

    const systemInstruction = `Tu es MajorI.A, un assistant d'intelligence artificielle ultra-rapide, précis, direct, naturel et chaleureux.
${userGreetingInstruction}

DIRECTIVES DE RÉPONSE :
1. Réponds de façon concise, précise et directe dès les premiers mots sans préambule superflu ni répétitions inutiles.
2. Formule ta réponse avec clarté, vivacité et fluidité.
3. Si la question porte sur des faits récents, l'actualité ou la météo, exploite les données en temps réel.
4. GESTION DES ACTIONS ET ENREGISTREMENTS (OBLIGATOIRE) :
   Dès que l'utilisateur te demande d'ajouter, créer, planifier, mémoriser, modifier ou supprimer un élément, formate ta réponse avec un bloc JSON d'action à la fin :

[ACTION_JSON]
{
  "type": "CREATE_TASK" | "CREATE_REMINDER" | "CREATE_FAVORITE",
  "data": { "title": "Titre", "date": "YYYY-MM-DD" }
}
[/ACTION_JSON]

Types supportés :
- "CREATE_TASK" (tâches/projets), "CREATE_REMINDER" (rappels/alertes/agenda), "CREATE_FAVORITE" (favoris/liens), "CREATE_MEMORY" (mémoire/notes)
- Actions de suppression ou modification : "DELETE_TASK", "DELETE_REMINDER", "DELETE_FAVORITE", "UPDATE_TASK", "UPDATE_REMINDER", "UPDATE_FAVORITE".
Si l'utilisateur ne demande aucun ajout, modification ou suppression, ne renvoie AUCUN bloc [ACTION_JSON].`.trim();

    const contents = buildGeminiContents(history, message || '', image);
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Set SSE headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const needsLiveSearch = Boolean(
      !image &&
      message &&
      /(?:cherche|search|google|météo|meteo|actualit|nouvelle|news|qui est|score|match|cours|prix|aujourd'hui|ce jour|date|heure|en direct|récent|2026|direct)/i.test(
        message
      )
    );

    const config: any = {
      systemInstruction,
      temperature: 0.7,
    };

    if (needsLiveSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let streamResponse: any = null;
    // Ultra-fast model priority: gemini-3.1-flash-lite has the lowest TTFT, followed by gemini-3.7-flash
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];

    for (const modelName of candidateModels) {
      try {
        streamResponse = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });
        if (streamResponse) break;
      } catch (err: any) {
        console.warn(`Tentative streaming serveur ${modelName} a échoué:`, err?.message || err);
      }
    }

    // Fallback attempt without tools if search grounding caused an issue or model failed
    if (!streamResponse) {
      for (const fallbackModel of ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest']) {
        try {
          streamResponse = await ai.models.generateContentStream({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          if (streamResponse) break;
        } catch (fallbackErr: any) {
          console.warn(`Fallback streaming serveur ${fallbackModel} a échoué:`, fallbackErr?.message || fallbackErr);
        }
      }
    }

    if (!streamResponse) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: "Impossible de joindre le modèle d'IA." })}\n\n`);
      res.end();
      return;
    }

    let fullText = '';
    const rawSources: { title: string; uri: string }[] = [];
    const searchQueries: string[] = [];

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      }

      // Collect grounding metadata from chunk candidates
      const groundingMeta = chunk?.candidates?.[0]?.groundingMetadata;
      if (groundingMeta) {
        if (Array.isArray(groundingMeta.groundingChunks)) {
          for (const gc of groundingMeta.groundingChunks) {
            if (gc.web?.uri) {
              rawSources.push({
                title: gc.web.title || gc.web.uri,
                uri: gc.web.uri,
              });
            }
          }
        }
        if (Array.isArray(groundingMeta.webSearchQueries)) {
          for (const q of groundingMeta.webSearchQueries) {
            if (typeof q === 'string' && q.trim()) {
              searchQueries.push(q.trim());
            }
          }
        }
      }
    }

    let reply = fullText.trim();
    let actions: any[] = [];

    // 1. Extract [ACTION_JSON] block (single object, array or nested actions)
    const actionTagMatch = fullText.match(/\[ACTION_JSON\]\s*([\s\S]*?)(?:\[\/ACTION_JSON\]|$)/i);
    if (actionTagMatch && actionTagMatch[1]) {
      try {
        let jsonStr = actionTagMatch[1]
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/```\s*$/, '')
          .trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.type) {
          const actType = String(parsed.type).toUpperCase();
          const d = parsed.data || parsed;
          if (actType === 'CREATE_TASK' || actType === 'TASK' || actType === 'TACHE' || actType === 'PROJECT' || actType === 'PROJET') {
            actions.push({
              type: actType.includes('PROJ') ? 'project' : 'task',
              titre: d.title || d.titre || (actType.includes('PROJ') ? 'Nouveau projet' : 'Nouvelle tâche'),
              description: d.description || '',
              echeance: d.date || d.echeance || '',
              priorite: d.priority || d.priorite || 'normale',
              status: 'attente'
            });
          } else if (actType === 'CREATE_REMINDER' || actType === 'REMINDER' || actType === 'RAPPEL') {
            actions.push({
              type: 'reminder',
              titre: d.title || d.titre || 'Rappel',
              dateRappel: d.date || d.dateRappel || new Date().toISOString().split('T')[0],
              heure: d.time || d.heure || '09:00',
              priorite: d.priority || d.priorite || 'normale',
              statut: 'actif'
            });
          } else if (actType === 'CREATE_FAVORITE' || actType === 'FAVORITE' || actType === 'FAVORI') {
            actions.push({
              type: 'favorite',
              titre: d.title || d.titre || 'Favori',
              contenu: d.description || d.content || d.contenu || '',
            });
          } else if (actType === 'CREATE_MEMORY' || actType === 'MEMORY' || actType === 'MEMOIRE') {
            actions.push({
              type: 'memory',
              titre: d.title || d.titre || 'Mémoire',
              contenu: d.description || d.content || d.contenu || d.title || d.titre || '',
              tags: Array.isArray(d.tags) ? d.tags : ['ia-auto'],
              importance: typeof d.importance === 'number' ? d.importance : 3
            });
          } else {
            actions.push({
              type: actType.toLowerCase(),
              ...d
            });
          }
        } else if (Array.isArray(parsed.actions)) {
          actions = parsed.actions;
        } else if (Array.isArray(parsed)) {
          actions = parsed;
        }
      } catch (e) {
        console.warn('Erreur parsing [ACTION_JSON] api/chat:', e);
      }
    }

    // 1b. Legacy/alternative formats support
    if (actions.length === 0) {
      const match = fullText.match(/ACTION_JSON\s*:\s*(\{.*?\})/s) || fullText.match(/ACTION_JSON\s*:\s*(\{[\s\S]*?\})/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          actions = parsed.actions || [];
        } catch {}
      }
    }

    reply = fullText
      .replace(/\[ACTION_JSON\][\s\S]*?(?:\[\/ACTION_JSON\]|$)/gi, '')
      .replace(/ACTION_JSON\s*:\s*```(?:json)?[\s\S]*?```/gi, '')
      .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:?\s*\{[\s\S]*?\}/gi, '')
      .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '')
      .replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '')
      .trim();

    // Fallback NLP intent detection if ACTION_JSON wasn't emitted by model
    if (!actions || actions.length === 0) {
      const cleanPrompt = (message || '').trim();
      const norm = cleanPrompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      
      if (
        norm.startsWith('rappel') ||
        norm.includes('rappelle moi') ||
        norm.includes('rappelle-moi') ||
        norm.includes('rappeler de') ||
        norm.includes('me rappeler de') ||
        norm.includes('ajoute un rappel') ||
        norm.includes('cree un rappel')
      ) {
        let reminderTitle = cleanPrompt
          .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(rappel|rappelle-moi de|rappelle-moi|rappelle moi de|rappelle moi|rappeler de|me rappeler de|ajoute un rappel pour|ajoute un rappel|cree un rappel|programme un rappel)\s*:?\s*/i, '')
          .replace(/^(de|pour|que)\s+/i, '')
          .trim();
        if (!reminderTitle) reminderTitle = 'Rappel programmé';
        actions.push({
          type: 'reminder',
          titre: reminderTitle,
          description: 'Rappel créé par Major2I.A',
          dateRappel: new Date().toISOString().split('T')[0],
          heure: '12:00',
          priorite: norm.includes('urgent') || norm.includes('important') ? 'haute' : 'normale',
        });
      } else if (
        norm.startsWith('tache') ||
        norm.startsWith('todo') ||
        norm.startsWith('projet') ||
        norm.includes('ajoute un projet') ||
        norm.includes('cree un projet') ||
        norm.includes('creer un projet') ||
        norm.includes('nouveau projet') ||
        norm.includes('dans mes projets') ||
        norm.includes('ajoute une tache') ||
        norm.includes('cree une tache') ||
        norm.includes('creer une tache') ||
        norm.includes('nouvelle tache') ||
        norm.includes('ajoute dans mes taches') ||
        norm.includes('ajoute a faire')
      ) {
        const isProject = norm.includes('projet');
        let taskTitle = cleanPrompt
          .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(projet|tâche|tache|todo|ajoute un projet|crée un projet|créer un projet|nouveau projet|ajoute une tâche|crée une tâche|nouvelle tâche|ajoute dans les tâches|ajoute dans mes tâches|ajoute à faire)\s*:?\s*/i, '')
          .replace(/^(de|pour|qui consiste à|dans le menu|dans mes tâches|dans mes projets)\s+/i, '')
          .trim();
        if (!taskTitle) taskTitle = isProject ? 'Nouveau projet' : 'Nouvelle tâche';
        actions.push({
          type: isProject ? 'project' : 'task',
          titre: taskTitle,
          description: isProject ? 'Projet créé par Major2I.A' : 'Tâche créée par Major2I.A',
          priorite: norm.includes('urgent') || norm.includes('important') ? 'haute' : 'normale',
        });
      }
    }

    // Deduplicate sources
    const uniqueSources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();
    for (const s of rawSources) {
      if (s.uri && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }

    // Exécution post-génération : déduire 1 crédit, enregistrer conversation et actions
    let updatedBalance: number | undefined = undefined;
    try {
      const remaining = await deductCredit(userId);
      if (typeof remaining === 'number') {
        updatedBalance = remaining;
      }

      const userMessage = message || (image ? '[Image fournie]' : '');
      const aiResponse = reply || 'Transmission reçue.';
      const dbClient = supabaseAdmin || serverSupabase;

      if (dbClient) {
        await dbClient.from('conversations').insert([
          {
            user_id: userId,
            message: userMessage,
            response: aiResponse,
          },
        ]);

        // Sauvegarde automatique des actions créées dans Supabase
        if (Array.isArray(actions) && actions.length > 0) {
          for (const act of actions) {
            try {
              const actType = (act.type || '').toLowerCase();
              if (actType === 'task' || actType === 'tache' || actType === 'project' || actType === 'projet') {
                await dbClient.from('taches').upsert({
                  id: act.id || Date.now() + Math.floor(Math.random() * 1000),
                  titre: act.titre || act.nom || 'Nouvelle tâche',
                  description: act.description || (actType.includes('projet') ? 'Projet créé par Major2I.A' : 'Tâche créée par Major2I.A'),
                  priorite: act.priorite || 'normale',
                  status: act.status || 'attente',
                  echeance: act.echeance || act.dateRappel || null,
                  user_id: userId,
                  date_creation: new Date().toISOString()
                }, { onConflict: 'id' });
              } else if (actType === 'reminder' || actType === 'rappel') {
                await dbClient.from('rappels').upsert({
                  id: act.id || Date.now() + Math.floor(Math.random() * 1000),
                  titre: act.titre || act.nom || 'Rappel programmé',
                  description: act.description || 'Rappel créé par Major2I.A',
                  date_rappel: act.dateRappel || new Date().toISOString().split('T')[0],
                  heure: act.heure || '12:00',
                  priorite: act.priorite || 'normale',
                  statut: act.statut || 'actif',
                  user_id: userId,
                  date_creation: new Date().toISOString()
                }, { onConflict: 'id' });
              } else if (actType === 'memory' || actType === 'memoire') {
                await dbClient.from('memoire').upsert({
                  id: act.id || Date.now() + Math.floor(Math.random() * 1000),
                  contenu: act.contenu || act.titre || 'Note mémorisée',
                  tags: Array.isArray(act.tags) ? act.tags : ['ia-auto'],
                  importance: typeof act.importance === 'number' ? act.importance : 3,
                  user_id: userId,
                  date: new Date().toISOString()
                }, { onConflict: 'id' });
              } else if (actType === 'favorite' || actType === 'favori') {
                await dbClient.from('favoris').upsert({
                  id: act.id || Date.now() + Math.floor(Math.random() * 1000),
                  titre: act.titre || act.nom || 'Favori',
                  contenu: act.contenu || act.description || '',
                  categorie: act.categorie || 'général',
                  user_id: userId,
                  date_creation: new Date().toISOString()
                }, { onConflict: 'id' });
              }
            } catch (actDbErr) {
              console.warn('[Supabase Serverless] Erreur action:', actDbErr);
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('Erreur post-traitement Supabase serverless:', dbErr);
    }

    // Send final completion payload
    res.write(`data: ${JSON.stringify({
      type: 'done',
      reply: reply || "Transmission reçue.",
      actions,
      sources: uniqueSources,
      searchQueries: Array.from(new Set(searchQueries)),
      credits: updatedBalance,
      shouldSpeak: false,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Erreur API Chat Streaming Vercel:', error);
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error?.message || "Une erreur est survenue lors de la génération de la réponse.",
      })}\n\n`);
      res.end();
    } catch {}
  }
}
