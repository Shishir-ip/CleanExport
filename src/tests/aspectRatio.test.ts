/**
 * Automated tests for aspect ratio handling.
 *
 * These tests verify that the calculateOutputDimensions function
 * correctly handles various aspect ratio conversions.
 *
 * Tests the fixed implementation where:
 * - Original mode preserves dimensions exactly
 * - Effective dimensions (post-rotation) are used for all calculations
 * - No filter is generated when Original mode + Original resolution
 */

import {
  calculateOutputDimensions,
  getEffectiveDimensions,
  simplifyRatio,
  formatAspectRatioDecimal,
  getOrientationLabel,
  ensureEven,
} from '../utils/aspectRatio';
import type { VideoInfo, ProcessingSettings } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    console.log(`  ✅ ${message} (${actual.toFixed(4)} ≈ ${expected.toFixed(4)})`);
  } else {
    failed++;
    console.error(`  ❌ ${message} (expected ${expected}, got ${actual}, diff ${diff})`);
  }
}

function assertEven(n: number, message: string) {
  if (n % 2 === 0) {
    passed++;
    console.log(`  ✅ ${message} (${n} is even)`);
  } else {
    failed++;
    console.error(`  ❌ ${message} (${n} is odd!)`);
  }
}

function createMockVideoInfo(width: number, height: number, rotation: number = 0): VideoInfo {
  const effective = getEffectiveDimensions(width, height, rotation);
  const gcdFn = (a: number, b: number): number => b === 0 ? a : gcdFn(b, a % b);
  
  // Handle null dimensions
  const effectiveW = effective.w ?? width;
  const effectiveH = effective.h ?? height;
  const g = (effectiveW > 0 && effectiveH > 0) ? gcdFn(effectiveW, effectiveH) : 1;

  return {
    filename: 'test.mp4',
    fileSize: 1024 * 1024,
    containerFormat: 'mov',
    videoCodec: 'h264',
    audioCodec: 'aac',
    resolution: `${width}x${height}`,
    width,
    height,
    aspectRatio: simplifyRatio(width, height),
    aspectRatioDecimal: width / height,
    effectiveWidth: effective.w,
    effectiveHeight: effective.h,
    effectiveAspectRatio: simplifyRatio(effectiveW, effectiveH),
    effectiveAspectRatioDecimal: effectiveW / effectiveH,
    frameRate: '30 fps',
    bitrate: '5000 kb/s',
    duration: '00:00:30',
    durationSeconds: 30,
    rotation,
    colorSpace: 'bt709',
    hdrInfo: 'SDR',
    audioSampleRate: '48000 Hz',
    audioChannels: 2,
    metadata: {},
    metadataCount: 0,
  };
}

function createDefaultSettings(overrides: Partial<ProcessingSettings> = {}): ProcessingSettings {
  return {
    quality: 'balanced',
    outputResolution: 'original',
    outputAspectRatio: 'original',
    conversionMode: 'crop',
    fitBackground: 'black',
    cropPosition: 'center',
    cropOffsetX: 0,
    cropOffsetY: 0,
    frameRate: 'original',
    audio: 'aac192',
    videoCrop: {
      factor: 1,
      positionX: 0.5,
      positionY: 0.5,
    },
    ...overrides,
  };
}

