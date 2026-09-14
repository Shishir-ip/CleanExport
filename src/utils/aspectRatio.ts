import type {
  OutputAspectRatio,
  ConversionMode,
  FitBackground,
  CropPosition,
  CustomAspectRatio,
  VideoInfo,
  ProcessingSettings,
  OutputDimensions,
} from '../types';

// Aspect ratio presets as decimal values (width / height)
export const ASPECT_RATIOS: Record<string, { w: number; h: number; label: string; decimal: number; orientation: string }> = {
  'original': { w: 0, h: 0, label: 'Original', decimal: 0, orientation: '' },
  '9:16': { w: 9, h: 16, label: '9:16 Portrait', decimal: 9 / 16, orientation: 'Portrait' },
  '16:9': { w: 16, h: 9, label: '16:9 Landscape', decimal: 16 / 9, orientation: 'Landscape' },
  '1:1': { w: 1, h: 1, label: '1:1 Square', decimal: 1, orientation: 'Square' },
  '4:5': { w: 4, h: 5, label: '4:5 Portrait', decimal: 4 / 5, orientation: 'Portrait' },
  '3:4': { w: 3, h: 4, label: '3:4 Portrait', decimal: 3 / 4, orientation: 'Portrait' },
  '4:3': { w: 4, h: 3, label: '4:3 Landscape', decimal: 4 / 3, orientation: 'Landscape' },
  '3:2': { w: 3, h: 2, label: '3:2 Landscape', decimal: 3 / 2, orientation: 'Landscape' },
  '21:9': { w: 21, h: 9, label: '21:9 Ultrawide', decimal: 21 / 9, orientation: 'Landscape' },
};

export function getAspectRatioDecimal(ratio: OutputAspectRatio, custom?: CustomAspectRatio): number {
  if (ratio === 'custom' && custom) {
    return custom.width / custom.height;
  }
  if (ratio === 'original') return 0; // handled separately
  return ASPECT_RATIOS[ratio]?.decimal ?? 0;
}

export function getAspectRatioLabel(ratio: OutputAspectRatio, custom?: CustomAspectRatio): string {
  if (ratio === 'custom' && custom) {
    return `${custom.width}:${custom.height} Custom`;
  }
  return ASPECT_RATIOS[ratio]?.label ?? 'Unknown';
}

/**
 * Compute the GCD of two numbers
 */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Simplify a ratio to its simplest integer form
 */
export function simplifyRatio(w: number, h: number): string {
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/**
 * Format an aspect ratio as a decimal string like "1.78:1"
 */
export function formatAspectRatioDecimal(decimal: number): string {
  if (decimal >= 1) {
    return `${decimal.toFixed(2)}:1`;
  }
  return `1:${(1 / decimal).toFixed(2)}`;
}

/**
 * Get the effective dimensions of a video considering rotation metadata.
 * If rotation is 90° or 270°, width and height are swapped.
 */
export function getEffectiveDimensions(width: number, height: number, rotation: number): { w: number; h: number } {
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return { w: height, h: width };
  }
  return { w: width, h: height };
}

/**
 * Determine if a video needs rotation applied (has rotation metadata)
 */
export function needsRotation(rotation: number): boolean {
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  return normalizedRotation === 90 || normalizedRotation === 270 || normalizedRotation === 180;
}

/**
 * Get the orientation label for given dimensions
 */
export function getOrientationLabel(w: number, h: number): string {
  if (w > h) return 'Landscape';
  if (h > w) return 'Portrait';
  return 'Square';
}

/**
 * Ensure dimensions are even numbers (required by most codecs)
 */
export function ensureEven(n: number): number {
  return n % 2 === 0 ? n : n + 1;
}

/**
 * Calculate output dimensions based on settings.
 * This is the core function that determines the final video size.
 */
