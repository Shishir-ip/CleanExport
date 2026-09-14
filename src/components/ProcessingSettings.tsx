import type { ProcessingSettings as ProcessingSettingsType, VideoInfo } from '../types';

interface ProcessingSettingsProps {
  settings: ProcessingSettingsType;
  onChange: (settings: ProcessingSettingsType) => void;
  videoInfo: VideoInfo;
}

export default function ProcessingSettingsPanel({ settings, onChange, videoInfo }: ProcessingSettingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Quality */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Quality
        </h3>
        <div className="space-y-2">
          {[
            { value: 'high', label: 'High', desc: 'CRF 18, Slow preset — Best quality, larger file', icon: '✨' },
            { value: 'balanced', label: 'Balanced', desc: 'CRF 20, Medium preset — Good balance', icon: '⚖️' },
            { value: 'smaller', label: 'Smaller File', desc: 'CRF 24, Fast preset — Smaller output', icon: '📦' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                settings.quality === option.value
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="quality"
                value={option.value}
                checked={settings.quality === option.value}
                onChange={() => onChange({ ...settings, quality: option.value as ProcessingSettingsType['quality'] })}
                className="accent-blue-500"
              />
              <div>
                <span className="text-sm font-medium">{option.icon} {option.label}</span>
                <p className="text-xs text-gray-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Output Resolution */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Output Resolution
        </h3>
        <div className="space-y-2">
          {[
            { value: 'original', label: `Original (${videoInfo.resolution})` },
            { value: '1080p', label: '1080p (1920×1080)' },
            { value: '720p', label: '720p (1280×720)' },
            { value: '480p', label: '480p (854×480)' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                settings.outputResolution === option.value
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="resolution"
                value={option.value}
                checked={settings.outputResolution === option.value}
                onChange={() => onChange({ ...settings, outputResolution: option.value as ProcessingSettingsType['outputResolution'] })}
                className="accent-blue-500"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
          {settings.outputResolution !== 'original' && videoInfo.width < parseInt(settings.outputResolution) && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ Source resolution is lower than selected output. No upscaling will occur.
            </p>
          )}
        </div>
      </div>

      {/* Frame Rate */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Frame Rate
        </h3>
        <div className="space-y-2">
          {[
            { value: 'original', label: `Original (${videoInfo.frameRate})` },
            { value: '60', label: '60 FPS' },
            { value: '30', label: '30 FPS' },
            { value: '24', label: '24 FPS' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                settings.frameRate === option.value
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="framerate"
                value={option.value}
                checked={settings.frameRate === option.value}
                onChange={() => onChange({ ...settings, frameRate: option.value as ProcessingSettingsType['frameRate'] })}
                className="accent-blue-500"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Audio */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Audio
        </h3>
        <div className="space-y-2">
          {[
            { value: 'original', label: `Original (${videoInfo.audioCodec} ${videoInfo.audioSampleRate})` },
            { value: 'aac192', label: 'AAC 192 kbps' },
            { value: 'aac256', label: 'AAC 256 kbps' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                settings.audio === option.value
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="audio"
                value={option.value}
                checked={settings.audio === option.value}
                onChange={() => onChange({ ...settings, audio: option.value as ProcessingSettingsType['audio'] })}
                className="accent-blue-500"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