// ============================================================
// TEST 1: 1080 × 1920 → Original → 1080 × 1920 (no filter)
// ============================================================
console.log('\n📐 Test 1: 1080×1920 → Original → 1080×1920');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, `Width preserved: 1080 (got ${result.width})`);
  assert(result.height === 1920, `Height preserved: 1920 (got ${result.height})`);
  assert(result.filterChain === '', `No filter chain needed (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 9 / 16, 0.01, 'Aspect ratio is 9:16');
}

// ============================================================
// TEST 2: 1920 × 1080 → Original → 1920 × 1080 (no filter)
// ============================================================
console.log('\n📐 Test 2: 1920×1080 → Original → 1920×1080');

{
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1920, `Width preserved: 1920 (got ${result.width})`);
  assert(result.height === 1080, `Height preserved: 1080 (got ${result.height})`);
  assert(result.filterChain === '', `No filter chain needed (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Aspect ratio is 16:9');
}

// ============================================================
// TEST 3: 1080 × 1080 → Original → 1080 × 1080 (no filter)
// ============================================================
console.log('\n📐 Test 3: 1080×1080 → Original → 1080×1080');

{
  const videoInfo = createMockVideoInfo(1080, 1080);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, `Width preserved: 1080 (got ${result.width})`);
  assert(result.height === 1080, `Height preserved: 1080 (got ${result.height})`);
  assert(result.filterChain === '', `No filter chain needed (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 1, 0.01, 'Aspect ratio is 1:1');
}

// ============================================================
// TEST 4: 1080 × 1350 → Original → 1080 × 1350 (no filter)
// ============================================================
console.log('\n📐 Test 4: 1080×1350 → Original → 1080×1350');

{
  const videoInfo = createMockVideoInfo(1080, 1350);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, `Width preserved: 1080 (got ${result.width})`);
  assert(result.height === 1350, `Height preserved: 1350 (got ${result.height})`);
  assert(result.filterChain === '', `No filter chain needed (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 4 / 5, 0.01, 'Aspect ratio is 4:5');
}

// ============================================================
// TEST 5: 1080 × 1920 → 16:9 Crop → 1920 × 1080
// ============================================================
console.log('\n📐 Test 5: 1080×1920 → 16:9 Crop → 1920×1080');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: 'original',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // baseSize = min(1080, 1920) = 1080
  // 16:9 landscape: targetH = 1080, targetW = 1080 * 16/9 = 1920
  assert(result.width === 1920, `Width should be 1920 (got ${result.width})`);
  assert(result.height === 1080, `Height should be 1080 (got ${result.height})`);
  assertEven(result.width, 'Output width is even');
  assertEven(result.height, 'Output height is even');
  assert(result.filterChain.includes('crop'), `Filter chain includes crop (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Output aspect ratio is 16:9');
}

// ============================================================
// TEST 6: 1920 × 1080 → 9:16 Crop → 1080 × 1920
// ============================================================
console.log('\n📐 Test 6: 1920×1080 → 9:16 Crop → 1080×1920');

{
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: '9:16',
    outputResolution: 'original',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // baseSize = min(1920, 1080) = 1080
  // 9:16 portrait: targetW = 1080, targetH = 1080 / (9/16) = 1920
  assert(result.width === 1080, `Width should be 1080 (got ${result.width})`);
  assert(result.height === 1920, `Height should be 1920 (got ${result.height})`);
  assertEven(result.width, 'Output width is even');
  assertEven(result.height, 'Output height is even');
  assert(result.filterChain.includes('crop'), `Filter chain includes crop (got "${result.filterChain}")`);
  assertClose(result.aspectRatioDecimal, 9 / 16, 0.01, 'Output aspect ratio is 9:16');
}

// ============================================================
// TEST 7: 1080 × 1920 → 16:9 Fit → 1920 × 1080 with pad
// ============================================================
console.log('\n📐 Test 7: 1080×1920 → 16:9 Fit → 1920×1080 with pad');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: 'original',
    conversionMode: 'fit',
    fitBackground: 'black',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1920, `Width should be 1920 (got ${result.width})`);
  assert(result.height === 1080, `Height should be 1080 (got ${result.height})`);
  assert(result.filterChain.includes('pad'), `Filter chain includes pad for fit mode (got "${result.filterChain}")`);
  assert(result.filterChain.includes('force_original_aspect_ratio=decrease'), 'Uses force_original_aspect_ratio=decrease');
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Output aspect ratio is 16:9');
}

// ============================================================
// TEST: Non-standard ratios → Original
// ============================================================
console.log('\n📐 Test: Non-standard ratios → Original');

{
  const videoInfo = createMockVideoInfo(1440, 1920);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1440, `3:4 width preserved: 1440 (got ${result.width})`);
  assert(result.height === 1920, `3:4 height preserved: 1920 (got ${result.height})`);
  assert(result.filterChain === '', 'No filter for original');
}

{
  const videoInfo = createMockVideoInfo(1920, 804);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1920, `2.39:1 width preserved: 1920 (got ${result.width})`);
  assert(result.height === 804, `2.39:1 height preserved: 804 (got ${result.height})`);
  assert(result.filterChain === '', 'No filter for original');
}

// ============================================================
// TEST: Rotation handling
// ============================================================
console.log('\n📐 Test: Rotation handling');

{
  // Phone video: stream is 1920x1080 with 90° rotation → effective 1080x1920
  const videoInfo = createMockVideoInfo(1920, 1080, 90);
  assert(videoInfo.effectiveWidth === 1080, `Rotated phone effective width: 1080 (got ${videoInfo.effectiveWidth})`);
  assert(videoInfo.effectiveHeight === 1920, `Rotated phone effective height: 1920 (got ${videoInfo.effectiveHeight})`);

  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1080, `Rotated original output width: 1080 (got ${result.width})`);
  assert(result.height === 1920, `Rotated original output height: 1920 (got ${result.height})`);
  assert(result.filterChain === '', `No filter for rotated original (got "${result.filterChain}")`);
}

// ============================================================
// RESULTS
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  console.log('\n❌ SOME TESTS FAILED');
} else {
  console.log('\n✅ ALL TESTS PASSED');
}

export { passed, failed };
