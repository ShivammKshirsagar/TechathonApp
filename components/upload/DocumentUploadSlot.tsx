import React, { useRef, useState } from 'react';
import { DocumentFile } from '@/lib/loan-flow/types';

interface DocumentUploadSlotProps {
  docType: string;
  label: string;
  description: string;
  document: DocumentFile;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export const DocumentUploadSlot: React.FC<DocumentUploadSlotProps> = ({
  label,
  description,
  document,
  onFileSelect,
  onRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (document.status === 'pending') {
      fileInputRef.current?.click();
    }
  };

  const getStatusIcon = () => {
    switch (document.status) {
      case 'uploaded':
        return '✓';
      case 'uploading':
        return '⏳';
      case 'error':
        return '✗';
      default:
        return '📄';
    }
  };

  const getStatusColor = () => {
    switch (document.status) {
      case 'uploaded':
        return 'bg-green-50 border-green-300';
      case 'uploading':
        return 'bg-blue-50 border-blue-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      default:
        return isDragging ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-300';
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-800">{label}</h4>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        </div>
        <span className="text-2xl">{getStatusIcon()}</span>
      </div>

      {document.status === 'pending' && (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center 
                     cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <p className="text-sm text-gray-600">
            Drag & drop or <span className="text-blue-600 font-semibold">click to upload</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
        </div>
      )}

      {document.status === 'uploading' && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{document.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${document.progress}%` }}
            />
          </div>
        </div>
      )}

      {document.status === 'uploaded' && (
        <div className="mt-3 flex items-center justify-between bg-green-100 p-3 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 truncate">
              {document.fileName}
            </p>
            <p className="text-xs text-green-600">
              {document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : ''}
            </p>
          </div>
          <button
            onClick={onRemove}
            className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {document.status === 'error' && (
        <div className="mt-3 bg-red-100 p-3 rounded-lg">
          <p className="text-sm text-red-800">Upload failed. Please try again.</p>
          <button
            onClick={handleClick}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
};