import React from 'react';
import type { VideoCropSettings, VideoInfo } from '../types';
import { getCropFactorLabel } from '../utils/crop';

interface CropEditorProps {
  videoInfo: VideoInfo;
  cropSettings: VideoCropSettings;
  onCropSettingsChange: (settings: VideoCropSettings) => void;
}

const CROP_FACTORS: Array<{ value: 1 | 1.2 | 1.5 | 2; label: string; description: string }> = [
  { value: 1, label: '1×', description: 'No Crop' },
  { value: 1.2, label: '1.2×', description: 'Slight Zoom' },
  { value: 1.5, label: '1.5×', description: 'Moderate Zoom' },
  { value: 2, label: '2×', description: 'Strong Zoom' },
];

export const CropEditor: React.FC<CropEditorProps> = ({
  cropSettings,
  onCropSettingsChange,
}) => {
  const isCropEnabled = cropSettings.factor > 1;

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
    onCropSettingsChange({
      ...cropSettings,
      positionX: 0.5,
      positionY: 0.5,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>✂️</span> Video Crop
        </h3>
        {isCropEnabled && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg border border-gray-700 hover:border-gray-500"
          >
            Reset Crop
          </button>
        )}
      </div>

      {/* Crop Factor Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Zoom Level
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CROP_FACTORS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => handleFactorChange(value)}
              className={`p-4 rounded-lg text-center transition-all ${
                cropSettings.factor === value
                  ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10'
                  : 'bg-gray-800/40 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl font-bold mb-1">{label}</div>
              <div className="text-xs">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Crop Status */}
      {!isCropEnabled && (
        <div className="text-sm text-gray-500 bg-gray-800/30 rounded-lg p-3">
          No crop applied. The video will be exported at its original dimensions.
        </div>
      )}

      {/* Crop Position Controls (only when crop is enabled) */}
      {isCropEnabled && (
        <div className="space-y-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400 font-medium">
              Position: X: {Math.round(cropSettings.positionX * 100)}%, Y: {Math.round(cropSettings.positionY * 100)}%
            </p>
            <button
              onClick={handleCenterCrop}
              className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
            >
              Center Crop
            </button>
          </div>

          {/* Directional Controls */}
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button
                onClick={() => onCropSettingsChange({
                  ...cropSettings,
                  positionY: Math.max(0, cropSettings.positionY - 0.05),
                })}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                title="Move up"
              >
                ↑
              </button>
              <div></div>
              <button
                onClick={() => onCropSettingsChange({
                  ...cropSettings,
                  positionX: Math.max(0, cropSettings.positionX - 0.05),
                })}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                title="Move left"
              >
                ←
              </button>
              <button
                onClick={() => onCropSettingsChange({
                  ...cropSettings,
                  positionY: Math.min(1, cropSettings.positionY + 0.05),
                })}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => onCropSettingsChange({
                  ...cropSettings,
                  positionX: Math.min(1, cropSettings.positionX + 0.05),
                })}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                title="Move right"
              >
                →
              </button>
            </div>
            <p className="text-xs text-gray-500 flex-1">
              Use arrows to adjust crop position by 5% increments, or drag in the preview above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
