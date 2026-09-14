import type { OutputInfo } from '../types';
import { formatFileSize } from '../utils/ffmpeg';

interface DownloadPanelProps {
  output: OutputInfo;
  outputPreviewUrl: string;
  onReset: () => void;
}

export default function DownloadPanel({ output, outputPreviewUrl, onReset }: DownloadPanelProps) {
  const handleDownload = () => {
    const url = URL.createObjectURL(output.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = output.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-8 text-center space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-3xl font-bold text-green-400">Export Complete</h2>
        <p className="text-gray-400">Your video has been processed and is ready for download.</p>
      </div>

      {/* Video Preview */}
      {outputPreviewUrl && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Output Preview
          </h3>
          <video
            src={outputPreviewUrl}
            controls
            className="w-full max-h-96 rounded-lg object-contain bg-black"
          />
        </div>
      )}

      {/* Output Information */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Output Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Filename</span>
            <span className="text-gray-200 font-mono text-xs truncate ml-4 max-w-[200px]" title={output.filename}>
              {output.filename}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Resolution</span>
            <span className="text-gray-200">{output.width} × {output.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">File Size</span>
            <span className="text-gray-200">{formatFileSize(output.fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Format</span>
            <span className="text-gray-200">MP4</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Video Codec</span>
            <span className="text-gray-200">{output.codec}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Audio</span>
            <span className="text-gray-200">AAC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="text-gray-200">{output.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Checksum</span>
            <span className="text-gray-400 font-mono text-xs">{output.checksum}</span>
          </div>
        </div>
      </div>

      {/* Processing Summary */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚙️</span> Processing
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Metadata: Cleaned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Video: Re-encoded (H.264)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Audio: Re-encoded (AAC)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Output: Validated</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleDownload}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20 text-lg"
        >
          ⬇️ Download Video
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-all"
        >
          🔄 Process Another Video
        </button>
      </div>
    </div>
  );
}
