import type { VideoInfo, OutputInfo } from '../types';
import { formatFileSize } from '../utils/ffmpeg';

interface ComparisonProps {
  original: VideoInfo;
  output: OutputInfo;
  outputPreviewUrl: string;
}

export default function Comparison({ original, output, outputPreviewUrl }: ComparisonProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span>📊</span> Before / After Comparison
      </h3>

      {/* Video Preview */}
      {outputPreviewUrl && (
        <div className="mb-6 bg-black rounded-lg overflow-hidden">
          <video
            src={outputPreviewUrl}
            controls
            className="w-full max-h-72 object-contain"
          />
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            Original
          </h4>
          <div className="space-y-3 text-sm">
            <CompRow label="Resolution" value={original.resolution} />
            <CompRow label="Codec" value={original.videoCodec} />
            <CompRow label="Bitrate" value={original.bitrate} />
            <CompRow label="FPS" value={original.frameRate} />
            <CompRow label="Duration" value={original.duration} />
            <CompRow label="File Size" value={formatFileSize(original.fileSize)} />
            <CompRow label="Metadata" value={`${original.metadataCount} fields`} highlight={original.metadataCount > 0} />
          </div>
        </div>

        {/* Exported */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Exported
          </h4>
          <div className="space-y-3 text-sm">
            <CompRow label="Resolution" value={output.resolution} />
            <CompRow label="Codec" value={output.codec} />
            <CompRow label="FPS" value="Same as source" />
            <CompRow label="Duration" value={output.duration} />
            <CompRow label="File Size" value={formatFileSize(output.fileSize)} />
            <CompRow label="Metadata" value={`${output.metadataCount} fields`} highlight={false} />
            <CompRow label="Checksum" value={output.checksum} />
          </div>
        </div>
      </div>

      {/* Size comparison bar */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">File Size Comparison</span>
          <span className="text-gray-300">
            {output.fileSize < original.fileSize ? (
              <span className="text-green-400">
                ↓ {formatFileSize(original.fileSize - output.fileSize)} smaller
              </span>
            ) : output.fileSize > original.fileSize ? (
              <span className="text-yellow-400">
                ↑ {formatFileSize(output.fileSize - original.fileSize)} larger
              </span>
            ) : (
              <span className="text-gray-400">Same size</span>
            )}
          </span>
        </div>
        <div className="flex gap-1 h-4">
          <div
            className="bg-red-500/60 rounded-l-full h-full transition-all"
            style={{ width: `${(original.fileSize / Math.max(original.fileSize, output.fileSize)) * 100}%` }}
            title={`Original: ${formatFileSize(original.fileSize)}`}
          />
          <div
            className="bg-green-500/60 rounded-r-full h-full transition-all"
            style={{ width: `${(output.fileSize / Math.max(original.fileSize, output.fileSize)) * 100}%` }}
            title={`Output: ${formatFileSize(output.fileSize)}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Original: {formatFileSize(original.fileSize)}</span>
          <span>Exported: {formatFileSize(output.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}

function CompRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-yellow-400' : 'text-gray-200'}`}>
        {value}
      </span>
    </div>
  );
}
