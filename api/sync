// api/sync.js — Cross-device data sync via Upstash Redis
// Vercel automatically adds these env vars when you connect Upstash:
// STORAGETRACK_KV_REST_API_URL and STORAGETRACK_KV_REST_API_TOKEN

const KV_URL   = process.env.STORAGETRACK_KV_REST_API_URL;
const KV_TOKEN = process.env.STORAGETRACK_KV_REST_API_TOKEN;
const KEY = 'wt-data';

async function kvGet() {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', KEY]),
    signal: AbortSignal.timeout(5000),
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

async function kvSet(data) {
  await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', KEY, JSON.stringify(data)]),
    signal: AbortSignal.timeout(5000),
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({ error: 'Upstash not connected — check Vercel env vars' });
  }

  // GET — load data (called when app opens on a new device)
  if (req.method === 'GET') {
    try {
      const data = await kvGet();
      return res.json({ data, found: !!data });
    } catch(e) {
      return res.status(500).json({ error: e.message, data: null });
    }
  }

  // POST — save data (called after every change)
  if (req.method === 'POST') {
    try {
      const incoming = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'Invalid body' });

      // Conflict resolution: if server has newer data, return it instead of overwriting
      const existing = await kvGet();
      if (existing && existing.lastMod && incoming.lastMod && existing.lastMod > incoming.lastMod) {
        return res.json({ saved: false, data: existing, reason: 'server_newer' });
      }

      await kvSet(incoming);
      return res.json({ saved: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
