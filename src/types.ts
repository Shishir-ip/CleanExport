export interface VideoInfo {
  filename: string;
  fileSize: number;
  containerFormat: string;
  videoCodec: string;
  audioCodec: string;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate: string;
  bitrate: string;
  duration: string;
  durationSeconds: number;
  rotation: string;
  colorSpace: string;
  hdrInfo: string;
  audioSampleRate: string;
  audioChannels: number;
  metadata: Record<string, string>;
  metadataCount: number;
}

export interface ProcessingSettings {
  quality: 'high' | 'balanced' | 'smaller';
  outputResolution: 'original' | '1080p' | '720p' | '480p';
  frameRate: 'original' | '60' | '30' | '24';
  audio: 'original' | 'aac192' | 'aac256';
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CleanupRegion {
  type: 'crop' | 'blur' | 'pixelate';
  region: CropRegion;
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'analyzing' | 'cleaning' | 'processing' | 'encoding' | 'building' | 'validating' | 'complete' | 'error';
  progress: number;
  elapsed: number;
  estimatedRemaining: number;
  currentStep: string;
  error?: string;
  technicalLog: string[];
}

export interface OutputInfo {
  filename: string;
  fileSize: number;
  resolution: string;
  codec: string;
  duration: string;
  metadataCount: number;
  checksum: string;
  blob: Blob;
}

export type AppStep = 'upload' | 'analyze' | 'settings' | 'processing' | 'complete';
