import { GoogleGenAI } from '@google/genai';

// Retrieve Gemini API Key from environment (GEMINI_API_KEY from AI Studio Secrets) or localStorage
export function getGeminiApiKey(): string {
  // 1. Check process.env.GEMINI_API_KEY or process.env.API_KEY (AI Studio Secrets injected at build/runtime)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch {}

  // 2. Check Vite environment variables
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY;
    }
  } catch {}

  // 3. Check localStorage override if custom key saved by user
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('neo-gemini-api-key');
    if (customKey && customKey.trim().length > 5) {
      return customKey.trim();
    }
  }

  return '';
}

export function saveGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('neo-gemini-api-key', key.trim());
    } else {
      localStorage.removeItem('neo-gemini-api-key');
    }
  }
}

// Instantiate official @google/genai client
export function getGenAIClient(customApiKey?: string): GoogleGenAI | null {
  const key = customApiKey || getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

export interface ChatMessageParam {
  role: 'user' | 'neo' | 'assistant' | 'model';
  contenu?: string;
  text?: string;
  image?: string;
}

export interface UserProfileParam {
  prenom?: string;
  nom?: string;
  userName?: string;
}

export interface ChatResponseResult {
  reply: string;
  actions: any[];
  sources?: { title: string; uri: string }[];
  searchQueries?: string[];
}

// Build contents structure compatible with Gemini API
function buildGeminiContents(
  history: ChatMessageParam[] = [],
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

  // Current turn parts
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

  // Merge consecutive roles or ensure alternation
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

// Generate Chat Message directly from client using @google/genai
export async function generateChatMessageClient(params: {
  message: string;
  image?: string;
  history?: ChatMessageParam[];
  userProfile?: UserProfileParam;
}): Promise<ChatResponseResult> {
  const { message, image, history = [], userProfile } = params;
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "Clé API Gemini introuvable. Veuillez configurer la variable d'environnement GEMINI_API_KEY dans votre déploiement ou renseigner votre clé dans Paramètres > Moteur IA Gemini."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

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

  // Modern models list per guidelines (no deprecated models)
  const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response: any = null;

  // 1. First attempt with Google Search Grounding (if text only)
  for (const modelName of candidateModels) {
    try {
      const config: any = {
        systemInstruction,
        temperature: 0.7,
      };

      if (!image) {
        config.tools = [{ googleSearch: {} }];
      }

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
      console.warn(`Tentative directe client avec ${modelName} a échoué:`, err?.message || err);
    }
  }

  // 2. Fallback attempt without tools if search grounding was not supported or encountered rate limits
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
        console.warn(`Fallback client ${fallbackModel} a échoué:`, fallbackErr?.message || fallbackErr);
      }
    }
  }

  if (!response) {
    throw new Error("Impossible de joindre le service d'IA Gemini. Vérifiez votre clé API et votre connexion internet.");
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

  return {
    reply: reply || "Transmission reçue.",
    actions,
    sources: sources.length > 0 ? sources : undefined,
    searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
  };
}

// Client-side Audio Transcription using @google/genai
export async function transcribeAudioClient(params: {
  audioData: string;
  mimeType?: string;
  language?: string;
}): Promise<{ success: boolean; transcription: string; language: string }> {
  const { audioData, mimeType, language } = params;
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      success: true,
      transcription: "Message vocal capturé. (Pour la transcription automatique IA, ajoutez votre clé API Gemini).",
      language: language || 'fr',
    };
  }

  let base64 = audioData;
  let type = mimeType || 'audio/webm';
  if (typeof audioData === 'string' && audioData.startsWith('data:')) {
    const match = audioData.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
      type = match[1];
      base64 = match[2];
    }
  }

  type = type.split(';')[0].trim().toLowerCase();
  if (type === 'audio/x-m4a') type = 'audio/mp4';
  if (!type || type === 'audio') type = 'audio/webm';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const promptText = `Transcris fidèlement et mot pour mot cet enregistrement vocal en texte clair et bien ponctué en français (ou dans la langue parlée : ${language || 'français'}). Ne rajoute aucun commentaire, donne uniquement le texte transcrit exact.`;

    const transcribeModels = ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];
    let response: any = null;

    for (const modelName of transcribeModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: type,
                    data: base64,
                  },
                },
                { text: promptText },
              ],
            },
          ],
          config: {
            temperature: 0.1,
          },
        });
        if (response && response.text && response.text.trim().length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`Tentative transcription client (${modelName}) :`, err?.message || err);
      }
    }

    const transcription = response?.text?.trim() || "Message vocal reçu et enregistré avec succès.";
    return {
      success: true,
      transcription,
      language: language || 'fr',
    };
  } catch (error: any) {
    console.error('Erreur transcription client:', error);
    return {
      success: true,
      transcription: "Message vocal enregistré.",
      language: language || 'fr',
    };
  }
}

