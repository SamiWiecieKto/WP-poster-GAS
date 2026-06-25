import React, { useState, useEffect } from 'react';
import { CredentialsForm } from './components/CredentialsForm';
import { FileUploader } from './components/FileUploader';
import { ProcessingList, ProcessedFile, ProcessStatus } from './components/ProcessingList';
import { WPCredentials, WPCategory, fetchCategories, uploadMedia, createPost } from './lib/wp-api';
import { extractHtmlFromDocx } from './lib/docx';
import { analyzeContent, generateImage } from './lib/gemini';
import { Settings, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [creds, setCreds] = useState<WPCredentials | null>(null);
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Load creds from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wp_creds');
    if (saved) {
      try {
        setCreds(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSaveCreds = async (newCreds: WPCredentials) => {
    setGlobalError(null);
    try {
      // Test connection by fetching categories
      const cats = await fetchCategories(newCreds);
      setCategories(cats);
      setCreds(newCreds);
      localStorage.setItem('wp_creds', JSON.stringify(newCreds));
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to connect to WordPress. Check your credentials and ensure HTTPS is enabled.');
    }
  };

  const handleChangeCredentials = () => {
    // We do NOT clear localStorage here immediately, just in case they cancel.
    // We just set creds to null to show the form again.
    // The form will be initialized with the current creds because we'll pass them!
    const current = creds;
    setCreds(null);
    // actually, let's keep it in a ref or just use the localStorage to prepopulate
  };

  const handleFilesSelected = (newFiles: File[]) => {
    const newProcessedFiles: ProcessedFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newProcessedFiles]);
  };

  const processNextFile = async () => {
    if (isProcessing || !creds) return;

    const nextFileIndex = files.findIndex(f => f.status === 'pending');
    if (nextFileIndex === -1) return; // All done

    setIsProcessing(true);
    const fileToProcess = files[nextFileIndex];

    const updateFile = (id: string, updates: Partial<ProcessedFile>) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    try {
      // 1. Parsing
      updateFile(fileToProcess.id, { status: 'parsing', progress: 10 });
      const { html, title } = await extractHtmlFromDocx(fileToProcess.file);
      updateFile(fileToProcess.id, { title, progress: 30 });

      // 2. Analyzing & Category Selection
      updateFile(fileToProcess.id, { status: 'analyzing', progress: 40 });
      const { categoryId, imagePrompt } = await analyzeContent(html, categories);
      updateFile(fileToProcess.id, { progress: 60 });

      // 3. Generating Image
      updateFile(fileToProcess.id, { status: 'generating_image', progress: 70 });
      const base64Image = await generateImage(imagePrompt);
      updateFile(fileToProcess.id, { progress: 80 });

      // 4. Uploading to WP
      updateFile(fileToProcess.id, { status: 'uploading', progress: 85 });
      const mediaId = await uploadMedia(creds, base64Image, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_featured.jpg`);
      updateFile(fileToProcess.id, { progress: 95 });

      const postUrl = await createPost(creds, title, html, categoryId, mediaId);
      
      // Done
      updateFile(fileToProcess.id, { status: 'published', progress: 100, postUrl });

    } catch (err: any) {
      console.error("Error processing file:", err);
      updateFile(fileToProcess.id, { status: 'error', error: err.message || 'Unknown error occurred' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger processing when queue changes or processing finishes
  useEffect(() => {
    if (!isProcessing && files.some(f => f.status === 'pending')) {
      processNextFile();
    }
  }, [files, isProcessing]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
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

        {!creds ? (
          <CredentialsForm onSave={handleSaveCreds} initialCreds={
            (() => {
              const saved = localStorage.getItem('wp_creds');
              if (saved) return JSON.parse(saved);
              return undefined;
            })()
          } />
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Connected to WordPress</p>
                  <p className="text-xs text-gray-500">{creds.url}</p>
                </div>
              </div>
              <button 
                onClick={handleChangeCredentials}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Change Credentials
              </button>
            </div>

            <FileUploader onFilesSelected={handleFilesSelected} />

            <ProcessingList files={files} />
          </div>
        )}

      </div>
    </div>
  );
}
