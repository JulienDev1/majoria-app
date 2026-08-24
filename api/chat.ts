import { GoogleGenAI } from '@google/genai';

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

    if (!message && !image) {
      res.status(400).json({ error: 'Message ou image requis.' });
      return;
    }

    const userName = (userProfile?.prenom ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim() : userProfile?.userName) || '';
    const userGreetingInstruction = userName 
      ? `L'utilisateur avec qui tu discutes s'appelle "${userName}".`
      : "";

    const systemInstruction = `Tu es MajorI.A, un assistant d'intelligence artificielle hautement performant, précis, direct, naturel et chaleureux.
${userGreetingInstruction}

DIRECTIVES DE RÉPONSE :
1. Réponds avec une exactitude maximale et un grand souci du détail à la question posée.
2. Formule ta réponse de manière fluide, vivante et concrète, sans préambule superflu, sans répéter inutilement la date du jour en introduction sauf si l'utilisateur la demande explicitement ou si c'est indispensable pour le contexte temporel.
3. Exploite pleinement les informations en temps réel de la recherche Google pour les faits d'actualité, la météo, les événements et données récentes en te basant sur la temporalité réelle actuelle.
4. Évite toute structure rigide ou scolaire de type "Définition / Contexte / Analyse". Va droit au but avec un ton naturel.
5. Si et seulement si l'utilisateur demande explicitement d'enregistrer une action (rappel, tâche, mémoire, favori), termine ton message par exactement :
   ACTION_JSON:{"actions":[{"type":"reminder","titre":"...","dateRappel":"YYYY-MM-DD","heure":"HH:MM","dateFinRappel":"YYYY-MM-DD","heureFin":"HH:MM","priorite":"haute"}]}
   ou
   ACTION_JSON:{"actions":[{"type":"task","titre":"...","priorite":"normale"}]}
   ou
   ACTION_JSON:{"actions":[{"type":"memory","contenu":"...","importance":3}]}
   ou
   ACTION_JSON:{"actions":[{"type":"favorite","titre":"...","contenu":"..."}]}
   Sinon, ne produis aucun bloc ACTION_JSON.`.trim();

    const contents = buildGeminiContents(history, message || '', image);
    const ai = new GoogleGenAI({ apiKey });

    // Enable Google Search tool for grounded, accurate real-time answers
    const config: any = {
      systemInstruction,
      temperature: 0.7,
    };

    if (!image) {
      config.tools = [{ googleSearch: {} }];
    }

    let response: any = null;
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        const extractedText = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
        if (extractedText && extractedText.length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`Tentative serveur ${modelName} a échoué:`, err?.message || err);
      }
    }

    // Fallback attempt without tools if search grounding caused an issue or empty response
    const currentExtracted = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
    if (!response || !currentExtracted) {
      for (const fallbackModel of ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest']) {
        try {
          response = await ai.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          const fallbackText = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
          if (fallbackText && fallbackText.length > 0) {
            break;
          }
        } catch (fallbackErr: any) {
          console.warn(`Fallback serveur ${fallbackModel} a échoué:`, fallbackErr?.message || fallbackErr);
        }
      }
    }

    if (!response) {
      res.status(502).json({ error: "Impossible de joindre le modèle d'IA." });
      return;
    }

    const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim() || "";
    let reply = rawText.trim();
    let actions: any[] = [];
    const sources: { title: string; uri: string }[] = [];
    let searchQueries: string[] = [];

    // Extract Grounding metadata
    const groundingMeta = response?.candidates?.[0]?.groundingMetadata;
    if (groundingMeta) {
      if (Array.isArray(groundingMeta.groundingChunks)) {
        for (const chunk of groundingMeta.groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
            });
          }
        }
      }

      if (Array.isArray(groundingMeta.webSearchQueries)) {
        const gQueries = groundingMeta.webSearchQueries.filter((q: any) => typeof q === 'string' && q.trim().length > 0);
        searchQueries = Array.from(new Set(gQueries));
      }
    }

    // Extract ACTION_JSON if present
    const match = rawText.match(/ACTION_JSON\s*:\s*(\{.*?\})/s) || rawText.match(/ACTION_JSON\s*:\s*(\{[\s\S]*?\})/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        actions = parsed.actions || [];
        reply = rawText.replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:\s*\{[\s\S]*?\}/gi, '').trim();
      } catch {
        reply = rawText.replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '').trim();
      }
    }
    reply = reply.replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '').trim();

    // Deduplicate sources by URI
    const uniqueSources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();
    for (const s of sources) {
      if (s.uri && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }

    res.status(200).json({
      reply: reply || "Transmission reçue.",
      actions,
      sources: uniqueSources,
      searchQueries,
      shouldSpeak: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API Chat Vercel:', error);
    res.status(500).json({
      error: error?.message || "Une erreur est survenue lors de la génération de la réponse.",
    });
  }
}
