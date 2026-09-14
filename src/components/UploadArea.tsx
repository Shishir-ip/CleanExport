import { useState, useRef, useCallback } from 'react';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
}

export default function UploadArea({ onFileSelect }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12 md:p-16
          transition-all duration-300 text-center
          ${isDragging
            ? 'border-blue-400 bg-blue-500/10 scale-[1.02]'
            : 'border-gray-700 bg-gray-900/30 hover:border-gray-500 hover:bg-gray-900/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi,.mp4,.mov,.mkv,.webm,.avi"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="text-5xl">🎬</div>
          <div>
            <p className="text-xl font-medium text-gray-200">
              {isDragging ? 'Drop your video here' : 'Drag & drop your video file'}
            </p>
            <p className="text-gray-500 mt-1">or click to browse</p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            Choose Video
          </button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['MP4', 'MOV', 'MKV', 'WEBM', 'AVI'].map(format => (
            <span key={format} className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 border border-gray-700">
              {format}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Maximum file size: 2 GB • Processed locally in your browser
        </p>
      </div>

      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-400">
          🔒 <strong className="text-gray-300">Privacy Notice:</strong> Your original file is processed only for export.
          Do not upload content you do not own or have permission to edit.
        </p>
      </div>
    </div>
  );
}
