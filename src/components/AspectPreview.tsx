import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoInfo, ProcessingSettings, OutputDimensions } from '../types';
import { calculatePreviewCropRect, isCropEnabled } from '../utils/crop';

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const srcW = videoInfo.effectiveWidth;
  const srcH = videoInfo.effectiveHeight;
  const outW = outputDimensions.width;
  const outH = outputDimensions.height;

  // If dimensions are not available, show a placeholder
  if (srcW == null || srcH == null || outW == null || outH == null || srcW <= 0 || srcH <= 0 || outW <= 0 || outH <= 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900/50 rounded-lg">
        <p className="text-gray-500">Detecting video dimensions…</p>
      </div>
    );
  }

  // Calculate preview dimensions (responsive, max 500px wide)
  const maxPreviewWidth = 500;
  const previewScale = Math.min(maxPreviewWidth / Math.max(outW, srcW), 1);
  const previewW = Math.round(outW * previewScale);
  const previewH = Math.round(outH * previewScale);

  // Calculate crop overlay if crop is enabled
  const cropEnabled = isCropEnabled(settings.videoCrop);
  const cropRect = cropEnabled ? calculatePreviewCropRect(settings.videoCrop) : null;

  // Calculate aspect ratio conversion overlay if needed
  const isOriginal = settings.outputAspectRatio === 'original';
  const srcRatio = srcW / srcH;
  const outRatio = outW / outH;
  
  let conversionOverlay: { x: number; y: number; w: number; h: number } | null = null;
  if (!isOriginal && settings.conversionMode === 'crop') {
    let cropSrcW: number, cropSrcH: number;
    if (srcRatio > outRatio) {
      cropSrcH = srcH;
      cropSrcW = Math.round(srcH * outRatio);
    } else {
      cropSrcW = srcW;
      cropSrcH = Math.round(srcW / outRatio);
    }

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

    const maxOffsetX = (srcW - cropSrcW) / 2;
    const maxOffsetY = (srcH - cropSrcH) / 2;
    cropX += settings.cropOffsetX * maxOffsetX;
    cropY += settings.cropOffsetY * maxOffsetY;

    cropX = Math.max(0, Math.min(srcW - cropSrcW, cropX));
    cropY = Math.max(0, Math.min(srcH - cropSrcH, cropY));

    conversionOverlay = {
      x: cropX / srcW,
      y: cropY / srcH,
      w: cropSrcW / srcW,
      h: cropSrcH / srcH,
    };
  }

  // Drag handlers for crop positioning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cropEnabled || !containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setIsDragging(true);
    setDragStart({ x, y });
  }, [cropEnabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !cropEnabled || !containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;
    
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    const newPositionX = Math.max(0, Math.min(1, settings.videoCrop.positionX - deltaX));
    const newPositionY = Math.max(0, Math.min(1, settings.videoCrop.positionY - deltaY));
    
    onSettingsChange({
      ...settings,
      videoCrop: {
        ...settings.videoCrop,
        positionX: newPositionX,
        positionY: newPositionY,
      },
    });
    
    setDragStart({ x: currentX, y: currentY });
  }, [isDragging, cropEnabled, dragStart, settings, onSettingsChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handlePositionChange = useCallback((pos: ProcessingSettings['cropPosition']) => {
    onSettingsChange({ ...settings, cropPosition: pos, cropOffsetX: 0, cropOffsetY: 0 });
  }, [settings, onSettingsChange]);

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden select-none"
          style={{
            width: `${previewW}px`,
            height: `${previewH}px`,
            maxWidth: '100%',
            cursor: cropEnabled ? 'move' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Video Element */}
          <video
            src={videoPreviewUrl}
            className="w-full h-full object-cover pointer-events-none"
            muted
            playsInline
          />

          {/* Conversion Overlay (aspect ratio crop) */}
          {conversionOverlay && (
            <>
              {/* Darkened areas outside conversion crop */}
              <div
                className="absolute bg-black/70 pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: `${conversionOverlay.x * 100}%`,
                  height: '100%',
                }}
              />
              <div
                className="absolute bg-black/70 pointer-events-none"
                style={{
                  left: `${(conversionOverlay.x + conversionOverlay.w) * 100}%`,
                  top: 0,
                  right: 0,
                  height: '100%',
                }}
              />
              <div
                className="absolute bg-black/70 pointer-events-none"
                style={{
                  left: `${conversionOverlay.x * 100}%`,
                  top: 0,
                  width: `${conversionOverlay.w * 100}%`,
                  height: `${conversionOverlay.y * 100}%`,
                }}
              />
              <div
                className="absolute bg-black/70 pointer-events-none"
                style={{
                  left: `${conversionOverlay.x * 100}%`,
                  top: `${(conversionOverlay.y + conversionOverlay.h) * 100}%`,
                  width: `${conversionOverlay.w * 100}%`,
                  bottom: 0,
                }}
              />
              {/* Conversion crop border */}
              <div
                className="absolute border-2 border-blue-400 pointer-events-none"
                style={{
                  left: `${conversionOverlay.x * 100}%`,
                  top: `${conversionOverlay.y * 100}%`,
                  width: `${conversionOverlay.w * 100}%`,
                  height: `${conversionOverlay.h * 100}%`,
                }}
              />
            </>
          )}

          {/* Video Crop Overlay */}
          {cropEnabled && cropRect && (
            <>
              {/* Darkened areas outside crop */}
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: `${cropRect.x * 100}%`,
                  height: '100%',
                }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  left: `${(cropRect.x + cropRect.width) * 100}%`,
                  top: 0,
                  right: 0,
                  height: '100%',
                }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: 0,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.y * 100}%`,
                }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${(cropRect.y + cropRect.height) * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  bottom: 0,
                }}
              />
              {/* Crop border */}
              <div
                className="absolute border-2 border-cyan-400 pointer-events-none"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              >
                <div className="absolute top-1 left-1 text-xs text-cyan-300 bg-black/70 px-1 rounded">
                  {settings.videoCrop.factor}×
                </div>
              </div>
            </>
          )}

          {/* Output dimensions label */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
            {outW}×{outH}
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="text-center text-sm text-gray-400">
        Output: <span className="text-gray-200 font-mono">{outW} × {outH}</span>
        {' • '}
        <span className="text-gray-200">{outputDimensions.aspectRatioLabel}</span>
        {cropEnabled && (
          <>
            {' • '}
            <span className="text-cyan-400">Crop: {settings.videoCrop.factor}×</span>
          </>
        )}
      </div>

      {/* Crop Position Controls (only when crop is enabled) */}
      {cropEnabled && (
        <div className="space-y-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-gray-400 font-medium">Crop Position:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { value: 'top', label: '⬆ Top' },
              { value: 'center', label: '⊙ Center' },
              { value: 'bottom', label: '⬇ Bottom' },
              { value: 'left', label: '⬅ Left' },
              { value: 'right', label: '➡ Right' },
            ].map(pos => (
              <button
                key={pos.value}
                onClick={() => handlePositionChange(pos.value as ProcessingSettings['cropPosition'])}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  settings.cropPosition === pos.value
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
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

      {/* Fit background controls (only for fit mode) */}
      {!isOriginal && settings.conversionMode === 'fit' && (
        <div className="space-y-3 pt-3 border-t border-gray-800">
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
  );
}
