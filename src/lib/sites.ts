import { WPCredentials } from './wp-api';

// A saved site is just credentials plus an id and a friendly display name.
export interface WPSite extends WPCredentials {
  id: string;
  name: string;
}

export type WPSiteInput = Omit<WPSite, 'id'>;

// Sites live in the browser's localStorage. On a hosted deployment this keeps
// each user's WordPress credentials in their own browser rather than on a
// shared server. The API stays async so callers don't need to change.
const STORAGE_KEY = 'wp_sites';

function read(): WPSite[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(sites: WPSite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

export async function listSites(): Promise<WPSite[]> {
  return read();
}

export async function createSite(data: WPSiteInput): Promise<WPSite> {
  const sites = read();
  const site: WPSite = { id: crypto.randomUUID(), ...data };
  sites.push(site);
  write(sites);
  return site;
}

export async function updateSite(id: string, data: WPSiteInput): Promise<WPSite> {
  const sites = read();
  const index = sites.findIndex((s) => s.id === id);
  if (index === -1) throw new Error('Site not found');
  const updated: WPSite = { id, ...data };
  sites[index] = updated;
  write(sites);
  return updated;
}

export async function deleteSite(id: string): Promise<void> {
  write(read().filter((s) => s.id !== id));
}
