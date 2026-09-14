import type { VideoCropSettings, VideoInfo } from '../types';

/**
 * Calculate the crop region in pixels based on crop settings and source dimensions.
 * 
 * @param sourceWidth - Source video width (after rotation if applicable)
 * @param sourceHeight - Source video height (after rotation if applicable)
 * @param cropSettings - Crop factor and position
 * @returns Crop region with x, y, width, height in pixels, or null if dimensions are invalid
 */
export function calculateCropRegion(
  sourceWidth: number | null,
  sourceHeight: number | null,
  cropSettings: VideoCropSettings
): { x: number; y: number; width: number; height: number } | null {
  // Validate dimensions
  if (sourceWidth == null || sourceHeight == null || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }
  
  const { factor, positionX, positionY } = cropSettings;

  // If factor is 1, no crop needed
  if (factor === 1) {
    return {
      x: 0,
      y: 0,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  // Calculate cropped dimensions
  const cropWidth = Math.round(sourceWidth / factor);
  const cropHeight = Math.round(sourceHeight / factor);

  // Ensure even dimensions (required by most codecs)
  const evenWidth = cropWidth % 2 === 0 ? cropWidth : cropWidth + 1;
  const evenHeight = cropHeight % 2 === 0 ? cropHeight : cropHeight + 1;

  // Calculate position (0.5 = center)
  // positionX and positionY are normalized (0 to 1)
  const maxX = sourceWidth - evenWidth;
  const maxY = sourceHeight - evenHeight;

  const cropX = Math.round(positionX * maxX);
  const cropY = Math.round(positionY * maxY);

  // Clamp to valid range
  const clampedX = Math.max(0, Math.min(maxX, cropX));
  const clampedY = Math.max(0, Math.min(maxY, cropY));

  return {
    x: clampedX,
    y: clampedY,
    width: evenWidth,
    height: evenHeight,
  };
}

/**
 * Generate FFmpeg crop filter string.
 * 
 * @param cropRegion - Crop region in pixels
 * @returns FFmpeg crop filter string or empty string if no crop
 */
export function generateCropFilter(cropRegion: { x: number; y: number; width: number; height: number }): string {
  // If crop region matches full frame, no filter needed
  if (cropRegion.x === 0 && cropRegion.y === 0 && cropRegion.width > 0 && cropRegion.height > 0) {
    // Check if this is actually a crop (not full frame)
    // We'll let the caller decide based on factor
  }

  return `crop=${cropRegion.width}:${cropRegion.height}:${cropRegion.x}:${cropRegion.y}`;
}

/**
 * Check if crop is enabled (factor > 1).
 */
export function isCropEnabled(cropSettings: VideoCropSettings): boolean {
  return cropSettings.factor > 1;
}

/**
 * Get crop factor label for display.
 */
export function getCropFactorLabel(factor: number): string {
  if (factor === 1) return '1× — No Crop';
  if (factor === 1.2) return '1.2× — Slight Zoom';
  if (factor === 1.5) return '1.5× — Moderate Zoom';
  if (factor === 2) return '2× — Strong Zoom';
  return `${factor}×`;
}

/**
 * Calculate the visible area in the preview (normalized coordinates).
 * This is used to draw the crop rectangle in the UI.
 * 
 * @param cropSettings - Crop settings
 * @returns Normalized rectangle { x, y, width, height } where values are 0-1
 */
export function calculatePreviewCropRect(cropSettings: VideoCropSettings): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { factor, positionX, positionY } = cropSettings;

  if (factor === 1) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const normalizedWidth = 1 / factor;
  const normalizedHeight = 1 / factor;

  // Calculate position
  const maxX = 1 - normalizedWidth;
  const maxY = 1 - normalizedHeight;

  const rectX = positionX * maxX;
  const rectY = positionY * maxY;

  return {
    x: rectX,
    y: rectY,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

/**
 * Update crop position based on directional input.
 * 
 * @param currentSettings - Current crop settings
 * @param direction - Direction to move ('up', 'down', 'left', 'right')
 * @param step - Step size (default 0.05 = 5%)
 * @returns Updated crop settings
 */
export function updateCropPosition(
  currentSettings: VideoCropSettings,
  direction: 'up' | 'down' | 'left' | 'right',
  step: number = 0.05
): VideoCropSettings {
  const { positionX, positionY } = currentSettings;

  let newX = positionX;
  let newY = positionY;

  switch (direction) {
    case 'up':
      newY = Math.max(0, positionY - step);
      break;
    case 'down':
      newY = Math.min(1, positionY + step);
      break;
    case 'left':
      newX = Math.max(0, positionX - step);
      break;
    case 'right':
      newX = Math.min(1, positionX + step);
      break;
  }

  return {
    ...currentSettings,
    positionX: newX,
    positionY: newY,
  };
}

/**
 * Center the crop position.
 */
export function centerCropPosition(currentSettings: VideoCropSettings): VideoCropSettings {
  return {
    ...currentSettings,
    positionX: 0.5,
    positionY: 0.5,
  };
}

/**
 * Get crop summary for display in processing info.
 */
export function getCropSummary(cropSettings: VideoCropSettings): string {
  if (cropSettings.factor === 1) {
    return 'No crop';
  }

  const posPercentX = Math.round(cropSettings.positionX * 100);
  const posPercentY = Math.round(cropSettings.positionY * 100);

  return `${cropSettings.factor}× at (${posPercentX}%, ${posPercentY}%)`;
}
