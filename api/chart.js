// Vercel Serverless Function — Twelve Data Proxy with Edge Cache
// Deployed at: /api/chart
// Cache: 15 minutes (900s) — shared across ALL users
// This means 50 users clicking the same chart = only 1 TD API call

const TD_KEY = '5cb91a751fc04995ab1e0f161c2aa02b';
const TD_BASE = 'https://api.twelvedata.com';

export default async function handler(req, res) {
  // CORS headers — allow browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { symbol, interval, outputsize } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({ error: 'Missing symbol or interval' });
    }

    // Fetch from Twelve Data
    const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize || 90}&order=ASC&format=JSON&apikey=${TD_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.status === 'error') {
      return res.status(200).json({ error: data?.message || 'No data', status: 'error' });
    }

    // Cache for 15 minutes at Vercel Edge — ALL users share this cache
    // s-maxage=900 = CDN cache 15 min
    // stale-while-revalidate=60 = serve stale for 60s while revalidating
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('Chart proxy error:', error);
    return res.status(500).json({ error: 'Proxy error' });
  }
}