export function calculateOutputDimensions(
  videoInfo: VideoInfo,
  settings: ProcessingSettings
): OutputDimensions {
  const { effectiveWidth: srcW, effectiveHeight: srcH } = videoInfo;
  const srcRatio = srcW / srcH;

  // Determine target aspect ratio
  let targetRatio: number;
  let isOriginal = false;

  if (settings.outputAspectRatio === 'original') {
    targetRatio = srcRatio;
    isOriginal = true;
  } else if (settings.outputAspectRatio === 'custom' && settings.customAspectRatio) {
    targetRatio = settings.customAspectRatio.width / settings.customAspectRatio.height;
  } else {
    targetRatio = getAspectRatioDecimal(settings.outputAspectRatio);
  }

  // Determine target base resolution
  let baseSize: number;
  if (settings.outputResolution === 'original') {
    // Use the smaller dimension of the source as the base
    baseSize = Math.min(srcW, srcH);
  } else {
    const resMap: Record<string, number> = {
      '1080p': 1080,
      '720p': 720,
      '480p': 480,
    };
    baseSize = resMap[settings.outputResolution] || 1080;
  }

  // Calculate target width and height from aspect ratio and base size
  let targetW: number;
  let targetH: number;

  if (isOriginal && settings.outputResolution === 'original') {
    // No scaling at all - use source dimensions exactly
    targetW = srcW;
    targetH = srcH;
  } else if (targetRatio >= 1) {
    // Landscape or square: baseSize is the height
    targetH = baseSize;
    targetW = Math.round(baseSize * targetRatio);
  } else {
    // Portrait: baseSize is the width
    targetW = baseSize;
    targetH = Math.round(baseSize / targetRatio);
  }

  // Ensure even dimensions
  targetW = ensureEven(targetW);
  targetH = ensureEven(targetH);

  // Build the FFmpeg filter chain
  const filterChain = buildFilterChain(
    srcW, srcH, targetW, targetH,
    settings, videoInfo.rotation
  );

  const outputRatio = targetW / targetH;
  const aspectRatioLabel = simplifyRatio(targetW, targetH);

  return {
    width: targetW,
    height: targetH,
    aspectRatioDecimal: outputRatio,
    aspectRatioLabel,
    filterChain,
  };
}

/**
 * Build the FFmpeg video filter chain based on settings.
 * Handles rotation, scaling, cropping, fitting, and stretching.
 */
function buildFilterChain(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  settings: ProcessingSettings,
  rotation: number
): string {
  const filters: string[] = [];
  const needsRot = needsRotation(rotation);

  // Step 1: Handle rotation (autorotate)
  // FFmpeg's libx264 with -vf should handle autorotation when we use scale
  // But we need to account for it in our dimension calculations
  // The effective dimensions already account for rotation, so we just need
  // to make sure FFmpeg applies the rotation

  // Step 2: Determine if we need any scaling/cropping
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  const ratioDiff = Math.abs(srcRatio - targetRatio) / targetRatio;

  // If aspect ratios are essentially the same (within 1%), no crop/fit needed
  const sameRatio = ratioDiff < 0.01;
  const sameSize = srcW === targetW && srcH === targetH;

  if (sameSize && !needsRot && settings.outputAspectRatio === 'original' && settings.outputResolution === 'original') {
    // No video filter needed - just re-encode
    return '';
  }

  // Build scale/crop/pad filters
  if (settings.outputAspectRatio === 'original' || sameRatio) {
    // Just scale to target size (preserve aspect ratio)
    if (srcW !== targetW || srcH !== targetH) {
      filters.push(`scale=${targetW}:${targetH}`);
    }
  } else {
    // Different aspect ratio - apply conversion mode
    switch (settings.conversionMode) {
      case 'crop':
        filters.push(...buildCropFilter(srcW, srcH, targetW, targetH, settings));
        break;
      case 'fit':
        filters.push(...buildFitFilter(srcW, srcH, targetW, targetH, settings));
        break;
      case 'stretch':
        filters.push(`scale=${targetW}:${targetH}`);
        break;
    }
  }

  return filters.join(',');
}

/**
 * Build crop-to-fill filter chain.
 * Scales the video to fill the target dimensions, then crops excess.
 */
