export interface WPCredentials {
  url: string;
  username: string;
  appPassword: string;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
}

function getAuthHeader(creds: WPCredentials) {
  return {
    'Authorization': 'Basic ' + btoa(`${creds.username}:${creds.appPassword}`)
  };
}

function normalizeUrl(url: string) {
  let normalized = url.trim();
  if (!normalized.startsWith('http')) {
    normalized = 'https://' + normalized;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export async function fetchCategories(creds: WPCredentials): Promise<WPCategory[]> {
  const baseUrl = normalizeUrl(creds.url);
  const targetUrl = `${baseUrl}/wp-json/wp/v2/categories?per_page=100`;

  const response = await fetch('/api/wp-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      method: 'GET',
      headers: getAuthHeader(creds)
    })
  });

  if (!response.ok) {
    const err = await response.text();
    let parsedErr = err;
    try {
      const obj = JSON.parse(err);
      if (obj.message) parsedErr = obj.message;
      else if (obj.error) parsedErr = obj.error;
    } catch (e) {}
    throw new Error(`Failed to fetch categories: ${response.statusText} - ${parsedErr}`);
  }

  return response.json();
}

export async function uploadMedia(creds: WPCredentials, base64Image: string, filename: string): Promise<number> {
  const baseUrl = normalizeUrl(creds.url);
  const targetUrl = `${baseUrl}/wp-json/wp/v2/media`;

  const mimeString = base64Image.split(',')[0].split(':')[1].split(';')[0];
  const base64Data = base64Image.split(',')[1];

  const response = await fetch('/api/wp-proxy-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      headers: {
        ...getAuthHeader(creds),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': mimeString,
      },
      base64Data
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to upload media: ${response.statusText} - ${err}`);
  }

  const data = await response.json();
  return data.id;
}

export async function createPost(
  creds: WPCredentials, 
  title: string, 
  content: string, 
  categoryId: number, 
  mediaId?: number
): Promise<string> {
  const baseUrl = normalizeUrl(creds.url);
  const targetUrl = `${baseUrl}/wp-json/wp/v2/posts`;
  
  const payload: any = {
    title,
    content,
    status: 'publish',
    categories: [categoryId]
  };

  if (mediaId) {
    payload.featured_media = mediaId;
  }

  const response = await fetch('/api/wp-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      method: 'POST',
      headers: {
        ...getAuthHeader(creds),
        'Content-Type': 'application/json'
      },
      body: payload
    })
  });

  if (!response.ok) {
    const err = await response.text();
    let parsedErr = err;
    try {
      const obj = JSON.parse(err);
      if (obj.message) parsedErr = obj.message;
      else if (obj.error) parsedErr = obj.error;
    } catch (e) {}
    throw new Error(`Failed to create post: ${response.statusText} - ${parsedErr}`);
  }

  const data = await response.json();
  return data.link;
}
