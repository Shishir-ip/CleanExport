/**
 * Safe utility functions for video dimension and aspect ratio calculations.
 * These functions prevent NaN, Infinity, and invalid dimension displays.
 */

/**
 * Calculate GCD (Greatest Common Divisor) of two numbers
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Safely calculate aspect ratio from width and height.
 * Returns null if dimensions are invalid.
 */
export function calculateAspectRatio(width: number | null | undefined, height: number | null | undefined): number | null {
  if (width == null || height == null) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return width / height;
}

/**
 * Safely simplify a ratio to its simplest integer form.
 * Returns null if dimensions are invalid.
 */
export function safeSimplifyRatio(width: number | null | undefined, height: number | null | undefined): string | null {
  if (width == null || height == null) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  
  const g = gcd(width, height);
  if (g === 0) return null;
  
  return `${width / g}:${height / g}`;
}

/**
 * Safely format aspect ratio as a decimal string like "1.78:1"
 * Returns null if the decimal is invalid.
 */
export function safeFormatAspectRatioDecimal(decimal: number | null | undefined): string | null {
  if (decimal == null) return null;
  if (!Number.isFinite(decimal) || decimal <= 0) return null;
  
  if (decimal >= 1) {
    return `${decimal.toFixed(2)}:1`;
  }
  return `1:${(1 / decimal).toFixed(2)}`;
}

/**
 * Safely determine orientation from dimensions.
 * Returns null if dimensions are invalid.
 */
export function safeGetOrientation(width: number | null | undefined, height: number | null | undefined): string | null {
  if (width == null || height == null) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  
  if (width > height) return 'Landscape';
  if (height > width) return 'Portrait';
  return 'Square';
}

/**
 * Check if dimensions are valid for display/processing.
 */
export function areDimensionsValid(width: number | null | undefined, height: number | null | undefined): boolean {
  if (width == null || height == null) return false;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  return true;
}

/**
 * Format dimensions for display, showing "Detecting..." if invalid.
 */
export function formatDimensions(width: number | null | undefined, height: number | null | undefined): string {
  if (!areDimensionsValid(width, height)) {
    return 'Detecting...';
  }
  return `${width} × ${height}`;
}

/**
 * Format aspect ratio for display, showing "Detecting..." if invalid.
 */
export function formatAspectRatio(width: number | null | undefined, height: number | null | undefined): string {
  const ratio = safeSimplifyRatio(width, height);
  if (!ratio) return 'Detecting...';
  return ratio;
}

/**
 * Format orientation for display, showing "Detecting..." if invalid.
 */
export function formatOrientation(width: number | null | undefined, height: number | null | undefined): string {
  const orientation = safeGetOrientation(width, height);
  if (!orientation) return 'Detecting...';
  return orientation;
}

/**
 * Get a complete source description, handling invalid dimensions gracefully.
 */
export function safeGetSourceDescription(
  width: number | null | undefined,
  height: number | null | undefined,
  duration?: string
): string {
  if (!areDimensionsValid(width, height)) {
    return 'Detecting video metadata…';
  }
  
  const ratio = safeSimplifyRatio(width, height);
  const orientation = safeGetOrientation(width, height);
  const dimensions = `${width} × ${height}`;
  
  let result = `${ratio} ${orientation} • ${dimensions}`;
  
  if (duration && duration !== 'Unknown') {
    result += ` • ${duration}`;
  }
  
  return result;
}

/**
 * Safely parse dimensions from a string like "1920x1080"
 */
export function parseDimensions(dimString: string | null | undefined): { width: number | null; height: number | null } {
  if (!dimString) return { width: null, height: null };
  
  const match = dimString.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { width: null, height: null };
  
  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { width: null, height: null };
  }
  
  if (width <= 0 || height <= 0) {
    return { width: null, height: null };
  }
  
  return { width, height };
}

/**
 * Validate and sanitize a dimension value.
 * Returns null if invalid, otherwise returns the valid number.
 */
export function sanitizeDimension(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  if (num > 16384) return null; // Reasonable max dimension
  
  return Math.round(num);
}
