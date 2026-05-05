// api/segment-status.js — GET ?id=xxx → retorna status atual da prediction Replicate
//
// Status possíveis: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
// Referência: https://replicate.com/docs/reference/http#predictions.get

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN nao configurado' });
  }

  var id = req.query && req.query.id;
  if (!id) return res.status(400).json({ error: 'id e obrigatorio' });

  try {
    var r = await fetch('https://api.replicate.com/v1/predictions/' + encodeURIComponent(id), {
      headers: { 'Authorization': 'Token ' + token }
    });

    var data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: 'Replicate status falhou', details: data });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,      // 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
      output: data.output || null,
      error: data.error || null,
      logs: data.logs || null,
      metrics: data.metrics || null
    });

  } catch (err) {
    return res.status(500).json({ error: 'Falha ao consultar status', details: String(err) });
  }
}

export var config = { runtime: 'nodejs', maxDuration: 10 };
