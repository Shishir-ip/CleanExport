import { useState, useRef, useCallback } from 'react';
import type { VideoInfo, ProcessingSettings, OutputDimensions } from '../types';

interface AspectPreviewProps {
  videoPreviewUrl: string;
  videoInfo: VideoInfo;
  outputDimensions: OutputDimensions;
  settings: ProcessingSettings;
  onSettingsChange: (settings: ProcessingSettings) => void;
}

export default function AspectPreview({
  videoPreviewUrl,
  videoInfo,
  outputDimensions,
  settings,
  onSettingsChange,
}: AspectPreviewProps) {
  const [isOpen, setIsOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOriginal = settings.outputAspectRatio === 'original';
  const srcW = videoInfo.effectiveWidth;
  const srcH = videoInfo.effectiveHeight;
  const outW = outputDimensions.width;
  const outH = outputDimensions.height;

  // Calculate preview container dimensions (max 400px wide)
  const maxPreviewWidth = 400;
  const previewScale = Math.min(maxPreviewWidth / Math.max(outW, srcW), 1);
  const previewW = Math.round(outW * previewScale);
  const previewH = Math.round(outH * previewScale);

  // Calculate how the source video maps to the output
  const srcRatio = srcW / srcH;
  const outRatio = outW / outH;

  // For crop mode: show the crop area
  let cropOverlay: { x: number; y: number; w: number; h: number } | null = null;
  if (!isOriginal && settings.conversionMode === 'crop') {
    // Calculate crop window in source coordinates
    let cropSrcW: number, cropSrcH: number;
    if (srcRatio > outRatio) {
      // Source wider: scale to output height, crop width
      cropSrcH = srcH;
      cropSrcW = Math.round(srcH * outRatio);
    } else {
      // Source taller: scale to output width, crop height
      cropSrcW = srcW;
      cropSrcH = Math.round(srcW / outRatio);
    }

    // Position based on crop position
    let cropX = (srcW - cropSrcW) / 2;
    let cropY = (srcH - cropSrcH) / 2;

    switch (settings.cropPosition) {
      case 'top':
        cropY = 0;
        break;
      case 'bottom':
        cropY = srcH - cropSrcH;
        break;
      case 'left':
        cropX = 0;
        break;
      case 'right':
        cropX = srcW - cropSrcW;
        break;
    }

    // Apply offsets
    const maxOffsetX = (srcW - cropSrcW) / 2;
    const maxOffsetY = (srcH - cropSrcH) / 2;
    cropX += settings.cropOffsetX * maxOffsetX;
    cropY += settings.cropOffsetY * maxOffsetY;

    // Clamp
    cropX = Math.max(0, Math.min(srcW - cropSrcW, cropX));
    cropY = Math.max(0, Math.min(srcH - cropSrcH, cropY));

    cropOverlay = {
      x: cropX,
      y: cropY,
      w: cropSrcW,
      h: cropSrcH,
    };
  }

  const handlePositionChange = useCallback((pos: ProcessingSettings['cropPosition']) => {
    onSettingsChange({ ...settings, cropPosition: pos, cropOffsetX: 0, cropOffsetY: 0 });
  }, [settings, onSettingsChange]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-cyan-400">👁️</span> Output Preview
          {!isOriginal && (
            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
              {outW}×{outH}
            </span>
          )}
        </h3>
        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          {/* Preview Area */}
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="relative bg-black rounded-lg overflow-hidden border border-gray-700"
              style={{ width: previewW, height: previewH }}
            >
              {/* Source video displayed in the output frame */}
              {isOriginal ? (
                // Original mode: show video as-is
                <video
                  src={videoPreviewUrl}
                  className="w-full h-full object-contain"
                  muted
                />
              ) : settings.conversionMode === 'crop' && cropOverlay ? (
                // Crop mode: show cropped portion
                <div className="w-full h-full relative overflow-hidden">
                  <video
                    src={videoPreviewUrl}
                    className="absolute"
                    style={{
                      width: `${(srcW / cropOverlay.w) * 100}%`,
                      height: `${(srcH / cropOverlay.h) * 100}%`,
                      left: `${-(cropOverlay.x / cropOverlay.w) * 100}%`,
                      top: `${-(cropOverlay.y / cropOverlay.h) * 100}%`,
                      objectFit: 'fill',
                    }}
                    muted
                  />
                </div>
              ) : settings.conversionMode === 'fit' ? (
                // Fit mode: show video centered with background
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    backgroundColor: settings.fitBackground === 'white' ? 'white'
                      : settings.fitBackground === 'custom' ? (settings.fitBackgroundColor || 'black')
                      : 'black'
                  }}
                >
                  <video
                    src={videoPreviewUrl}
                    className="max-w-full max-h-full object-contain"
                    muted
                  />
                </div>
              ) : (
                // Stretch mode
                <video
                  src={videoPreviewUrl}
                  className="w-full h-full object-fill"
                  muted
                />
              )}

              {/* Output dimension label */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {outW}×{outH}
              </div>
            </div>
          </div>

          {/* Output info */}
          <div className="text-center text-sm text-gray-400">
            Output: <span className="text-gray-200 font-mono">{outW} × {outH}</span>
            {' • '}
            <span className="text-gray-200">{outputDimensions.aspectRatioLabel}</span>
          </div>

          {/* Crop Position Controls (only for crop mode with different aspect ratio) */}
          {!isOriginal && settings.conversionMode === 'crop' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-medium">Crop Position:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { value: 'top', label: '⬆ Top', desc: 'Keep top of video' },
                  { value: 'center', label: '⊙ Center', desc: 'Keep center of video' },
                  { value: 'bottom', label: '⬇ Bottom', desc: 'Keep bottom of video' },
                  { value: 'left', label: '⬅ Left', desc: 'Keep left of video' },
                  { value: 'right', label: '➡ Right', desc: 'Keep right of video' },
                ].map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => handlePositionChange(pos.value as ProcessingSettings['cropPosition'])}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      settings.cropPosition === pos.value
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                    }`}
                    title={pos.desc}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              {/* Fine-tune offset sliders */}
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Horizontal offset</label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={settings.cropOffsetX}
                    onChange={(e) => onSettingsChange({ ...settings, cropOffsetX: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Vertical offset</label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={settings.cropOffsetY}
                    onChange={(e) => onSettingsChange({ ...settings, cropOffsetY: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fit background controls */}
          {!isOriginal && settings.conversionMode === 'fit' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-medium">Background:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'black', label: '⬛ Black' },
                  { value: 'white', label: '⬜ White' },
                  { value: 'blur', label: '🔵 Blurred Video' },
                  { value: 'custom', label: '🎨 Custom Color' },
                ].map(bg => (
                  <button
                    key={bg.value}
                    onClick={() => onSettingsChange({ ...settings, fitBackground: bg.value as ProcessingSettings['fitBackground'] })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      settings.fitBackground === bg.value
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
              {settings.fitBackground === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.fitBackgroundColor || '#000000'}
                    onChange={(e) => onSettingsChange({ ...settings, fitBackgroundColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-400 font-mono">{settings.fitBackgroundColor || '#000000'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
