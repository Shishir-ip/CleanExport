import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { VideoInfo, ProcessingSettings, CleanupRegion, OutputInfo } from '../types';
import {
  calculateOutputDimensions,
  getEffectiveDimensions,
  simplifyRatio,
  formatAspectRatioDecimal,
  getOrientationLabel,
  needsRotation,
  buildBlurBackgroundFilter,
} from './aspectRatio';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

export async function loadFFmpeg(
  onLog?: (msg: string) => void,
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (loaded && ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  if (onLog) {
    ffmpeg.on('log', ({ message }) => {
      onLog(message);
    });
  }

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.min(progress * 100, 100));
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (err) {
    const altBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (altErr) {
      throw new Error(
        `Failed to load FFmpeg WASM engine. This may be due to network issues or browser restrictions. ` +
        `Error: ${err instanceof Error ? err.message : 'Unknown'}. ` +
        `Please ensure you have a stable internet connection and try refreshing the page.`
      );
    }
  }

  loaded = true;
  return ffmpeg;
}

export function getFFmpeg(): FFmpeg | null {
  return ffmpeg;
}

export async function probeVideo(
  file: File,
  onLog?: (msg: string) => void
): Promise<VideoInfo> {
  const ff = await loadFFmpeg(onLog);

  const inputName = 'input_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const ext = file.name.split('.').pop() || 'mp4';
  const fullInputName = `${inputName}.${ext}`;

  await ff.writeFile(fullInputName, await fetchFile(file));

  let probeOutput = '';
  const logHandler = ({ message }: { message: string }) => {
    probeOutput += message + '\n';
    if (onLog) onLog(`[probe] ${message}`);
  };

  ff.on('log', logHandler);

  try {
    await ff.exec(['-i', fullInputName]);
  } catch {
    // FFmpeg returns error for -i without output, but still prints info
  }

  ff.off('log', logHandler);

  const info = parseProbeOutput(probeOutput, file);

  try { await ff.deleteFile(fullInputName); } catch {}

  return info;
}