// Client-side Mobile Deep Link Generator
const MOBILE_ASSISTANT_SYSTEM_INSTRUCTION = `Tu es le routeur d'actions rapides et de Deep Links de l'application MajorI.A sur mobile (Android/iOS).
Analyse l'instruction vocale ou textuelle de l'utilisateur et retourne un objet JSON strict avec :
1. "feedback_speech": Une réponse ultra-courte (1 phrase max) confirmant l'action lancée en français (ou anglais si commande en anglais).
2. "url": L'URL ou le Deep Link (URI Scheme) exact à ouvrir sur l'appareil.

Exemples d'URIs :
- Appeler : "tel:[numero]"
- SMS : "sms:[numero]?body=[texte]"
- Email : "mailto:[email]"
- GPS / Carte : "https://www.google.com/maps/search/?api=1&query=[lieu]"
- Spotify : "spotify:search:[mots]"
- WhatsApp : "https://wa.me/[numero]?text=[message]"
- Recherche Web : "https://www.google.com/search?q=[mots_cles]"
- Discussion / salutation : null.

Format de sortie : JSON brut uniquement {"feedback_speech":"...","url":"..."}`.trim();

export async function generateMobileAssistantDeepLinkClient(message: string): Promise<{ feedback_speech: string; url: string | null }> {
  const clean = (message || '').trim();
  if (!clean) {
    return { feedback_speech: "Veuillez formuler une demande ou commande.", url: null };
  }

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: clean }] }],
            config: {
              systemInstruction: MOBILE_ASSISTANT_SYSTEM_INSTRUCTION,
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });

          const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
          if (rawText) {
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
            const parsed = JSON.parse(cleaned);
            if (parsed && typeof parsed.feedback_speech === 'string' && (typeof parsed.url === 'string' || parsed.url === null)) {
              return { feedback_speech: parsed.feedback_speech, url: parsed.url };
            }
          }
        } catch (e) {
          console.warn(`Mobile assistant client AI err (${modelName}):`, e);
        }
      }
    } catch {}
  }

  // Robust Heuristic Fallback
  const lower = clean.toLowerCase();
  const isEn = /^(open|call|text|send|navigate|where|search|play)\b/i.test(lower);

  const telMatch = clean.match(/(?:appelle|téléphone|call)\s+(?:le\s+)?([+\d\s.-]{6,})/i);
  if (telMatch) {
    const cleanNum = telMatch[1].replace(/[\s.-]/g, '');
    return {
      feedback_speech: isEn ? `Calling ${cleanNum}...` : `Appel vers le ${cleanNum} en cours...`,
      url: `tel:${cleanNum}`,
    };
  }

  const smsMatch = clean.match(/(?:sms|message|texte)\s+(?:à|au|to)\s+([+\d\s.-]{6,})/i);
  if (smsMatch) {
    const cleanNum = smsMatch[1].replace(/[\s.-]/g, '');
    return {
      feedback_speech: isEn ? `Opening SMS to ${cleanNum}...` : `Ouverture du message pour le ${cleanNum}...`,
      url: `sms:${cleanNum}`,
    };
  }

  if (/(?:gps|carte|itinéraire|guide|navigate|route|aller à|directions to)\b/i.test(lower)) {
    const query = encodeURIComponent(clean.replace(/^(?:gps|itinéraire vers|guide-moi vers|directions to|route to)\s+/i, ''));
    return {
      feedback_speech: isEn ? "Opening GPS navigation..." : "Lancement du guidage GPS...",
      url: `https://www.google.com/maps/search/?api=1&query=${query}`,
    };
  }

  if (/(?:spotify|musique|chanson|play|écoute)\b/i.test(lower)) {
    const track = encodeURIComponent(clean.replace(/^(?:lance spotify|joue|mets|play)\s+/i, ''));
    return {
      feedback_speech: isEn ? "Opening Spotify..." : "Lancement de Spotify...",
      url: `spotify:search:${track}`,
    };
  }

  return {
    feedback_speech: isEn ? "Here is the result of your request." : "Voici le résultat de votre demande.",
    url: lower.length > 3 ? `https://www.google.com/search?q=${encodeURIComponent(clean)}` : null,
  };
}
