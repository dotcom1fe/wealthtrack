// api/prices.js — Serverless function: fetches EOD closing prices from Yahoo Finance
// Server-side fetch bypasses CORS restrictions that block browser-based apps.
// Deploy on Vercel (free) — this function runs in Node.js, not the browser.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols || !symbols.trim()) {
    return res.status(400).json({ error: 'symbols parameter required', prices: {} });
  }

  const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (!symList.length) return res.json({ prices: {} });

  // Try Yahoo Finance v7 quote endpoint (batch request)
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symList.join(','))}&formatted=false&lang=en-US&region=IN`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) throw new Error(`Yahoo returned HTTP ${response.status}`);

    const data = await response.json();
    const prices = {};

    for (const quote of (data.quoteResponse?.result || [])) {
      const sym = quote.symbol;
      const isIndian = sym.endsWith('.NS') || sym.endsWith('.BO');

      // After 3:30 PM IST (10:00 UTC):
      //   Indian stocks  → regularMarketPrice     = TODAY's official NSE/BSE close
      //   US stocks      → regularMarketPreviousClose = YESTERDAY's NYSE close
      //   (US market hasn't opened yet at 3:30 PM IST / 5:00 AM EST)
      const price = isIndian
        ? (quote.regularMarketPrice)
        : (quote.regularMarketPreviousClose || quote.regularMarketPrice);

      if (price && price > 0) {
        prices[sym] = Math.round(price * 100) / 100;
      }
    }

    return res.json({
      prices,
      count: Object.keys(prices).length,
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance',
    });

  } catch (err) {
    // Yahoo failed — try query2 endpoint as fallback
    try {
      const url2 = url.replace('query1', 'query2');
      const r2 = await fetch(url2, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.yahoo.com' },
        signal: AbortSignal.timeout(10000),
      });
      const d2 = await r2.json();
      const prices = {};
      for (const q of (d2.quoteResponse?.result || [])) {
        const isIndian = q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO');
        const price = isIndian ? q.regularMarketPrice : (q.regularMarketPreviousClose || q.regularMarketPrice);
        if (price > 0) prices[q.symbol] = Math.round(price * 100) / 100;
      }
      return res.json({ prices, count: Object.keys(prices).length, timestamp: new Date().toISOString(), source: 'Yahoo Finance (q2)' });
    } catch (err2) {
      return res.status(502).json({ error: err.message, prices: {}, count: 0 });
    }
  }
};
