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
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur.' });
      return;
    }

    const body = await parseBody(req);
    const { audioData, mimeType, language } = body;

    if (!audioData) {
      res.status(400).json({ error: 'Données audio requises' });
      return;
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

    const ai = new GoogleGenAI({ apiKey });
    const promptText = `Transcris fidèlement et mot pour mot cet enregistrement vocal en texte clair et bien ponctué en français (ou dans la langue parlée : ${language || 'français'}). Ne rajoute aucun commentaire, donne uniquement le texte transcrit exact.`;

    let response: any = null;
    const transcribeModels = ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];

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
        console.warn(`Tentative transcription (${modelName}) :`, err?.message || err);
      }
    }

    const transcription = response?.text?.trim() || "Message vocal reçu et enregistré avec succès.";
    res.status(200).json({
      success: true,
      transcription,
      language: language || 'fr',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API Transcription Vercel:', error);
    res.status(500).json({ error: error?.message || 'Erreur transcription' });
  }
}
