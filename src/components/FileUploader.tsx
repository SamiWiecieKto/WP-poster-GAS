import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onFilesSelected: (files: File[]) => void;
}

export function FileUploader({ onFilesSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files as FileList).filter(
      (file: File) => file.name.endsWith('.docx') || file.name.endsWith('.doc')
    );
    
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files as FileList);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200",
        isDragging 
          ? "border-blue-500 bg-blue-50" 
          : "border-gray-300 hover:border-gray-400 bg-gray-50"
      )}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white rounded-full shadow-sm">
          <UploadCloud className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            Drag & drop Word documents here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Only .docx files are supported
          </p>
        </div>
        
        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <FileText className="w-4 h-4 mr-2" />
          Select Files
          <input
            type="file"
            className="hidden"
            multiple
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  );
}
