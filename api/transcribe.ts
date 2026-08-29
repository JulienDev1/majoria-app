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
    if (typeof audioData === 'string' && audioData.includes('base64,')) {
      const parts = audioData.split('base64,');
      base64 = parts[1];
      const header = parts[0];
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        type = mimeMatch[1];
      }
    } else if (typeof audioData === 'string' && audioData.startsWith('data:')) {
      const commaIdx = audioData.indexOf(',');
      if (commaIdx !== -1) {
        base64 = audioData.slice(commaIdx + 1);
      }
    }
    base64 = (base64 || '').replace(/\s+/g, '');

    let cleanType = (type || '').split(';')[0].trim().toLowerCase();
    if (cleanType === 'audio/x-m4a' || cleanType === 'audio/m4a' || cleanType === 'audio/mp4a-latm') cleanType = 'audio/mp4';
    if (cleanType === 'audio/wave' || cleanType === 'audio/x-wav') cleanType = 'audio/wav';
    if (cleanType === 'audio/ogg' || cleanType === 'audio/vorbis' || cleanType === 'audio/opus') cleanType = 'audio/ogg';
    if (cleanType === 'audio/mpeg' || cleanType === 'audio/mp3') cleanType = 'audio/mp3';
    if (cleanType === 'audio/webm' || cleanType.startsWith('audio/webm')) cleanType = 'audio/webm';
    if (!cleanType || !cleanType.startsWith('audio/')) cleanType = 'audio/webm';

    const ai = new GoogleGenAI({ apiKey });
    const promptText = `Écoute cet enregistrement audio et retranscris fidèlement, mot pour mot et avec exactitude chaque parole prononcée en ${language || 'français'}. Rends UNIQUEMENT le texte exact dit, sans ajouter de guillemets, d'introduction, d'explication ou de commentaire.`;

    let response: any = null;
    const transcribeModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];

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
                    mimeType: cleanType,
                    data: base64,
                  },
                },
                { text: promptText },
              ],
            },
          ],
          config: {
            temperature: 0.0,
            maxOutputTokens: 1024,
          },
        });
        if (response && response.text && response.text.trim().length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`Tentative transcription (${modelName}) :`, err?.message || err);
      }
    }

    let rawText = response?.text?.trim() || '';
    rawText = rawText.replace(/^["'«»]+|["'«»]+$/g, '').trim();
    rawText = rawText.replace(/^(transcription|texte transcrit|résultat)\s*:\s*/i, '').trim();

    res.status(200).json({
      success: true,
      transcription: rawText,
      language: language || 'fr',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API Transcription Vercel:', error);
    res.status(500).json({ error: error?.message || 'Erreur transcription' });
  }
}
