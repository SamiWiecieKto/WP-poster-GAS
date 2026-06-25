// Vercel serverless function: upload media to WordPress (base64 -> binary buffer).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { url, headers, base64Data } = req.body || {};

    if (!url || !base64Data) {
      return res.status(400).json({ error: 'Missing URL or base64Data' });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: headers || {},
      body: buffer,
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error('WP Media Proxy error:', error);
    return res.status(500).json({ error: error.message || 'Media proxy request failed' });
  }
}
