import { useState } from 'react';
import type { VideoInfo } from '../types';
import { formatFileSize } from '../utils/ffmpeg';

interface VideoAnalysisProps {
  info: VideoInfo;
}

export default function VideoAnalysis({ info }: VideoAnalysisProps) {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Info Card */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-400">📋</span> File Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="Filename" value={info.filename} />
          <InfoRow label="File Size" value={formatFileSize(info.fileSize)} />
          <InfoRow label="Container" value={info.containerFormat} />
          <InfoRow label="Video Codec" value={info.videoCodec} />
          <InfoRow label="Audio Codec" value={info.audioCodec} />
          <InfoRow label="Stream Resolution" value={info.resolution} />
          <InfoRow label="Effective Resolution" value={`${info.effectiveWidth}×${info.effectiveHeight}`} />
          <InfoRow label="Aspect Ratio" value={info.effectiveAspectRatio} />
          <InfoRow label="Frame Rate" value={info.frameRate} />
          <InfoRow label="Bitrate" value={info.bitrate} />
          <InfoRow label="Duration" value={info.duration} />
          <InfoRow label="Rotation" value={`${info.rotation}°`} />
          <InfoRow label="Color Space" value={info.colorSpace} />
          <InfoRow label="HDR/SDR" value={info.hdrInfo} />
          <InfoRow label="Audio Sample Rate" value={info.audioSampleRate} />
          <InfoRow label="Audio Channels" value={info.audioChannels > 0 ? `${info.audioChannels} (${info.audioChannels === 1 ? 'Mono' : info.audioChannels === 2 ? 'Stereo' : 'Surround'})` : 'None'} />
        </div>
      </div>

      {/* Technical Details (Collapsible) */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-purple-400">⚙️</span> Technical Details
          </h3>
          <span className={`text-gray-400 transition-transform ${showTechDetails ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showTechDetails && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-gray-400">Width:</span> <span className="text-gray-200">{info.width}px</span>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-gray-400">Height:</span> <span className="text-gray-200">{info.height}px</span>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-gray-400">Duration (seconds):</span> <span className="text-gray-200">{info.durationSeconds.toFixed(2)}s</span>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-gray-400">Container Format:</span> <span className="text-gray-200">{info.containerFormat}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata (Collapsible) */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-yellow-400">🏷️</span> Metadata Fields ({info.metadataCount} found)
          </h3>
          <span className={`text-gray-400 transition-transform ${showMetadata ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showMetadata && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-4">
            {info.metadataCount === 0 ? (
              <p className="text-gray-500 text-sm">No metadata fields detected.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(info.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-sm bg-gray-800/50 rounded-lg p-3">
                    <span className="text-gray-400 font-mono min-w-[120px]">{key}:</span>
                    <span className="text-gray-200 break-all">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600 mt-3">
              These metadata fields will be removed during the cleaning process.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-200 font-medium mt-0.5 truncate" title={value}>{value}</span>
    </div>
  );
}
