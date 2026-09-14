import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { VideoInfo, ProcessingSettings, CleanupRegion, OutputInfo, MetadataSettings } from '../types';
import {
  calculateOutputDimensions,
  getEffectiveDimensions,
  simplifyRatio,
  needsRotation,
} from './aspectRatio';
import { buildMetadataArgs } from './metadata';

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
    } catch {
      throw new Error(
        `Failed to load FFmpeg WASM engine. Error: ${err instanceof Error ? err.message : 'Unknown'}. ` +
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

/**
 * Probe a video file and extract technical information.
 */
export async function probeVideo(
  file: File,
  onLog?: (msg: string) => void
): Promise<VideoInfo> {
  const ff = await loadFFmpeg(onLog);

  const inputName = 'input_probe_' + Date.now() + '_' + Math.random().toString(36).slice(2);
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

/**
 * Parse FFmpeg -i output to extract video information.
 */
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
): Promise<{ width: number; height: number; hasVideo: boolean; duration: number }> {
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

  const hasVideo = /Stream #\d+[:.]\d+.*?: Video:/.test(probeOutput);
  const videoMatch = probeOutput.match(/Stream #\d+[:.]\d+.*?: Video: (\w+).*?(\d+)x(\d+)/);
  
  const durationMatch = probeOutput.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
  let duration = 0;
  if (durationMatch) {
    const h = parseInt(durationMatch[1]);
    const m = parseInt(durationMatch[2]);
    const s = parseInt(durationMatch[3]);
    const ms = parseInt(durationMatch[4]);
    duration = h * 3600 + m * 60 + s + ms / 100;
  }

  if (videoMatch) {
    return {
      width: parseInt(videoMatch[2]),
      height: parseInt(videoMatch[3]),
      hasVideo,
      duration,
    };
  }

  return { width: 0, height: 0, hasVideo, duration };
}

/**
 * Build the FFmpeg video filter chain.
 * 
 * IMPORTANT: This function uses EFFECTIVE dimensions (post-rotation) for all calculations.
 * FFmpeg's autorotate will handle rotation metadata automatically when -vf is used.
 * When -vf is NOT used, we need to handle rotation manually.
 */
function buildVideoFilter(
  videoInfo: VideoInfo,
  settings: ProcessingSettings,
  targetW: number,
  targetH: number,
  onLog: (msg: string) => void
): string {
  // Use effective dimensions (after rotation) as the "source" for filter calculations
  const srcW = videoInfo.effectiveWidth;
  const srcH = videoInfo.effectiveHeight;

  onLog(`[filter] Source (effective): ${srcW}x${srcH}`);
  onLog(`[filter] Target: ${targetW}x${targetH}`);
  onLog(`[filter] Mode: ${settings.outputAspectRatio}`);

  // If Original mode with Original resolution, no filter needed
  if (settings.outputAspectRatio === 'original' && settings.outputResolution === 'original') {
    onLog(`[filter] → No filter needed (Original mode, Original resolution)`);
    return '';
  }

  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  const ratioDiff = Math.abs(srcRatio - targetRatio) / Math.max(targetRatio, 0.001);

  // If same size and same ratio, no filter needed
  if (srcW === targetW && srcH === targetH) {
    onLog(`[filter] → No filter needed (same dimensions)`);
    return '';
  }

  // If same aspect ratio (within 1%), just scale
  if (ratioDiff < 0.01 || settings.outputAspectRatio === 'original') {
    const filter = `scale=${targetW}:${targetH}`;
    onLog(`[filter] → Scale: ${filter}`);
    return filter;
  }

  // Different aspect ratio - apply conversion mode
  switch (settings.conversionMode) {
    case 'crop': {
      const filters: string[] = [];
      if (srcRatio > targetRatio) {
        // Source wider: scale to target height, crop width
        filters.push(`scale=-2:${targetH}`);
        filters.push(`crop=${targetW}:${targetH}:(iw-${targetW})/2:(ih-${targetH})/2`);
      } else {
        // Source taller: scale to target width, crop height
        filters.push(`scale=${targetW}:-2`);
        filters.push(`crop=${targetW}:${targetH}:(iw-${targetW})/2:(ih-${targetH})/2`);
      }
      const filter = filters.join(',');
      onLog(`[filter] → Crop: ${filter}`);
      return filter;
    }
    case 'fit': {
      const bgColor = settings.fitBackground === 'white' ? 'white'
        : settings.fitBackground === 'custom' ? (settings.fitBackgroundColor || 'black')
        : 'black';
      const filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`;
      onLog(`[filter] → Fit: ${filter}`);
      return filter;
    }
    case 'stretch': {
      const filter = `scale=${targetW}:${targetH}`;
      onLog(`[filter] → Stretch: ${filter}`);
      return filter;
    }
    default:
      return '';
  }
}

/**
 * Main video processing function.
 * 
 * Pipeline:
 * 1. Write input file to FFmpeg virtual FS
 * 2. Calculate output dimensions
 * 3. Build FFmpeg command with explicit stream mapping
 * 4. Execute FFmpeg
 * 5. Validate output
 * 6. Read output and create Blob
 */
export async function processVideo(
  file: File,
  settings: ProcessingSettings,
  cleanupRegions: CleanupRegion[],
  videoInfo: VideoInfo,
  onLog: (msg: string) => void,
  onProgress: (progress: number) => void,
  onStepChange: (step: string) => void,
  metadataSettings?: MetadataSettings
): Promise<OutputInfo> {
  const ff = await loadFFmpeg(onLog, onProgress);

  const inputName = 'input_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const ext = file.name.split('.').pop() || 'mp4';
  const fullInputName = `${inputName}.${ext}`;
  const outputName = `output_${Date.now()}.mp4`;

  onStepChange('Uploading file to processing engine...');
  onLog(`[io] Writing input: ${fullInputName} (${file.size} bytes)`);
  await ff.writeFile(fullInputName, await fetchFile(file));

  // Calculate output dimensions
  const outputDims = calculateOutputDimensions(videoInfo, settings);

  onLog(`[calc] Source: ${videoInfo.effectiveWidth}x${videoInfo.effectiveHeight} (${videoInfo.effectiveAspectRatio})`);
  onLog(`[calc] Source rotation: ${videoInfo.rotation}°`);
  onLog(`[calc] Target: ${outputDims.width}x${outputDims.height} (${outputDims.aspectRatioLabel})`);
  onLog(`[calc] Aspect ratio mode: ${settings.outputAspectRatio}`);
  onLog(`[calc] Conversion mode: ${settings.conversionMode}`);

  // Build FFmpeg command
  const args: string[] = [];

  // Input
  args.push('-i', fullInputName);

  // CRITICAL: Explicit stream mapping
  // Map video stream and optionally audio stream
  args.push('-map', '0:v:0');
  if (videoInfo.audioChannels > 0) {
    args.push('-map', '0:a:0');
  }

  // Remove all metadata
  args.push('-map_metadata', '-1');
  args.push('-map_chapters', '-1');

  // Add custom metadata if provided
  if (metadataSettings && metadataSettings.preset !== 'keep-original') {
    const metadataArgs = buildMetadataArgs(metadataSettings);
    if (metadataArgs.length > 0) {
      args.push(...metadataArgs);
      onLog(`[metadata] Adding ${metadataArgs.length / 2} custom metadata fields`);
    }
  }

  // Video codec settings based on quality
  const crfMap = { high: '18', balanced: '20', smaller: '24' };
  const presetMap = { high: 'slow', balanced: 'medium', smaller: 'fast' };

  args.push('-c:v', 'libx264');
  args.push('-crf', crfMap[settings.quality]);
  args.push('-preset', presetMap[settings.quality]);
  args.push('-pix_fmt', 'yuv420p');

  // Build video filter
  const videoFilter = buildVideoFilter(videoInfo, settings, outputDims.width, outputDims.height, onLog);

  // Handle rotation when no filter is used
  // FFmpeg's autorotate is enabled by default when -vf is present
  // When -vf is NOT present, we need to handle rotation manually
  if (videoFilter) {
    // FFmpeg will auto-rotate when using -vf
    args.push('-vf', videoFilter);
    onLog(`[ffmpeg] Using -vf with autorotate`);
  } else if (needsRotation(videoInfo.rotation)) {
    // No filter but rotation needed - handle manually
    // Use -noautorotate to prevent double-rotation
    args.push('-noautorotate');
    const rot = ((videoInfo.rotation % 360) + 360) % 360;
    if (rot === 90) {
      args.push('-vf', 'transpose=1');
    } else if (rot === 270) {
      args.push('-vf', 'transpose=2');
    } else if (rot === 180) {
      args.push('-vf', 'hflip,vflip');
    }
    onLog(`[ffmpeg] Manual rotation: ${rot}°`);
  }

  // Frame rate
  if (settings.frameRate !== 'original') {
    args.push('-r', settings.frameRate);
  }

  // Audio settings
  if (videoInfo.audioChannels > 0) {
    const audioBitrateMap: Record<string, string> = {
      'original': '192k',
      'aac192': '192k',
      'aac256': '256k',
    };
    args.push('-c:a', 'aac');
    args.push('-b:a', audioBitrateMap[settings.audio]);
    args.push('-ac', '2');
  }

  // Fast start for streaming
  args.push('-movflags', '+faststart');

  // Cleanup regions as additional filters
  if (cleanupRegions.length > 0) {
    let cleanupFilter = '';
    for (const region of cleanupRegions) {
      const { x, y, width, height } = region.region;
      if (region.type === 'blur') {
        cleanupFilter += `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black@0.5:t=fill `;
      } else if (region.type === 'pixelate') {
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

  // Output file
  args.push(outputName);

  onStepChange('Processing video...');
  onLog(`[ffmpeg] Full command: ffmpeg ${args.join(' ')}`);

  try {
    await ff.exec(args);
  } catch (execErr) {
    onLog(`[error] FFmpeg execution failed: ${execErr instanceof Error ? execErr.message : 'Unknown error'}`);
    // Cleanup
    try { await ff.deleteFile(fullInputName); } catch {}
    throw new Error(`FFmpeg processing failed: ${execErr instanceof Error ? execErr.message : 'Unknown error'}`);
  }

  onStepChange('Validating output...');

  // Validate output file exists and has content
  let outputData: Uint8Array;
  try {
    outputData = await ff.readFile(outputName) as Uint8Array;
  } catch (readErr) {
    onLog(`[error] Could not read output file: ${readErr instanceof Error ? readErr.message : 'Unknown'}`);
    try { await ff.deleteFile(fullInputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}
    throw new Error('Output file could not be read. The encoding may have failed.');
  }

  if (!outputData || outputData.length === 0) {
    onLog(`[error] Output file is empty (0 bytes)`);
    try { await ff.deleteFile(fullInputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}
    throw new Error('Output file is empty. The encoding produced no data.');
  }

  onLog(`[validate] Output file size: ${outputData.length} bytes`);

  // Probe output to verify dimensions and content
  let actualW = outputDims.width;
  let actualH = outputDims.height;
  let outputDuration = 0;
  let hasVideoStream = false;

  try {
    const probed = await probeOutputFile(outputName, onLog);
    actualW = probed.width;
    actualH = probed.height;
    outputDuration = probed.duration;
    hasVideoStream = probed.hasVideo;

    onLog(`[validate] Output dimensions: ${actualW}x${actualH}`);
    onLog(`[validate] Has video stream: ${hasVideoStream}`);
    onLog(`[validate] Output duration: ${outputDuration.toFixed(2)}s`);

    if (!hasVideoStream) {
      onLog(`[error] Output has no video stream!`);
      try { await ff.deleteFile(fullInputName); } catch {}
      try { await ff.deleteFile(outputName); } catch {}
      throw new Error('The generated output file has no video stream. This indicates an encoding failure.');
    }

    if (actualW === 0 || actualH === 0) {
      onLog(`[error] Output dimensions are zero!`);
      try { await ff.deleteFile(fullInputName); } catch {}
      try { await ff.deleteFile(outputName); } catch {}
      throw new Error('The generated output has invalid dimensions (0x0).');
    }

    // Verify dimensions match expected (with tolerance)
    const wDiff = Math.abs(actualW - outputDims.width);
    const hDiff = Math.abs(actualH - outputDims.height);
    if (wDiff > 2 || hDiff > 2) {
      onLog(`[warn] Dimension mismatch! Expected ${outputDims.width}x${outputDims.height}, got ${actualW}x${actualH}`);
    } else {
      onLog(`[validate] ✓ Dimensions verified: ${actualW}x${actualH}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('no video stream')) {
      throw e;
    }
    onLog(`[warn] Could not fully verify output: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Create Blob from output data
  const blob = new Blob([new Uint8Array(outputData)], { type: 'video/mp4' });

  onLog(`[output] Blob created: ${blob.size} bytes, type: ${blob.type}`);

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
    duration: outputDuration > 0 ? formatDuration(outputDuration) : 'Same as source',
    metadataCount: 0,
    checksum,
    blob,
  };

  return outputInfo;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
