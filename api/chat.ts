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

    const systemInstruction = `Tu es MajorI.A, un assistant d'intelligence artificielle ultra-rapide, précis, direct, naturel et chaleureux.
${userGreetingInstruction}

DIRECTIVES DE RÉPONSE :
1. Réponds de façon concise, précise et directe dès les premiers mots sans préambule superflu ni répétitions inutiles.
2. Formule ta réponse avec clarté, vivacité et fluidité.
3. Si la question porte sur des faits récents, l'actualité ou la météo, exploite les données en temps réel.
4. Si et seulement si l'utilisateur demande explicitement d'enregistrer une action (rappel, tâche, mémoire, favori), termine ton message par exactement :
   ACTION_JSON:{"actions":[{"type":"reminder","titre":"...","dateRappel":"YYYY-MM-DD","heure":"HH:MM","dateFinRappel":"YYYY-MM-DD","heureFin":"HH:MM","priorite":"haute"}]}
   ou
   ACTION_JSON:{"actions":[{"type":"task","titre":"...","priorite":"normale"}]}
   ou
   ACTION_JSON:{"actions":[{"type":"memory","contenu":"...","importance":3}]}
   ou
   ACTION_JSON:{"actions":[{"type":"favorite","titre":"...","contenu":"..."}]}
   Sinon, ne produis aucun bloc ACTION_JSON.`.trim();

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

    // Extract ACTION_JSON if present
    const match = fullText.match(/ACTION_JSON\s*:\s*(\{.*?\})/s) || fullText.match(/ACTION_JSON\s*:\s*(\{[\s\S]*?\})/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        actions = parsed.actions || [];
        reply = fullText.replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:\s*\{[\s\S]*?\}/gi, '').trim();
      } catch {
        reply = fullText.replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '').trim();
      }
    }
    reply = reply.replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '').trim();

    // Deduplicate sources
    const uniqueSources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();
    for (const s of rawSources) {
      if (s.uri && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }

    // Send final completion payload
    res.write(`data: ${JSON.stringify({
      type: 'done',
      reply: reply || "Transmission reçue.",
      actions,
      sources: uniqueSources,
      searchQueries: Array.from(new Set(searchQueries)),
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
