// api/rate.js — Serverless function: fetches live USD/INR exchange rate
// Tries 3 free sources in order. Server-side, no CORS issues.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sources = [
    {
      url: 'https://api.frankfurter.app/latest?from=USD&to=INR',
      extract: d => d?.rates?.INR,
      name: 'Frankfurter (ECB)',
    },
    {
      url: 'https://open.er-api.com/v6/latest/USD',
      extract: d => d?.rates?.INR,
      name: 'ExchangeRate-API',
    },
    {
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      extract: d => d?.rates?.INR,
      name: 'ExchangeRate-API v4',
    },
  ];

  for (const { url, extract, name } of sources) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const d = await r.json();
      const rate = parseFloat(extract(d));
      if (rate > 70 && rate < 160) {
        return res.json({
          rate: Math.round(rate * 100) / 100,
          date: new Date().toISOString().slice(0, 10),
          source: name,
        });
      }
    } catch (e) {
      continue;
    }
  }

  return res.status(502).json({ error: 'All exchange rate sources failed' });
};
