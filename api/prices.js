// api/prices.js — Fetches EOD stock prices from Yahoo Finance (server-side, no CORS)
// Uses crumb-based auth which Yahoo Finance now requires.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols?.trim()) return res.status(400).json({ error: 'symbols required', prices: {} });

  const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (!symList.length) return res.json({ prices: {}, count: 0 });

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // ── Method 1: Yahoo Finance v7 with crumb auth ───────────
  try {
    // Step 1: Get session cookie from Yahoo Finance
    const sessionRes = await fetch('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    // Extract cookies (Node 18+ has getSetCookie, older uses get)
    const rawCookies = sessionRes.headers.getSetCookie
      ? sessionRes.headers.getSetCookie()
      : (sessionRes.headers.get('set-cookie') || '').split(/,(?=[^ ])/).map(c => c.trim());
    const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');

    // Step 2: Get crumb token
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': UA,
        'Cookie': cookieStr,
        'Referer': 'https://finance.yahoo.com/',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(5000),
    });

    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith('<') || crumb.length > 20) throw new Error('Invalid crumb: ' + crumb.slice(0, 30));

    // Step 3: Fetch prices with crumb
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symList.join(','))}&crumb=${encodeURIComponent(crumb)}&formatted=false&lang=en-US&region=US`;

    const dataRes = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookieStr,
        'Referer': 'https://finance.yahoo.com/',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await dataRes.json();
    const prices = {};

    for (const q of (data.quoteResponse?.result || [])) {
      const isIndian = q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO');
      // Indian stocks: today's close · US stocks: previous close (US market not yet closed at 3:30 PM IST)
      const price = isIndian
        ? q.regularMarketPrice
        : (q.regularMarketPreviousClose || q.regularMarketPrice);
      if (price > 0) prices[q.symbol] = Math.round(price * 100) / 100;
    }

    if (Object.keys(prices).length > 0) {
      return res.json({ prices, count: Object.keys(prices).length, timestamp: new Date().toISOString(), source: 'Yahoo Finance' });
    }
    throw new Error('No prices returned from v7');

  } catch (err1) {
    // ── Method 2: Yahoo Finance v8 chart (per-symbol, no crumb) ─
    try {
      const prices = {};
      await Promise.allSettled(symList.map(async sym => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
            { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) }
          );
          const d = await r.json();
          const price = d.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price > 0) prices[sym] = Math.round(price * 100) / 100;
        } catch(e) {}
      }));

      if (Object.keys(prices).length > 0) {
        return res.json({ prices, count: Object.keys(prices).length, timestamp: new Date().toISOString(), source: 'Yahoo Finance (chart)' });
      }
      throw new Error('Chart API also empty');

    } catch (err2) {
      return res.status(502).json({
        error: `v7: ${err1.message} | chart: ${err2.message}`,
        prices: {},
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }
};