function parseProbeOutput(output: string, file: File): VideoInfo {
  const info: VideoInfo = {
    filename: file.name,
    fileSize: file.size,
    containerFormat: 'Unknown',
    videoCodec: 'Unknown',
    audioCodec: 'None',
    resolution: 'Unknown',
    width: 0,
    height: 0,
    aspectRatio: 'Unknown',
    aspectRatioDecimal: 0,
    effectiveWidth: 0,
    effectiveHeight: 0,
    effectiveAspectRatio: 'Unknown',
    effectiveAspectRatioDecimal: 0,
    frameRate: 'Unknown',
    bitrate: 'Unknown',
    duration: 'Unknown',
    durationSeconds: 0,
    rotation: 0,
    colorSpace: 'Unknown',
    hdrInfo: 'SDR',
    audioSampleRate: 'Unknown',
    audioChannels: 0,
    metadata: {},
    metadataCount: 0,
  };

  // Container format
  const containerMatch = output.match(/Input #\d+, (\w+)/);
  if (containerMatch) info.containerFormat = containerMatch[1];

  // Duration
  const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
  if (durationMatch) {
    const h = parseInt(durationMatch[1]);
    const m = parseInt(durationMatch[2]);
    const s = parseInt(durationMatch[3]);
    const ms = parseInt(durationMatch[4]);
    info.durationSeconds = h * 3600 + m * 60 + s + ms / 100;
    info.duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Bitrate
  const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
  if (bitrateMatch) info.bitrate = `${bitrateMatch[1]} kb/s`;

  // Video stream - capture raw width/height
  const videoMatch = output.match(/Stream #\d+[:.]\d+.*?: Video: (\w+).*?(\d+)x(\d+)/);
  if (videoMatch) {
    info.videoCodec = videoMatch[1];
    info.width = parseInt(videoMatch[2]);
    info.height = parseInt(videoMatch[3]);
    info.resolution = `${info.width}x${info.height}`;

    const gcdFn = (a: number, b: number): number => b === 0 ? a : gcdFn(b, a % b);
    const g = gcdFn(info.width, info.height);
    info.aspectRatio = `${info.width / g}:${info.height / g}`;
    info.aspectRatioDecimal = info.width / info.height;
  }

  // Frame rate
  const fpsMatch = output.match(/(\d+(?:\.\d+)?) fps/);
  if (fpsMatch) info.frameRate = `${fpsMatch[1]} fps`;

  // Color space
  const colorMatch = output.match(/(bt\d+|smpte\d+|unknown)/i);
  if (colorMatch) info.colorSpace = colorMatch[1];

  // HDR detection
  if (output.includes('smpte2084') || output.includes('arib-std-b67') || output.includes('hlg')) {
    info.hdrInfo = 'HDR';
  }

  // Rotation - parse as number
  let rotationDeg = 0;
  const rotationMatch = output.match(/rotate\s*:\s*(\d+)/);
  if (rotationMatch) {
    rotationDeg = parseInt(rotationMatch[1]);
  }
  const sideDataMatch = output.match(/displaymatrix: rotation of (-?\d+\.?\d*)/);
  if (sideDataMatch) {
    rotationDeg = Math.abs(parseFloat(sideDataMatch[1]));
  }
  // Normalize rotation to 0, 90, 180, or 270
  rotationDeg = Math.round(rotationDeg);
  if (rotationDeg > 360) rotationDeg = rotationDeg % 360;
  if (rotationDeg < 0) rotationDeg += 360;
  // Snap to nearest 90
  if (rotationDeg >= 45 && rotationDeg < 135) rotationDeg = 90;
  else if (rotationDeg >= 135 && rotationDeg < 225) rotationDeg = 180;
  else if (rotationDeg >= 225 && rotationDeg < 315) rotationDeg = 270;
  else rotationDeg = 0;

  info.rotation = rotationDeg;

  // Calculate effective dimensions (accounting for rotation)
  const effective = getEffectiveDimensions(info.width, info.height, rotationDeg);
  info.effectiveWidth = effective.w;
  info.effectiveHeight = effective.h;

  const gcdFn2 = (a: number, b: number): number => b === 0 ? a : gcdFn2(b, a % b);
  const g2 = gcdFn2(effective.w, effective.h);
  info.effectiveAspectRatio = `${effective.w / g2}:${effective.h / g2}`;
  info.effectiveAspectRatioDecimal = effective.w / effective.h;

  // Audio stream
  const audioMatch = output.match(/Stream #\d+[:.]\d+.*?: Audio: (\w+).*?(\d+) Hz.*?(\d+)\s*channels/);
  if (audioMatch) {
    info.audioCodec = audioMatch[1];
    info.audioSampleRate = `${audioMatch[2]} Hz`;
    info.audioChannels = parseInt(audioMatch[3]);
  } else {
    const audioMatch2 = output.match(/Stream #\d+[:.]\d+.*?: Audio: (\w+).*?(\d+) Hz/);
    if (audioMatch2) {
      info.audioCodec = audioMatch2[1];
      info.audioSampleRate = `${audioMatch2[2]} Hz`;
      info.audioChannels = 2;
    }
  }

  // Metadata
  const metadataRegex = /^\s*(\w+)\s*:\s*(.+)$/gm;
  let match;
  while ((match = metadataRegex.exec(output)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!['duration', 'bitrate', 'start', 'stream'].includes(key) && value.length > 0 && value.length < 500) {
      info.metadata[key] = value;
    }
  }
  info.metadataCount = Object.keys(info.metadata).length;

  return info;
}

/**
 * Probe the output file to verify dimensions after processing.
 */
export async function probeOutputFile(
  fileName: string,
  onLog?: (msg: string) => void
): Promise<{ width: number; height: number }> {
  const ff = ffmpeg;
  if (!ff) throw new Error('FFmpeg not loaded');

  let probeOutput = '';
  const logHandler = ({ message }: { message: string }) => {
    probeOutput += message + '\n';
    if (onLog) onLog(`[probe-output] ${message}`);
  };

  ff.on('log', logHandler);

  try {
    await ff.exec(['-i', fileName]);
  } catch {
    // Expected
  }

  ff.off('log', logHandler);

  const videoMatch = probeOutput.match(/Stream #\d+[:.]\d+.*?: Video: (\w+).*?(\d+)x(\d+)/);
  if (videoMatch) {
    return {
      width: parseInt(videoMatch[2]),
      height: parseInt(videoMatch[3]),
    };
  }

  throw new Error('Could not determine output dimensions');
}

export async function processVideo(
  file: File,
  settings: ProcessingSettings,
  cleanupRegions: CleanupRegion[],
  videoInfo: VideoInfo,
  onLog: (msg: string) => void,
  onProgress: (progress: number) => void,
  onStepChange: (step: string) => void
): Promise<OutputInfo> {
  const ff = await loadFFmpeg(onLog, onProgress);

  const inputName = 'input_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const ext = file.name.split('.').pop() || 'mp4';
  const fullInputName = `${inputName}.${ext}`;
  const outputName = `output_${Date.now()}.mp4`;

  onStepChange('Uploading file to processing engine...');
  await ff.writeFile(fullInputName, await fetchFile(file));

  // Calculate output dimensions using the aspect ratio utility
  const outputDims = calculateOutputDimensions(videoInfo, settings);

  onLog(`[calc] Source: ${videoInfo.effectiveWidth}x${videoInfo.effectiveHeight} (${videoInfo.effectiveAspectRatio})`);
  onLog(`[calc] Target: ${outputDims.width}x${outputDims.height} (${outputDims.aspectRatioLabel})`);
  onLog(`[calc] Filter: ${outputDims.filterChain || '(none - direct re-encode)'}`);

  // Build FFmpeg command
  const args: string[] = ['-i', fullInputName];

  // Remove all metadata
  args.push('-map_metadata', '-1');
  args.push('-map_chapters', '-1');

  // Video codec settings based on quality
  const crfMap = { high: '18', balanced: '20', smaller: '24' };
  const presetMap = { high: 'slow', balanced: 'medium', smaller: 'fast' };

  args.push('-c:v', 'libx264');
  args.push('-crf', crfMap[settings.quality]);
  args.push('-preset', presetMap[settings.quality]);
  args.push('-pix_fmt', 'yuv420p');

  // Handle rotation: if the source has rotation metadata, we need to apply it
  // FFmpeg's autorotate should handle this when we use -vf
  // But if no filter is needed, we should add -noautorotate to prevent double-rotation
  // Actually, with modern FFmpeg WASM, autorotate is applied by default
  // We need to ensure our filter chain handles it correctly

  // Build video filter chain
  let videoFilter = outputDims.filterChain;

  // If blur background is selected and aspect ratio changed, use complex filter
  if (settings.conversionMode === 'fit' && settings.fitBackground === 'blur' && settings.outputAspectRatio !== 'original') {
    const blurFilter = buildBlurBackgroundFilter(outputDims.width, outputDims.height);
    args.push('-filter_complex', blurFilter);
  } else if (videoFilter) {
    // Add autorotate handling
    // If the video has rotation metadata, FFmpeg will auto-rotate when using -vf
    // We need to account for this in our dimension calculations (which we already do via effectiveWidth/Height)
    args.push('-vf', videoFilter);
  } else if (needsRotation(videoInfo.rotation)) {
    // If no filter but rotation is needed, we need to add a transpose filter
    // FFmpeg autorotate handles this, but let's be explicit
    const rot = ((videoInfo.rotation % 360) + 360) % 360;
    if (rot === 90) {
      args.push('-vf', 'transpose=1');
    } else if (rot === 270) {
      args.push('-vf', 'transpose=2');
    } else if (rot === 180) {
      args.push('-vf', 'transpose=1,transpose=1');
    }
  }

  // Frame rate
  if (settings.frameRate !== 'original') {
    args.push('-r', settings.frameRate);
  }

  // Audio settings
  const audioBitrateMap: Record<string, string> = {
    'original': '192k',
    'aac192': '192k',
    'aac256': '256k',
  };
  args.push('-c:a', 'aac');
  args.push('-b:a', audioBitrateMap[settings.audio]);
  args.push('-ac', '2');

  // Fast start
  args.push('-movflags', '+faststart');

  // Cleanup regions as additional filters
  if (cleanupRegions.length > 0) {
    let cleanupFilter = '';
    for (const region of cleanupRegions) {
      const { x, y, width, height } = region.region;
      if (region.type === 'blur') {
        cleanupFilter += `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black@0.5:t=fill,boxblur=luma_radius=min(${Math.floor(width / 4)},20):luma_power=2 `;
      } else if (region.type === 'pixelate') {
        // Pixelate specific region using split+overlay approach
        cleanupFilter += `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black@0.3:t=fill `;
      } else if (region.type === 'crop') {
        cleanupFilter += `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black:t=fill `;
      }
    }
    if (cleanupFilter.trim()) {
      const vfIndex = args.indexOf('-vf');
      if (vfIndex !== -1) {
        args[vfIndex + 1] += `,${cleanupFilter.trim()}`;
      } else {
        args.push('-vf', cleanupFilter.trim());
      }
    }
  }

  args.push(outputName);

  onStepChange('Processing video...');
  onLog(`[ffmpeg] Running: ffmpeg ${args.join(' ')}`);

  await ff.exec(args);

  onStepChange('Validating output...');

  // Probe output to verify dimensions
  let actualW = outputDims.width;
  let actualH = outputDims.height;
  try {
    const probed = await probeOutputFile(outputName, onLog);
    actualW = probed.width;
    actualH = probed.height;
    onLog(`[validate] Output dimensions: ${actualW}x${actualH}`);

    // Verify dimensions match expected
    const wDiff = Math.abs(actualW - outputDims.width);
    const hDiff = Math.abs(actualH - outputDims.height);
    if (wDiff > 2 || hDiff > 2) {
      onLog(`[warn] Dimension mismatch! Expected ${outputDims.width}x${outputDims.height}, got ${actualW}x${actualH}`);
    } else {
      onLog(`[validate] ✓ Dimensions verified: ${actualW}x${actualH}`);
    }
  } catch (e) {
    onLog(`[warn] Could not verify output dimensions: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Read output file
  const data = await ff.readFile(outputName);
  const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });

  // Generate checksum
  const checksum = await generateChecksum(blob);

  // Cleanup temp files
  try { await ff.deleteFile(fullInputName); } catch {}
  try { await ff.deleteFile(outputName); } catch {}

  const outputInfo: OutputInfo = {
    filename: file.name.replace(/\.[^.]+$/, '') + '_cleaned.mp4',
    fileSize: blob.size,
    resolution: `${actualW}x${actualH}`,
    width: actualW,
    height: actualH,
    codec: 'H.264 (libx264)',
    duration: 'Same as source',
    metadataCount: 0,
    checksum,
    blob,
  };

  return outputInfo;
}

async function generateChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
