import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { SiteForm } from './components/SiteForm';
import { FileUploader } from './components/FileUploader';
import { ProcessingList, ProcessedFile } from './components/ProcessingList';
import { WPCategory, fetchCategories, uploadMedia, createPost } from './lib/wp-api';
import { WPSite, WPSiteInput, listSites, createSite, updateSite, deleteSite } from './lib/sites';
import { extractHtmlFromDocx } from './lib/docx';
import { analyzeContent, generateImage } from './lib/gemini';
import { AlertTriangle } from 'lucide-react';

type FormState = { mode: 'add' } | { mode: 'edit'; site: WPSite } | null;

export default function App() {
  const [sites, setSites] = useState<WPSite[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [categoriesBySite, setCategoriesBySite] = useState<Record<string, WPCategory[]>>({});
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  // Default to draft so test runs don't go live on a client's production site.
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft');

  const activeSite = sites.find((s) => s.id === activeSiteId) || null;

  // Load saved sites on mount, with a one-time migration from the old single-site localStorage format.
  useEffect(() => {
    (async () => {
      try {
        let loaded = await listSites();

        if (loaded.length === 0) {
          const legacy = localStorage.getItem('wp_creds');
          if (legacy) {
            try {
              const parsed = JSON.parse(legacy);
              if (parsed?.url && parsed?.username && parsed?.appPassword) {
                const migrated = await createSite({
                  name: parsed.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                  url: parsed.url,
                  username: parsed.username,
                  appPassword: parsed.appPassword,
                });
                loaded = [migrated];
                localStorage.removeItem('wp_creds');
              }
            } catch {
              // ignore malformed legacy creds
            }
          }
        }

        setSites(loaded);
        if (loaded.length > 0) {
          setActiveSiteId(loaded[0].id);
        }
      } catch (err: any) {
        setGlobalError(err.message || 'Failed to load saved sites.');
      }
    })();
  }, []);

  // Ensure categories are loaded (and cached) for a given site. Returns the categories.
  const ensureCategories = async (site: WPSite): Promise<WPCategory[]> => {
    const cached = categoriesBySite[site.id];
    if (cached) return cached;
    const cats = await fetchCategories(site);
    setCategoriesBySite((prev) => ({ ...prev, [site.id]: cats }));
    return cats;
  };

  // Load categories whenever the active site changes (surfaces connection errors early).
  useEffect(() => {
    if (!activeSite) return;
    setGlobalError(null);
    ensureCategories(activeSite).catch((err: any) => {
      setGlobalError(
        err.message ||
          `Failed to connect to ${activeSite.name}. Check the credentials and ensure HTTPS is enabled.`
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSiteId]);

  const handleSaveSite = async (input: WPSiteInput) => {
    if (form?.mode === 'edit') {
      const updated = await updateSite(form.site.id, input);
      setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      // Credentials may have changed — drop cached categories so they refetch.
      setCategoriesBySite((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      if (activeSiteId === updated.id) {
        setGlobalError(null);
        ensureCategories(updated).catch((err: any) => setGlobalError(err.message));
      }
    } else {
      const created = await createSite(input);
      setSites((prev) => [...prev, created]);
      setActiveSiteId(created.id);
    }
    setForm(null);
  };

  const handleDeleteSite = async (site: WPSite) => {
    if (!window.confirm(`Delete "${site.name}"? This removes its saved credentials.`)) return;
    try {
      await deleteSite(site.id);
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      setFiles((prev) => prev.filter((f) => f.siteId !== site.id));
      setCategoriesBySite((prev) => {
        const next = { ...prev };
        delete next[site.id];
        return next;
      });
      if (activeSiteId === site.id) {
        const remaining = sites.filter((s) => s.id !== site.id);
        setActiveSiteId(remaining[0]?.id || null);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to delete site.');
    }
  };

  const handleFilesSelected = (newFiles: File[]) => {
    if (!activeSiteId) return;
    const newProcessedFiles: ProcessedFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      siteId: activeSiteId,
      file,
      status: 'pending',
      publishStatus,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newProcessedFiles]);
  };

  const processNextFile = async () => {
    if (isProcessing) return;

    const fileToProcess = files.find((f) => f.status === 'pending');
    if (!fileToProcess) return;

    const site = sites.find((s) => s.id === fileToProcess.siteId);

    const updateFile = (id: string, updates: Partial<ProcessedFile>) => {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    if (!site) {
      updateFile(fileToProcess.id, { status: 'error', error: 'Site was removed' });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Parsing
      updateFile(fileToProcess.id, { status: 'parsing', progress: 10 });
      const { html, title } = await extractHtmlFromDocx(fileToProcess.file);
      updateFile(fileToProcess.id, { title, progress: 30 });

      // 2. Analyzing & Category Selection
      updateFile(fileToProcess.id, { status: 'analyzing', progress: 40 });
      const categories = await ensureCategories(site);
      const { categoryId, imagePrompt } = await analyzeContent(html, categories);
      updateFile(fileToProcess.id, { progress: 60 });

      // 3. Generating Image
      updateFile(fileToProcess.id, { status: 'generating_image', progress: 70 });
      const base64Image = await generateImage(imagePrompt);
      updateFile(fileToProcess.id, { progress: 80 });

      // 4. Uploading to WP
      updateFile(fileToProcess.id, { status: 'uploading', progress: 85 });
      const mediaId = await uploadMedia(
        site,
        base64Image,
        `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_featured.jpg`
      );
      updateFile(fileToProcess.id, { progress: 95 });

      const postUrl = await createPost(site, title, html, categoryId, mediaId, fileToProcess.publishStatus);

      // Done
      updateFile(fileToProcess.id, { status: 'published', progress: 100, postUrl });
    } catch (err: any) {
      console.error('Error processing file:', err);
      updateFile(fileToProcess.id, { status: 'error', error: err.message || 'Unknown error occurred' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger processing when queue changes or processing finishes.
  useEffect(() => {
    if (!isProcessing && files.some((f) => f.status === 'pending')) {
      processNextFile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, isProcessing]);

  const visibleFiles = files.filter((f) => f.siteId === activeSiteId);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">WP Auto-Poster</h1>
          <p className="mt-2 text-gray-600">
            Upload Word documents to automatically generate featured images and publish them to WordPress.
          </p>
        </div>

        {globalError && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{globalError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar
            sites={sites}
            activeSiteId={activeSiteId}
            onSelect={setActiveSiteId}
            onAdd={() => setForm({ mode: 'add' })}
            onEdit={(site) => setForm({ mode: 'edit', site })}
            onDelete={handleDeleteSite}
          />

          <main className="flex-1 min-w-0 space-y-8">
            {activeSite ? (
              <>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <span className="text-sm font-medium text-gray-700 pl-1">Publish as</span>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    {(['draft', 'publish'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPublishStatus(opt)}
                        className={
                          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                          (publishStatus === opt
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700')
                        }
                      >
                        {opt === 'draft' ? 'Draft' : 'Publish live'}
                      </button>
                    ))}
                  </div>
                </div>
                <FileUploader onFilesSelected={handleFilesSelected} />
                <ProcessingList files={visibleFiles} />
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-600">
                  Add a WordPress site in the left panel to get started.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {form && (
        <SiteForm
          initial={form.mode === 'edit' ? form.site : null}
          onSave={handleSaveSite}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
