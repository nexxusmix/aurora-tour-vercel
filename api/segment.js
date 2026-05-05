// api/segment.js — POST { image, prompt } → cria prediction Replicate, retorna { id }
//
// MODELO EM USO: meta/sam-2 (oficial Meta, segmentação automática de objetos)
// Replicate aceita { model: "meta/sam-2" } sem precisar fixar uma version ID específica
// — ele usa a versão mais recente automaticamente.
//
// Se quiser trocar de modelo, basta alterar o campo `model` abaixo. Opções populares:
//   "meta/sam-2"                              — SAM 2 oficial Meta (recomendado)
//   "lucataco/grounded-sam-2"                 — SAM 2 + texto prompt (bounding box + mask)
//   "yohannes/segment-anything-2"             — wrapper alternativo do SAM 2
//
// Para fixar uma version específica, substitua `model` por `version: "<sha256>"`.
// Versions disponíveis: https://replicate.com/meta/sam-2/versions

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'REPLICATE_API_TOKEN nao configurado.',
      help: 'Acesse vercel.com → projeto aurora-tour-vercel → Settings → Environment Variables. Token gratuito em replicate.com/account/api-tokens.'
    });
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  var image = body.image;
  var prompt = body.prompt || 'lots, lake, trees, buildings, vegetation';

  if (!image) {
    return res.status(400).json({ error: 'image (data URL base64 ou URL publica) e obrigatorio' });
  }

  // SAM 2 via meta/sam-2 (sem version fixa — usa latest)
  // Input reference: https://replicate.com/meta/sam-2
  var replicateBody = {
    model: 'meta/sam-2',
    input: {
      image: image,
      // SAM 2 faz segmentação automática de todos os objetos sem precisar de prompt de texto.
      // Se o modelo suportar text_prompt (ex: grounded-sam-2), inclua-o:
      use_m2m: true,
      points_per_side: 32,
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
      output_type: 'png'
    }
  };

  try {
    var r = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'respond-async'
      },
      body: JSON.stringify(replicateBody)
    });

    var data = await r.json();

    if (!r.ok) {
      // Fallback: tentar com version fixada do meta/sam-2 (última conhecida em 2025-08)
      // Se a requisição acima falhou por input schema incompatível, tentamos inputs mais simples
      var fallbackBody = {
        model: 'meta/sam-2',
        input: {
          image: image
        }
      };

      var r2 = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + token,
          'Content-Type': 'application/json',
          'Prefer': 'respond-async'
        },
        body: JSON.stringify(fallbackBody)
      });

      var data2 = await r2.json();
      if (!r2.ok) {
        return res.status(502).json({
          error: 'Replicate create falhou',
          details: data2,
          original_error: data
        });
      }

      return res.status(202).json({ id: data2.id, status: data2.status });
    }

    return res.status(202).json({ id: data.id, status: data.status });

  } catch (err) {
    return res.status(500).json({ error: 'Falha ao criar predicao Replicate', details: String(err) });
  }
}

export var config = { runtime: 'nodejs', maxDuration: 10 };
