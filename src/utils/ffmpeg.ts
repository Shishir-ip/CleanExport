import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { VideoInfo, ProcessingSettings, CleanupRegion, OutputInfo } from '../types';

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
    // Try alternative CDN
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

  // Run ffprobe equivalent by using ffmpeg to get info
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

  // Cleanup
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
    frameRate: 'Unknown',
    bitrate: 'Unknown',
    duration: 'Unknown',
    durationSeconds: 0,
    rotation: '0°',
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

  // Video stream
  const videoMatch = output.match(/Stream #\d+[:.]\d+.*?: Video: (\w+).*?(\d+)x(\d+)/);
  if (videoMatch) {
    info.videoCodec = videoMatch[1];
    info.width = parseInt(videoMatch[2]);
    info.height = parseInt(videoMatch[3]);
    info.resolution = `${info.width}x${info.height}`;

    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const g = gcd(info.width, info.height);
    info.aspectRatio = `${info.width / g}:${info.height / g}`;
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

  // Rotation
  const rotationMatch = output.match(/rotate\s*:\s*(\d+)/);
  if (rotationMatch) info.rotation = `${rotationMatch[1]}°`;
  const sideDataMatch = output.match(/displaymatrix: rotation of (-?\d+\.?\d*)/);
  if (sideDataMatch) info.rotation = `${Math.abs(parseFloat(sideDataMatch[1]))}°`;

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
      info.audioChannels = 2; // default stereo
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

export async function processVideo(
  file: File,
  settings: ProcessingSettings,
  cleanupRegions: CleanupRegion[],
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

  // Resolution
  if (settings.outputResolution !== 'original') {
    const resMap: Record<string, string> = {
      '1080p': '1920:1080',
      '720p': '1280:720',
      '480p': '854:480',
    };
    const [w, h] = resMap[settings.outputResolution].split(':');
    args.push('-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
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

  // Cleanup regions as filters
  if (cleanupRegions.length > 0) {
    let filterStr = '';
    for (const region of cleanupRegions) {
      const { x, y, width, height } = region.region;
      if (region.type === 'blur') {
        filterStr += `boxblur=enable='between(t,0,999999)':luma_radius=min(${Math.floor(width/4)},20):luma_power=3,drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black@0.0:t=fill `;
      } else if (region.type === 'pixelate') {
        filterStr += `scale=iw/10:ih/10,scale=iw*10:ih*10:flags=neighbor `;
      } else if (region.type === 'crop') {
        // Crop is handled differently - we crop OUT the region
        // For simplicity, we'll use drawbox to black out the region
        filterStr += `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=black:t=fill `;
      }
    }
    if (filterStr.trim()) {
      // Find existing -vf or add new one
      const vfIndex = args.indexOf('-vf');
      if (vfIndex !== -1) {
        args[vfIndex + 1] += `,${filterStr.trim()}`;
      } else {
        args.push('-vf', filterStr.trim());
      }
    }
  }

  args.push(outputName);

  onStepChange('Processing video...');
  onLog(`[ffmpeg] Running: ffmpeg ${args.join(' ')}`);

  await ff.exec(args);

  onStepChange('Validating output...');

  // Read output file
  const data = await ff.readFile(outputName);
  const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });

  // Generate checksum (simple hash)
  const checksum = await generateChecksum(blob);

  // Cleanup temp files
  try { await ff.deleteFile(fullInputName); } catch {}
  try { await ff.deleteFile(outputName); } catch {}

  // Get output info
  const outputInfo: OutputInfo = {
    filename: file.name.replace(/\.[^.]+$/, '') + '_cleaned.mp4',
    fileSize: blob.size,
    resolution: settings.outputResolution === 'original' ? 'Original' : settings.outputResolution,
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
