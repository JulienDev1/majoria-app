import { GoogleGenAI } from '@google/genai';

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

const MOBILE_ASSISTANT_SYSTEM_INSTRUCTION = `Tu es l'intelligence artificielle d'un assistant personnel intégré dans une PWA multiplateforme (iOS / Android).
Tu dois détecter automatiquement la langue de l'utilisateur (FR ou EN).
Ton rôle est de traduire l'instruction de l'utilisateur en un Deep Link (URL Scheme) pour ouvrir l'application demandée sur son téléphone.
RÈGLE ABSOLUE : Tu dois IMPÉRATIVEMENT répondre UNIQUEMENT avec un objet JSON strict contenant TOUJOURS les deux champs suivants, sans jamais les omettre, sans aucun texte d'introduction et sans balises Markdown autour :
{
"feedback_speech": "Phrase courte confirmant l'action dans la langue de l'utilisateur (FR ou EN).",
"url": "L'URL ou le Schema à ouvrir sur le téléphone (string) ou null s'il n'y a aucune application à lancer."
}
Règles pour remplir le champ "url" :
Si l'utilisateur nomme une application, génère son Schema URL standard (ex: "spotify:search:[mots]", "instagram://", "https://wa.me/[numero]?text=[message]", etc.).
Pour les actions système :
- Appeler : "tel:[numero]"
- SMS : "sms:[numero]?body=[texte]"
- Email : "mailto:[email]"
- GPS / Carte : "https://www.google.com/maps/search/?api=1&query=[lieu]"
- Recherche Web : "https://www.google.com/search?q=[mots_cles]"
- Discussion / salutation : null`.trim();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const body = await parseBody(req);
    const message = body?.message || body?.command || '';
    const clean = (message || '').trim();

    if (!clean) {
      res.status(200).json({ feedback_speech: "Veuillez formuler une demande ou commande.", url: null });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
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
                res.status(200).json({ feedback_speech: parsed.feedback_speech, url: parsed.url });
                return;
              }
            }
          } catch (e) {
            console.warn(`Assistant Vercel serverless AI err (${modelName}):`, e);
          }
        }
      } catch {}
    }

    // Heuristic fallback
    const lower = clean.toLowerCase();
    const isEn = /^(open|call|text|send|navigate|where|search|play)\b/i.test(lower);

    const telMatch = clean.match(/(?:appelle|téléphone|call)\s+(?:le\s+)?([+\d\s.-]{6,})/i);
    if (telMatch) {
      const cleanNum = telMatch[1].replace(/[\s.-]/g, '');
      res.status(200).json({
        feedback_speech: isEn ? `Calling ${cleanNum}...` : `Appel vers le ${cleanNum} en cours...`,
        url: `tel:${cleanNum}`,
      });
      return;
    }

    const smsMatch = clean.match(/(?:sms|message|texte)\s+(?:à|au|to)\s+([+\d\s.-]{6,})/i);
    if (smsMatch) {
      const cleanNum = smsMatch[1].replace(/[\s.-]/g, '');
      res.status(200).json({
        feedback_speech: isEn ? `Opening SMS to ${cleanNum}...` : `Ouverture du message pour le ${cleanNum}...`,
        url: `sms:${cleanNum}`,
      });
      return;
    }

    if (/(?:gps|carte|itinéraire|guide|navigate|route|aller à|directions to)\b/i.test(lower)) {
      const query = encodeURIComponent(clean.replace(/^(?:gps|itinéraire vers|guide-moi vers|directions to|route to)\s+/i, ''));
      res.status(200).json({
        feedback_speech: isEn ? "Opening GPS navigation..." : "Lancement du guidage GPS...",
        url: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });
      return;
    }

    if (/(?:spotify|musique|chanson|play|écoute)\b/i.test(lower)) {
      const track = encodeURIComponent(clean.replace(/^(?:lance spotify|joue|mets|play)\s+/i, ''));
      res.status(200).json({
        feedback_speech: isEn ? "Opening Spotify..." : "Lancement de Spotify...",
        url: `spotify:search:${track}`,
      });
      return;
    }

    res.status(200).json({
      feedback_speech: isEn ? "Here is the result of your request." : "Voici le résultat de votre demande.",
      url: lower.length > 3 ? `https://www.google.com/search?q=${encodeURIComponent(clean)}` : null,
    });
  } catch (error: any) {
    console.error('Erreur API DeepLink Vercel:', error);
    res.status(500).json({
      feedback_speech: "Une erreur est survenue lors de l'exécution de la commande.",
      url: null,
    });
  }
}
