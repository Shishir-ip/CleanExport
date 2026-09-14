/**
 * Automated tests for aspect ratio handling.
 *
 * These tests verify that the calculateOutputDimensions function
 * correctly handles various aspect ratio conversions.
 *
 * Run with: npx tsx src/tests/aspectRatio.test.ts
 */

import {
  calculateOutputDimensions,
  getEffectiveDimensions,
  simplifyRatio,
  formatAspectRatioDecimal,
  getOrientationLabel,
  ensureEven,
  ASPECT_RATIOS,
} from '../utils/aspectRatio';
import type { VideoInfo, ProcessingSettings } from '../types';

// Test utilities
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
    console.log(`  ✅ ${message} (${actual} ≈ ${expected})`);
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

// Helper to create a mock VideoInfo
function createMockVideoInfo(width: number, height: number, rotation: number = 0): VideoInfo {
  const effective = getEffectiveDimensions(width, height, rotation);
  const gcdFn = (a: number, b: number): number => b === 0 ? a : gcdFn(b, a % b);
  const g = gcdFn(effective.w, effective.h);

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
    effectiveAspectRatio: simplifyRatio(effective.w, effective.h),
    effectiveAspectRatioDecimal: effective.w / effective.h,
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
    ...overrides,
  };
}

// ============================================================
// TEST SUITE: getEffectiveDimensions
// ============================================================
console.log('\n📐 Test Suite: getEffectiveDimensions');

{
  const r = getEffectiveDimensions(1920, 1080, 0);
  assert(r.w === 1920 && r.h === 1080, 'No rotation: 1920x1080 stays 1920x1080');
}
{
  const r = getEffectiveDimensions(1920, 1080, 90);
  assert(r.w === 1080 && r.h === 1920, '90° rotation: 1920x1080 becomes 1080x1920');
}
{
  const r = getEffectiveDimensions(1920, 1080, 270);
  assert(r.w === 1080 && r.h === 1920, '270° rotation: 1920x1080 becomes 1080x1920');
}
{
  const r = getEffectiveDimensions(1920, 1080, 180);
  assert(r.w === 1920 && r.h === 1080, '180° rotation: 1920x1080 stays 1920x1080');
}

// ============================================================
// TEST SUITE: simplifyRatio
// ============================================================
console.log('\n📐 Test Suite: simplifyRatio');

assert(simplifyRatio(1920, 1080) === '16:9', '1920:1080 simplifies to 16:9');
assert(simplifyRatio(1080, 1920) === '9:16', '1080:1920 simplifies to 9:16');
assert(simplifyRatio(1080, 1080) === '1:1', '1080:1080 simplifies to 1:1');
assert(simplifyRatio(1080, 1350) === '4:5', '1080:1350 simplifies to 4:5');
assert(simplifyRatio(1440, 1920) === '3:4', '1440:1920 simplifies to 3:4');
assert(simplifyRatio(1440, 1080) === '4:3', '1440:1080 simplifies to 4:3');

// ============================================================
// TEST SUITE: ensureEven
// ============================================================
console.log('\n📐 Test Suite: ensureEven');

assertEven(ensureEven(1920), '1920 stays even');
assertEven(ensureEven(1081), '1081 becomes 1082');
assertEven(ensureEven(1079), '1079 becomes 1080');

// ============================================================
// TEST SUITE: 9:16 → Original
// ============================================================
console.log('\n📐 Test Suite: 9:16 → Original');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, 'Width preserved: 1080');
  assert(result.height === 1920, 'Height preserved: 1920');
  assert(result.filterChain === '', 'No filter chain needed for original');
  assert(result.aspectRatioDecimal === 1080 / 1920, 'Aspect ratio decimal correct');
}

// ============================================================
// TEST SUITE: 16:9 → Original
// ============================================================
console.log('\n📐 Test Suite: 16:9 → Original');

{
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1920, 'Width preserved: 1920');
  assert(result.height === 1080, 'Height preserved: 1080');
  assert(result.filterChain === '', 'No filter chain needed for original');
}

// ============================================================
// TEST SUITE: 1:1 → Original
// ============================================================
console.log('\n📐 Test Suite: 1:1 → Original');

{
  const videoInfo = createMockVideoInfo(1080, 1080);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, 'Width preserved: 1080');
  assert(result.height === 1080, 'Height preserved: 1080');
  assert(result.filterChain === '', 'No filter chain needed for original');
}

// ============================================================
// TEST SUITE: 4:5 → Original
// ============================================================
console.log('\n📐 Test Suite: 4:5 → Original');

