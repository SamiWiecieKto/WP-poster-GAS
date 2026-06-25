import React, { useState } from 'react';
import { WPCredentials } from '../lib/wp-api';
import { KeyRound, Link as LinkIcon, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onSave: (creds: WPCredentials) => void;
  initialCreds?: WPCredentials;
}

export function CredentialsForm({ onSave, initialCreds }: Props) {
  const [url, setUrl] = useState(initialCreds?.url || '');
  const [username, setUsername] = useState(initialCreds?.username || '');
  const [appPassword, setAppPassword] = useState(initialCreds?.appPassword || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ url, username, appPassword });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">WordPress Credentials</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your WordPress site details and an Application Password. 
        You can create an Application Password in your WordPress admin under Users &gt; Profile.
        <br/><br/>
        <strong>Note:</strong> Your WordPress site must have HTTPS enabled for Application Passwords to work securely.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WordPress URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="https://your-site.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="admin"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="xxxx xxxx xxxx xxxx"
            />
          </div>
        </div>

        <button
          type="submit"
          className={cn(
            "w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white",
            "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            "transition-colors duration-200"
          )}
        >
          Save Credentials
        </button>
      </form>
    </div>
  );
}
