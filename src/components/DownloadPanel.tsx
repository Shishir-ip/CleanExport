import type { OutputInfo } from '../types';
import { formatFileSize } from '../utils/ffmpeg';

interface DownloadPanelProps {
  output: OutputInfo;
  onReset: () => void;
}

export default function DownloadPanel({ output, onReset }: DownloadPanelProps) {
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
    <div className="bg-gradient-to-b from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-8 text-center space-y-6">
      <div className="space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-3xl font-bold text-green-400">Export Complete</h2>
        <p className="text-gray-400">Your video has been processed and is ready for download.</p>
      </div>

      {/* Output Details */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 text-left max-w-md mx-auto">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Filename</span>
            <span className="text-gray-200 font-mono text-xs truncate ml-4">{output.filename}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">File Size</span>
            <span className="text-gray-200">{formatFileSize(output.fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Resolution</span>
            <span className="text-gray-200">{output.width}×{output.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Codec</span>
            <span className="text-gray-200">{output.codec}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="text-gray-200">{output.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Metadata</span>
            <span className="text-green-400">✓ Cleaned ({output.metadataCount} fields)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Checksum</span>
            <span className="text-gray-400 font-mono text-xs">{output.checksum}</span>
          </div>
        </div>
      </div>

      {/* Processing Summary */}
      <div className="text-xs text-gray-500 max-w-md mx-auto">
        <p>Processing summary: Video was decoded and re-encoded using H.264 (libx264) with AAC audio. All ordinary metadata fields were stripped. The output is a freshly generated MP4 file with fast-start enabled.</p>
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
