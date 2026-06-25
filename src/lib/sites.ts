import { WPCredentials } from './wp-api';

// A saved site is just credentials plus an id and a friendly display name.
export interface WPSite extends WPCredentials {
  id: string;
  name: string;
}

export type WPSiteInput = Omit<WPSite, 'id'>;

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error || data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function listSites(): Promise<WPSite[]> {
  const response = await fetch('/api/sites');
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load sites'));
  }
  return response.json();
}

export async function createSite(data: WPSiteInput): Promise<WPSite> {
  const response = await fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create site'));
  }
  return response.json();
}

export async function updateSite(id: string, data: WPSiteInput): Promise<WPSite> {
  const response = await fetch(`/api/sites/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to update site'));
  }
  return response.json();
}

export async function deleteSite(id: string): Promise<void> {
  const response = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to delete site'));
  }
}
