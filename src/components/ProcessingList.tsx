import React from 'react';
import { CheckCircle2, CircleDashed, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type ProcessStatus = 'pending' | 'parsing' | 'analyzing' | 'generating_image' | 'uploading' | 'published' | 'error';

export interface ProcessedFile {
  id: string;
  siteId: string;
  file: File;
  status: ProcessStatus;
  progress: number;
  error?: string;
  postUrl?: string;
  title?: string;
}

interface Props {
  files: ProcessedFile[];
}

export function ProcessingList({ files }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-medium text-gray-800">Processing Queue</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {files.map((file) => (
          <li
            key={file.id}
            className="p-4 sm:px-6 hover:bg-gray-50 transition-colors animate-fade-in-up"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <div className="flex-shrink-0 mr-4">
                  {file.status === 'published' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  ) : file.status === 'pending' ? (
                    <FileText className="h-6 w-6 text-gray-400" />
                  ) : (
                    <CircleDashed className="h-6 w-6 text-blue-500 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.title || file.file.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate flex items-center mt-0.5">
                    {getStatusText(file.status)}
                    {file.error && (
                      <span className="text-red-500 ml-2 truncate">- {file.error}</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                {file.status !== 'published' && file.status !== 'error' && file.status !== 'pending' && (
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                
                {file.postUrl && (
                  <a
                    href={file.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Post
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getStatusText(status: ProcessStatus): string {
  switch (status) {
    case 'pending': return 'Waiting in queue...';
    case 'parsing': return 'Reading document...';
    case 'analyzing': return 'Analyzing content & selecting category...';
    case 'generating_image': return 'Generating featured image...';
    case 'uploading': return 'Publishing to WordPress...';
    case 'published': return 'Published successfully';
    case 'error': return 'Failed';
    default: return 'Processing...';
  }
}
