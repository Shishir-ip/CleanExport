import { useState } from 'react';
import type { ProcessingSettings as ProcessingSettingsType, VideoInfo, OutputAspectRatio, ConversionMode } from '../types';
import { ASPECT_RATIOS, getAspectRatioLabel } from '../utils/aspectRatio';

interface ProcessingSettingsProps {
  settings: ProcessingSettingsType;
  onChange: (settings: ProcessingSettingsType) => void;
  videoInfo: VideoInfo;
}

export default function ProcessingSettingsPanel({ settings, onChange, videoInfo }: ProcessingSettingsProps) {
  const [showCustom, setShowCustom] = useState(false);

  const aspectRatioOptions: { value: OutputAspectRatio; label: string; icon: string }[] = [
    { value: 'original', label: 'Original', icon: '📐' },
    { value: '9:16', label: '9:16 Portrait', icon: '📱' },
    { value: '16:9', label: '16:9 Landscape', icon: '🖥️' },
    { value: '1:1', label: '1:1 Square', icon: '⬜' },
    { value: '4:5', label: '4:5 Portrait', icon: '📲' },
    { value: '3:4', label: '3:4 Portrait', icon: '📋' },
    { value: '4:3', label: '4:3 Landscape', icon: '📺' },
    { value: '3:2', label: '3:2 Landscape', icon: '📷' },
    { value: '21:9', label: '21:9 Ultrawide', icon: '🎬' },
    { value: 'custom', label: 'Custom', icon: '✏️' },
  ];

  const conversionOptions: { value: ConversionMode; label: string; desc: string }[] = [
    { value: 'crop', label: 'Crop to Fill', desc: 'Fill the target ratio by cropping excess areas' },
    { value: 'fit', label: 'Fit with Background', desc: 'Preserve entire video, add background if needed' },
    { value: 'stretch', label: 'Stretch', desc: 'Stretch to fill (may distort)' },
  ];

  return (
    <div className="space-y-6">
      {/* Output Aspect Ratio - Primary Control */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
          Output Aspect Ratio
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Choose the aspect ratio for the exported video. Default is "Original" which preserves your source exactly.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {aspectRatioOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onChange({ ...settings, outputAspectRatio: option.value });
                if (option.value === 'custom') setShowCustom(true);
              }}
              className={`p-3 rounded-lg text-center transition-all ${
                settings.outputAspectRatio === option.value
                  ? 'bg-blue-500/15 border-2 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-gray-800/40 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <div className="text-lg mb-1">{option.icon}</div>
              <div className="text-xs font-medium">{option.label}</div>
            </button>
          ))}
        </div>

        {/* Custom aspect ratio inputs */}
        {(settings.outputAspectRatio === 'custom' || showCustom) && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">Enter custom width:height ratio:</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Width</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.customAspectRatio?.width || 16}
                  onChange={(e) => onChange({
                    ...settings,
                    customAspectRatio: {
                      width: parseInt(e.target.value) || 16,
                      height: settings.customAspectRatio?.height || 9,
                    },
                  })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <span className="text-gray-500 mt-5">:</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Height</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.customAspectRatio?.height || 9}
                  onChange={(e) => onChange({
                    ...settings,
                    customAspectRatio: {
                      width: settings.customAspectRatio?.width || 16,
                      height: parseInt(e.target.value) || 9,
                    },
                  })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            {settings.customAspectRatio && (
              <p className="text-xs text-gray-500 mt-2">
                Ratio: {(settings.customAspectRatio.width / settings.customAspectRatio.height).toFixed(3)}:1
              </p>
            )}
          </div>
        )}

        {/* Detected source info */}
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
          <p className="text-xs text-gray-500">
            Detected source:{' '}
            <span className="text-gray-300 font-medium">
              {videoInfo.effectiveAspectRatio}{' '}
              {videoInfo.effectiveWidth > videoInfo.effectiveHeight ? 'Landscape' : videoInfo.effectiveHeight > videoInfo.effectiveWidth ? 'Portrait' : 'Square'}
              {' '}• {videoInfo.effectiveWidth} × {videoInfo.effectiveHeight}
            </span>
          </p>
          {videoInfo.rotation > 0 && (
            <p className="text-xs text-yellow-400 mt-1">
              ⚠️ Source has {videoInfo.rotation}° rotation metadata — orientation is handled automatically.
            </p>
          )}
        </div>
      </div>

      {/* Conversion Mode (only when aspect ratio is not original) */}
      {settings.outputAspectRatio !== 'original' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Resize / Fit Mode
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            How to convert the video to the selected aspect ratio.
          </p>

          <div className="space-y-2">
            {conversionOptions.map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  settings.conversionMode === option.value
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="conversionMode"
                  value={option.value}
                  checked={settings.conversionMode === option.value}
                  onChange={() => onChange({ ...settings, conversionMode: option.value })}
                  className="accent-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">{option.label}</span>
                  <p className="text-xs text-gray-500">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Fit background options */}
          {settings.conversionMode === 'fit' && (
            <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Background color:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'black', label: 'Black', color: '#000000' },
                  { value: 'white', label: 'White', color: '#ffffff' },
                  { value: 'blur', label: 'Blurred', color: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
                  { value: 'custom', label: 'Custom', color: settings.fitBackgroundColor || '#333333' },
                ].map(bg => (
                  <button
                    key={bg.value}
                    onClick={() => onChange({ ...settings, fitBackground: bg.value as ProcessingSettingsType['fitBackground'] })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      settings.fitBackground === bg.value
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-600"
                      style={{ background: bg.color }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
              {settings.fitBackground === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={settings.fitBackgroundColor || '#000000'}
                    onChange={(e) => onChange({ ...settings, fitBackgroundColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-gray-500 font-mono">{settings.fitBackgroundColor || '#000000'}</span>
                </div>
              )}
            </div>
          )}

          {/* Crop position (only for crop mode) */}
          {settings.conversionMode === 'crop' && (
            <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Crop anchor (which part of the video to keep):</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'center', label: '⊙ Center' },
                  { value: 'top', label: '⬆ Top' },
                  { value: 'bottom', label: '⬇ Bottom' },
                  { value: 'left', label: '⬅ Left' },
                  { value: 'right', label: '➡ Right' },
                ].map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => onChange({ ...settings, cropPosition: pos.value as ProcessingSettingsType['cropPosition'], cropOffsetX: 0, cropOffsetY: 0 })}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      settings.cropPosition === pos.value
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Output Resolution */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
          Output Resolution
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Determines the pixel dimensions. "Original" preserves the source resolution.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'original', label: 'Original', desc: `${videoInfo.effectiveWidth}×${videoInfo.effectiveHeight}` },
            { value: '1080p', label: '1080p', desc: '1080px reference' },
            { value: '720p', label: '720p', desc: '720px reference' },
            { value: '480p', label: '480p', desc: '480px reference' },
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
              <div>
                <span className="text-sm font-medium">{option.label}</span>
                <p className="text-xs text-gray-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quality + Frame Rate + Audio in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quality */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Quality
          </h3>
          <div className="space-y-2">
            {[
              { value: 'high', label: '✨ High', desc: 'CRF 18' },
              { value: 'balanced', label: '⚖️ Balanced', desc: 'CRF 20' },
              { value: 'smaller', label: '📦 Smaller', desc: 'CRF 24' },
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
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
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Frame Rate */}
        <div>
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
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
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
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Audio
          </h3>
          <div className="space-y-2">
            {[
              { value: 'original', label: 'Original' },
              { value: 'aac192', label: 'AAC 192k' },
              { value: 'aac256', label: 'AAC 256k' },
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
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
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
