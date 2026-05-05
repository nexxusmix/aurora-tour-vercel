// api/segment.js — POST { image, prompt } → Gemini Vision detecta objetos e retorna bounding boxes
// Síncrono — Gemini responde em ~3-8s, dentro do limite Hobby 10s.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurado no Vercel.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const image = body && body.image;
  const userPrompt = (body && body.prompt) || 'lotes de loteamento, lago/água, áreas de mata/cerrado, edificações';
  if (!image) return res.status(400).json({ error: 'image (data URL) é obrigatório' });

  // Extrair base64 + mime do data URL
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(image);
  if (!m) return res.status(400).json({ error: 'image deve ser data URL base64 (image/jpeg ou image/png)' });
  const mimeType = m[1];
  const base64 = m[2];

  const systemPrompt = `Você é um detector de objetos em imagens aéreas de loteamentos imobiliários.
Identifique os elementos solicitados pelo usuário na imagem.
Retorne APENAS um array JSON válido com a seguinte estrutura:
[
  { "label": "string descritiva (em português)", "box_2d": [ymin, xmin, ymax, xmax], "score": 0.0-1.0 }
]
- box_2d em escala 0-1000 normalizada (ymin/xmin = canto superior esquerdo, ymax/xmax = canto inferior direito).
- Inclua até 6 objetos mais relevantes.
- Se não houver detecções, retorne [].
- Não inclua texto fora do JSON. Apenas o array.`;

  const requestBody = {
    contents: [{
      role: 'user',
      parts: [
        { text: `${systemPrompt}\n\nElementos a detectar: ${userPrompt}` },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }],
    generation_config: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  // Fallback simples: tenta modelo leve primeiro (mais quota); se falhar, modelo mainstream
  const MODELS = ['gemini-1.5-flash-8b', 'gemini-1.5-flash'];

  let r, data, text, lastErr = null, modelUsed = null;
  try {
    for (const model of MODELS) {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );
      data = await r.json();
      if (r.ok) { modelUsed = model; break; }
      lastErr = data;
      if (r.status !== 429 && r.status !== 404 && r.status !== 503) break;
    }
    if (!r || !r.ok) {
      const status = r ? r.status : 500;
      return res.status(status === 429 ? 429 : 502).json({
        error: status === 429
          ? 'Cota Gemini esgotada em todos os modelos free tier. Tente novamente em alguns minutos ou troque a GEMINI_API_KEY.'
          : 'Gemini API erro',
        details: lastErr,
        models_tried: MODELS
      });
    }

    // Parse text → JSON array
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let detections = [];
    try {
      detections = JSON.parse(text);
      if (!Array.isArray(detections)) detections = [];
    } catch (e) {
      // fallback: tentar extrair JSON via regex
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { detections = JSON.parse(match[0]); } catch {}
      }
    }

    return res.status(200).json({ status: 'succeeded', detections, raw: text });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao chamar Gemini', details: String(err) });
  }
}

export const config = { runtime: 'nodejs', maxDuration: 10 };
