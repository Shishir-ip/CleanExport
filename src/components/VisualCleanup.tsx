import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoInfo, CleanupRegion, CropRegion } from '../types';

interface VisualCleanupProps {
  videoPreviewUrl: string;
  videoInfo: VideoInfo;
  regions: CleanupRegion[];
  onRegionsChange: (regions: CleanupRegion[]) => void;
}

export default function VisualCleanup({ videoPreviewUrl, videoInfo, regions, onRegionsChange }: VisualCleanupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'blur' | 'pixelate' | 'crop'>('blur');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<CropRegion | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setStartPos(coords);
    setIsDrawing(true);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  }, [getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentRect({
      x: Math.min(startPos.x, coords.x),
      y: Math.min(startPos.y, coords.y),
      width: Math.abs(coords.x - startPos.x),
      height: Math.abs(coords.y - startPos.y),
    });
  }, [isDrawing, getCanvasCoords, startPos]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentRect && currentRect.width > 0.02 && currentRect.height > 0.02) {
      const newRegion: CleanupRegion = {
        type: activeTool,
        region: {
          x: Math.round(currentRect.x * videoInfo.width),
          y: Math.round(currentRect.y * videoInfo.height),
          width: Math.round(currentRect.width * videoInfo.width),
          height: Math.round(currentRect.height * videoInfo.height),
        },
      };
      onRegionsChange([...regions, newRegion]);
    }
    setIsDrawing(false);
    setCurrentRect(null);
  }, [isDrawing, currentRect, activeTool, videoInfo, regions, onRegionsChange]);

  const applyPreset = useCallback((preset: string) => {
    const w = videoInfo.width;
    const h = videoInfo.height;
    let region: CropRegion;

    switch (preset) {
      case 'top':
        region = { x: 0, y: 0, width: w, height: Math.round(h * 0.1) };
        break;
      case 'bottom':
        region = { x: 0, y: Math.round(h * 0.9), width: w, height: Math.round(h * 0.1) };
        break;
      case 'left':
        region = { x: 0, y: 0, width: Math.round(w * 0.1), height: h };
        break;
      case 'right':
        region = { x: Math.round(w * 0.9), y: 0, width: Math.round(w * 0.1), height: h };
        break;
      default:
        return;
    }

    onRegionsChange([...regions, { type: activeTool, region }]);
  }, [videoInfo, regions, activeTool, onRegionsChange]);

  const removeRegion = useCallback((index: number) => {
    onRegionsChange(regions.filter((_, i) => i !== index));
  }, [regions, onRegionsChange]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-orange-400">🎨</span> Visual Cleanup
          {regions.length > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">
              {regions.length} region{regions.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          <p className="text-sm text-gray-400">
            Select a region on the video to apply blur, pixelation, or masking. This is useful for removing unwanted overlays from your own footage.
          </p>

          {/* Tool Selection */}
          <div className="flex gap-2">
            {[
              { value: 'blur', label: '🔵 Blur', desc: 'Blur a region' },
              { value: 'pixelate', label: '🟩 Pixelate', desc: 'Pixelate a region' },
              { value: 'crop', label: '🟥 Mask', desc: 'Black out a region' },
            ].map(tool => (
              <button
                key={tool.value}
                onClick={() => setActiveTool(tool.value as typeof activeTool)}
                className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                  activeTool === tool.value
                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Video Preview with Drawing Area */}
          <div
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden cursor-crosshair select-none"
            style={{ aspectRatio: `${videoInfo.width}/${videoInfo.height}`, maxHeight: '400px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <video
              ref={videoRef}
              src={videoPreviewUrl}
              className="w-full h-full object-contain pointer-events-none"
              muted
            />

            {/* Existing regions */}
            {regions.map((region, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-dashed"
                style={{
                  left: `${(region.region.x / videoInfo.width) * 100}%`,
                  top: `${(region.region.y / videoInfo.height) * 100}%`,
                  width: `${(region.region.width / videoInfo.width) * 100}%`,
                  height: `${(region.region.height / videoInfo.height) * 100}%`,
                  borderColor: region.type === 'blur' ? '#3b82f6' : region.type === 'pixelate' ? '#22c55e' : '#ef4444',
                  backgroundColor: region.type === 'blur' ? 'rgba(59,130,246,0.15)' : region.type === 'pixelate' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.3)',
                }}
              >
                <span className="absolute -top-5 left-0 text-xs text-white bg-black/70 px-1 rounded">
                  {region.type}
                </span>
              </div>
            ))}

            {/* Current drawing rect */}
            {currentRect && currentRect.width > 0 && (
              <div
                className="absolute border-2 border-yellow-400 bg-yellow-400/10"
                style={{
                  left: `${currentRect.x * 100}%`,
                  top: `${currentRect.y * 100}%`,
                  width: `${currentRect.width * 100}%`,
                  height: `${currentRect.height * 100}%`,
                }}
              />
            )}
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick presets:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'top', label: 'Remove Top Area' },
                { value: 'bottom', label: 'Remove Bottom Area' },
                { value: 'left', label: 'Remove Left Edge' },
                { value: 'right', label: 'Remove Right Edge' },
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset.value)}
                  className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region List */}
          {regions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Active regions:</p>
              {regions.map((region, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2 text-sm">
                  <span className="text-gray-300">
                    {region.type === 'blur' ? '🔵' : region.type === 'pixelate' ? '🟩' : '🟥'}{' '}
                    {region.type} — {region.region.width}×{region.region.height} at ({region.region.x}, {region.region.y})
                  </span>
                  <button
                    onClick={() => removeRegion(idx)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 italic">
            Note: Visual cleanup applies effects to your own footage. It does not automatically remove third-party ownership marks.
          </p>
        </div>
      )}
    </div>
  );
}