{
  const videoInfo = createMockVideoInfo(1080, 1350);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1080, 'Width preserved: 1080');
  assert(result.height === 1350, 'Height preserved: 1350');
  assert(result.filterChain === '', 'No filter chain needed for original');
  assertClose(result.aspectRatioDecimal, 4 / 5, 0.01, 'Aspect ratio is 4:5');
}

// ============================================================
// TEST SUITE: 9:16 → 16:9 Crop
// ============================================================
console.log('\n📐 Test Suite: 9:16 → 16:9 Crop');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: 'original',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // Source is 1080x1920 (9:16), target is 16:9
  // baseSize = min(1080, 1920) = 1080
  // For 16:9 (landscape): targetH = 1080, targetW = 1080 * 16/9 = 1920
  assert(result.width === 1920, `Width should be 1920 (got ${result.width})`);
  assert(result.height === 1080, `Height should be 1080 (got ${result.height})`);
  assertEven(result.width, 'Output width is even');
  assertEven(result.height, 'Output height is even');
  assert(result.filterChain.includes('crop'), 'Filter chain includes crop');
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Output aspect ratio is 16:9');
}

// ============================================================
// TEST SUITE: 16:9 → 9:16 Crop
// ============================================================
console.log('\n📐 Test Suite: 16:9 → 9:16 Crop');

{
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: '9:16',
    outputResolution: 'original',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // Source is 1920x1080 (16:9), target is 9:16
  // baseSize = min(1920, 1080) = 1080
  // For 9:16 (portrait): targetW = 1080, targetH = 1080 / (9/16) = 1920
  assert(result.width === 1080, `Width should be 1080 (got ${result.width})`);
  assert(result.height === 1920, `Height should be 1920 (got ${result.height})`);
  assertEven(result.width, 'Output width is even');
  assertEven(result.height, 'Output height is even');
  assert(result.filterChain.includes('crop'), 'Filter chain includes crop');
  assertClose(result.aspectRatioDecimal, 9 / 16, 0.01, 'Output aspect ratio is 9:16');
}

// ============================================================
// TEST SUITE: 9:16 → 16:9 Fit
// ============================================================
console.log('\n📐 Test Suite: 9:16 → 16:9 Fit');

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
  assert(result.filterChain.includes('pad'), 'Filter chain includes pad for fit mode');
  assert(result.filterChain.includes('force_original_aspect_ratio=decrease'), 'Uses force_original_aspect_ratio=decrease');
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Output aspect ratio is 16:9');
}

// ============================================================
// TEST SUITE: 1:1 → 16:9 Fit
// ============================================================
console.log('\n📐 Test Suite: 1:1 → 16:9 Fit');

{
  const videoInfo = createMockVideoInfo(1080, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: 'original',
    conversionMode: 'fit',
    fitBackground: 'black',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // baseSize = min(1080, 1080) = 1080
  // For 16:9: targetH = 1080, targetW = 1920
  assert(result.width === 1920, `Width should be 1920 (got ${result.width})`);
  assert(result.height === 1080, `Height should be 1080 (got ${result.height})`);
  assert(result.filterChain.includes('pad'), 'Filter chain includes pad for fit mode');
  assertClose(result.aspectRatioDecimal, 16 / 9, 0.01, 'Output aspect ratio is 16:9');
}

// ============================================================
// TEST SUITE: Non-standard aspect ratios → Original
// ============================================================
console.log('\n📐 Test Suite: Non-standard aspect ratios → Original');

{
  // 5:4 (1440x1152 → simplified)
  const videoInfo = createMockVideoInfo(1440, 1152);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1440, '5:4 width preserved: 1440');
  assert(result.height === 1152, '5:4 height preserved: 1152');
  assert(result.filterChain === '', 'No filter for original');
}

{
  // 2:3 (800x1200)
  const videoInfo = createMockVideoInfo(800, 1200);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 800, '2:3 width preserved: 800');
  assert(result.height === 1200, '2:3 height preserved: 1200');
}

{
  // 7:5 (1400x1000)
  const videoInfo = createMockVideoInfo(1400, 1000);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1400, '7:5 width preserved: 1400');
  assert(result.height === 1000, '7:5 height preserved: 1000');
}

{
  // 1.85:1 (1920x1038 approximately)
  const videoInfo = createMockVideoInfo(1920, 1038);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1920, '1.85:1 width preserved: 1920');
  assert(result.height === 1038, '1.85:1 height preserved: 1038');
}

{
  // 2.39:1 (1920x804 approximately)
  const videoInfo = createMockVideoInfo(1920, 804);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1920, '2.39:1 width preserved: 1920');
  assert(result.height === 804, '2.39:1 height preserved: 804');
}

{
  // 1080x1350 (4:5)
  const videoInfo = createMockVideoInfo(1080, 1350);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1080, '1080x1350 width preserved');
  assert(result.height === 1350, '1080x1350 height preserved');
}