function buildCropFilter(
  srcW: number, srcH: number,
  targetW: number, targetH: number,
  settings: ProcessingSettings
): string[] {
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  const filters: string[] = [];

  // Determine crop position offsets
  const { xExpr, yExpr } = getCropPositionExpressions(settings, targetW, targetH);

  if (srcRatio > targetRatio) {
    // Source is wider than target - scale to target height, crop width
    filters.push(`scale=-2:${targetH}`);
    filters.push(`crop=${targetW}:${targetH}:${xExpr}:${yExpr}`);
  } else {
    // Source is taller than target - scale to target width, crop height
    filters.push(`scale=${targetW}:-2`);
    filters.push(`crop=${targetW}:${targetH}:${xExpr}:${yExpr}`);
  }

  return filters;
}

/**
 * Build fit-with-background filter chain.
 * Scales the video to fit within target dimensions, then pads.
 */
function buildFitFilter(
  srcW: number, srcH: number,
  targetW: number, targetH: number,
  settings: ProcessingSettings
): string[] {
  const filters: string[] = [];

  // Determine background color
  let bgColor = 'black';
  switch (settings.fitBackground) {
    case 'black':
      bgColor = 'black';
      break;
    case 'white':
      bgColor = 'white';
      break;
    case 'blur':
      // For blur background, we'll use a complex filter
      // Scale to fill, blur it, then overlay the fitted video
      // This is handled separately as a complex filter
      bgColor = 'black'; // fallback
      break;
    case 'custom':
      bgColor = settings.fitBackgroundColor || '#000000';
      break;
  }

  // Scale to fit within target dimensions
  filters.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`);

  // Pad to exact target dimensions
  filters.push(`pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`);

  return filters;
}

/**
 * Get FFmpeg crop position expressions based on the selected position.
 */
function getCropPositionExpressions(
  settings: ProcessingSettings,
  targetW: number,
  targetH: number
): { xExpr: string; yExpr: string } {
  const pos = settings.cropPosition;
  const offX = settings.cropOffsetX; // -1 to 1
  const offY = settings.cropOffsetY; // -1 to 1

  switch (pos) {
    case 'center':
      return {
        xExpr: `(iw-${targetW})/2`,
        yExpr: `(ih-${targetH})/2`,
      };
    case 'top':
      return {
        xExpr: `(iw-${targetW})/2`,
        yExpr: `0`,
      };
    case 'bottom':
      return {
        xExpr: `(iw-${targetW})/2`,
        yExpr: `ih-${targetH}`,
      };
    case 'left':
      return {
        xExpr: `0`,
        yExpr: `(ih-${targetH})/2`,
      };
    case 'right':
      return {
        xExpr: `iw-${targetW}`,
        yExpr: `(ih-${targetH})/2`,
      };
    default:
      return {
        xExpr: `(iw-${targetW})/2`,
        yExpr: `(ih-${targetH})/2`,
      };
  }
}

/**
 * Build a complex filter for blur background mode.
 * This creates a blurred background with the original video overlaid.
 */
export function buildBlurBackgroundFilter(
  targetW: number,
  targetH: number
): string {
  // Complex filter: split input, blur one copy for background, scale other to fit, overlay
  return [
    `split[bg][fg]`,
    `[bg]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=20:5[bg_blur]`,
    `[fg]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg_fit]`,
    `[bg_blur][fg_fit]overlay=(W-w)/2:(H-h)/2`,
  ].join(';');
}

/**
 * Validate that the output dimensions are correct after processing.
 * Returns true if dimensions match expected values.
 */
export function validateOutputDimensions(
  actualW: number,
  actualH: number,
  expectedW: number,
  expectedH: number
): boolean {
  // Allow 2 pixel tolerance for rounding
  return Math.abs(actualW - expectedW) <= 2 && Math.abs(actualH - expectedH) <= 2;
}

/**
 * Get a human-readable description of the source video
 */
export function getSourceDescription(videoInfo: VideoInfo): string {
  const { effectiveWidth: w, effectiveHeight: h, effectiveAspectRatioDecimal: dec } = videoInfo;
  const orientation = getOrientationLabel(w, h);
  const ratio = simplifyRatio(w, h);
  const decimalStr = formatAspectRatioDecimal(dec);
  return `${ratio} ${orientation} • ${w} × ${h} • ${decimalStr}`;
}

/**
 * Get the output description
 */
export function getOutputDescription(dims: OutputDimensions): string {
  return `${dims.width} × ${dims.height} • ${dims.aspectRatioLabel}`;
}
