// Vercel serverless function: proxy WordPress REST requests (bypasses browser CORS).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { url, method, headers, body } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'Missing URL in proxy request' });
    }

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: headers || {},
    };

    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error('WP Proxy error:', error);
    return res.status(500).json({ error: error.message || 'Proxy request failed' });
  }
}