{
  // 1440x1920 (3:4)
  const videoInfo = createMockVideoInfo(1440, 1920);
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1440, '1440x1920 width preserved');
  assert(result.height === 1920, '1440x1920 height preserved');
}

// ============================================================
// TEST SUITE: Rotation handling
// ============================================================
console.log('\n📐 Test Suite: Rotation handling');

{
  // Phone video: stream is 1920x1080 with 90° rotation → effective 1080x1920
  const videoInfo = createMockVideoInfo(1920, 1080, 90);
  assert(videoInfo.effectiveWidth === 1080, 'Rotated phone video effective width: 1080');
  assert(videoInfo.effectiveHeight === 1920, 'Rotated phone video effective height: 1920');
  assert(videoInfo.effectiveAspectRatioDecimal === 1080 / 1920, 'Rotated phone video effective ratio: 9:16');

  // With Original setting, should preserve effective dimensions
  const settings = createDefaultSettings({ outputAspectRatio: 'original', outputResolution: 'original' });
  const result = calculateOutputDimensions(videoInfo, settings);
  assert(result.width === 1080, 'Rotated original output width: 1080');
  assert(result.height === 1920, 'Rotated original output height: 1920');
}

// ============================================================
// TEST SUITE: Resolution scaling with aspect ratio
// ============================================================
console.log('\n📐 Test Suite: Resolution scaling with aspect ratio');

{
  // 9:16 source, output 16:9 at 720p
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: '720p',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);
  // 720p reference: baseSize = 720
  // 16:9 landscape: targetH = 720, targetW = 720 * 16/9 = 1280
  assert(result.width === 1280, `720p 16:9 width: 1280 (got ${result.width})`);
  assert(result.height === 720, `720p 16:9 height: 720 (got ${result.height})`);
}

{
  // 16:9 source, output 9:16 at 1080p
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: '9:16',
    outputResolution: '1080p',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);
  // 1080p reference: baseSize = 1080
  // 9:16 portrait: targetW = 1080, targetH = 1080 / (9/16) = 1920
  assert(result.width === 1080, `1080p 9:16 width: 1080 (got ${result.width})`);
  assert(result.height === 1920, `1080p 9:16 height: 1920 (got ${result.height})`);
}

{
  // 1:1 source, output 4:5 at 1080p
  const videoInfo = createMockVideoInfo(1080, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: '4:5',
    outputResolution: '1080p',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);
  // 1080p reference: baseSize = 1080
  // 4:5 portrait: targetW = 1080, targetH = 1080 / (4/5) = 1350
  assert(result.width === 1080, `1080p 4:5 width: 1080 (got ${result.width})`);
  assert(result.height === 1350, `1080p 4:5 height: 1350 (got ${result.height})`);
}

{
  // 9:16 source, output 1:1 at 720p
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '1:1',
    outputResolution: '720p',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);
  // 720p reference: baseSize = 720
  // 1:1 square: targetW = 720, targetH = 720
  assert(result.width === 720, `720p 1:1 width: 720 (got ${result.width})`);
  assert(result.height === 720, `720p 1:1 height: 720 (got ${result.height})`);
}

// ============================================================
// TEST SUITE: Stretch mode
// ============================================================
console.log('\n📐 Test Suite: Stretch mode');

{
  const videoInfo = createMockVideoInfo(1080, 1920);
  const settings = createDefaultSettings({
    outputAspectRatio: '16:9',
    outputResolution: 'original',
    conversionMode: 'stretch',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  assert(result.width === 1920, `Stretch width: 1920 (got ${result.width})`);
  assert(result.height === 1080, `Stretch height: 1080 (got ${result.height})`);
  assert(result.filterChain === `scale=${result.width}:${result.height}`, 'Stretch uses simple scale filter');
}

// ============================================================
// TEST SUITE: Custom aspect ratio
// ============================================================
console.log('\n📐 Test Suite: Custom aspect ratio');

{
  const videoInfo = createMockVideoInfo(1920, 1080);
  const settings = createDefaultSettings({
    outputAspectRatio: 'custom',
    customAspectRatio: { width: 5, height: 4 },
    outputResolution: 'original',
    conversionMode: 'crop',
  });
  const result = calculateOutputDimensions(videoInfo, settings);

  // baseSize = min(1920, 1080) = 1080
  // 5:4 landscape: targetH = 1080, targetW = 1080 * 5/4 = 1350
  assert(result.width === 1350, `Custom 5:4 width: 1350 (got ${result.width})`);
  assert(result.height === 1080, `Custom 5:4 height: 1080 (got ${result.height})`);
  assertClose(result.aspectRatioDecimal, 5 / 4, 0.01, 'Custom aspect ratio is 5:4');
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
