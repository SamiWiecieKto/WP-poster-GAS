import React, { useEffect, useRef, useState } from 'react';
import { WPSite, WPSiteInput } from '../lib/sites';
import { KeyRound, Link as LinkIcon, User, Tag, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  initial?: WPSite | null;
  onSave: (input: WPSiteInput) => Promise<void> | void;
  onCancel: () => void;
}

export function SiteForm({ initial, onSave, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initial?.name || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [username, setUsername] = useState(initial?.username || '');
  const [appPassword, setAppPassword] = useState(initial?.appPassword || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initial;

  // Native modal gives focus trapping, Escape-to-close, and backdrop for free.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({ name, url, username, appPassword });
    } catch (err: any) {
      setError(err.message || 'Failed to save site');
      setSaving(false);
    }
  };

  const inputWrap = "relative";
  const inputIcon = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";
  const inputField =
    "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
      className="w-full max-w-md rounded-xl shadow-xl border border-gray-100 p-0 m-auto backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">
          {isEditing ? 'Edit Site' : 'Add New Site'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <div className={inputWrap}>
            <div className={inputIcon}>
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputField}
              placeholder="My Blog"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WordPress URL</label>
          <div className={inputWrap}>
            <div className={inputIcon}>
              <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputField}
              placeholder="https://your-site.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <div className={inputWrap}>
            <div className={inputIcon}>
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputField}
              placeholder="admin"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
          <div className={inputWrap}>
            <div className={inputIcon}>
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              className={inputField}
              placeholder="xxxx xxxx xxxx xxxx"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm",
              "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            )}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Site'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
