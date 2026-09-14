import React, { useState, useRef, useEffect } from 'react';
import type { VideoCropSettings, VideoInfo } from '../types';
import {
  calculatePreviewCropRect,
  updateCropPosition,
  centerCropPosition,
  getCropFactorLabel,
} from '../utils/crop';

interface CropEditorProps {
  videoInfo: VideoInfo;
  cropSettings: VideoCropSettings;
  onCropSettingsChange: (settings: VideoCropSettings) => void;
}

const CROP_FACTORS: Array<{ value: 1 | 1.2 | 1.5 | 2; label: string }> = [
  { value: 1, label: '1×' },
  { value: 1.2, label: '1.2×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
];

export const CropEditor: React.FC<CropEditorProps> = ({
  videoInfo,
  cropSettings,
  onCropSettingsChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const isCropEnabled = cropSettings.factor > 1;
  const cropRect = calculatePreviewCropRect(cropSettings);

  // Calculate preview dimensions (maintain aspect ratio)
  const maxPreviewWidth = 400;
  const maxPreviewHeight = 300;
  const aspectRatio = videoInfo.width / videoInfo.height;
  
  let previewWidth = maxPreviewWidth;
  let previewHeight = maxPreviewWidth / aspectRatio;
  
  if (previewHeight > maxPreviewHeight) {
    previewHeight = maxPreviewHeight;
    previewWidth = maxPreviewHeight * aspectRatio;
  }

  const handleFactorChange = (factor: 1 | 1.2 | 1.5 | 2) => {
    onCropSettingsChange({
      ...cropSettings,
      factor,
      // Reset to center when changing factor
      positionX: 0.5,
      positionY: 0.5,
    });
  };

  const handleReset = () => {
    onCropSettingsChange({
      factor: 1,
      positionX: 0.5,
      positionY: 0.5,
    });
  };

  const handleCenterCrop = () => {
    onCropSettingsChange(centerCropPosition(cropSettings));
  };

  const handleDirectionChange = (direction: 'up' | 'down' | 'left' | 'right') => {
    onCropSettingsChange(updateCropPosition(cropSettings, direction));
  };

  // Mouse/touch handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropEnabled || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isCropEnabled || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;
    
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    // Update position based on drag delta
    const newPositionX = Math.max(0, Math.min(1, cropSettings.positionX - deltaX));
    const newPositionY = Math.max(0, Math.min(1, cropSettings.positionY - deltaY));
    
    onCropSettingsChange({
      ...cropSettings,
      positionX: newPositionX,
      positionY: newPositionY,
    });
    
    setDragStart({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Video Crop
        </label>
        <div className="flex gap-2">
          {CROP_FACTORS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFactorChange(value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                cropSettings.factor === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isCropEnabled && (
        <>
          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Crop Preview
            </label>
            <div
              ref={previewRef}
              className="relative bg-gray-900 rounded-lg overflow-hidden cursor-move select-none"
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Video preview (placeholder) */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center"
                style={{
                  width: `${previewWidth}px`,
                  height: `${previewHeight}px`,
                }}
              >
                <div className="text-gray-400 text-sm">
                  {videoInfo.width} × {videoInfo.height}
                </div>
              </div>

              {/* Crop overlay */}
              <div
                className="absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              >
                <div className="absolute top-1 left-1 text-xs text-blue-300 bg-black/50 px-1 rounded">
                  {getCropFactorLabel(cropSettings.factor)}
                </div>
              </div>

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
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Drag to reposition the crop area
            </p>
          </div>

          {/* Position controls */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Position
            </label>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleCenterCrop}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Center Crop
              </button>
              
              <div className="grid grid-cols-3 gap-1">
                <div></div>
                <button
                  onClick={() => handleDirectionChange('up')}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
                >
                  ↑
                </button>
                <div></div>
                <button
                  onClick={() => handleDirectionChange('left')}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
                >
                  ←
                </button>
                <button
                  onClick={() => handleDirectionChange('down')}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDirectionChange('right')}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
                >
                  →
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Position: X: {Math.round(cropSettings.positionX * 100)}%, Y: {Math.round(cropSettings.positionY * 100)}%
            </div>
          </div>
        </>
      )}

      {!isCropEnabled && (
        <div className="text-sm text-gray-500 bg-gray-800/50 rounded-lg p-3">
          No crop applied. The video will be exported at its original dimensions.
        </div>
      )}

      <button
        onClick={handleReset}
        className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
      >
        Reset Crop
      </button>
    </div>
  );
};
