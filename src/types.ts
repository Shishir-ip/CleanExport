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
  aspectRatioDecimal: number;
  effectiveWidth: number;
  effectiveHeight: number;
  effectiveAspectRatio: string;
  effectiveAspectRatioDecimal: number;
  frameRate: string;
  bitrate: string;
  duration: string;
  durationSeconds: number;
  rotation: number;
  colorSpace: string;
  hdrInfo: string;
  audioSampleRate: string;
  audioChannels: number;
  metadata: Record<string, string>;
  metadataCount: number;
}

export type OutputAspectRatio =
  | 'original'
  | '9:16'
  | '16:9'
  | '1:1'
  | '4:5'
  | '3:4'
  | '4:3'
  | '3:2'
  | '21:9'
  | 'custom';

export type ConversionMode = 'crop' | 'fit' | 'stretch';

export type FitBackground = 'black' | 'white' | 'blur' | 'custom';

export type CropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface CustomAspectRatio {
  width: number;
  height: number;
}

export interface ProcessingSettings {
  quality: 'high' | 'balanced' | 'smaller';
  outputResolution: 'original' | '1080p' | '720p' | '480p';
  outputAspectRatio: OutputAspectRatio;
  customAspectRatio?: CustomAspectRatio;
  conversionMode: ConversionMode;
  fitBackground: FitBackground;
  fitBackgroundColor?: string;
  cropPosition: CropPosition;
  cropOffsetX: number; // -1 to 1, 0 = center
  cropOffsetY: number; // -1 to 1, 0 = center
  frameRate: 'original' | '60' | '30' | '24';
  audio: 'original' | 'aac192' | 'aac256';
  videoCrop: VideoCropSettings;
}

export type VideoCropFactor = 1 | 1.2 | 1.5 | 2;

export interface VideoCropSettings {
  factor: VideoCropFactor;
  positionX: number; // 0 to 1, 0.5 = center
  positionY: number; // 0 to 1, 0.5 = center
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
  width: number;
  height: number;
  codec: string;
  duration: string;
  metadataCount: number;
  checksum: string;
  blob: Blob;
}

export type AppStep = 'upload' | 'analyze' | 'settings' | 'processing' | 'complete';

export interface OutputDimensions {
  width: number;
  height: number;
  aspectRatioDecimal: number;
  aspectRatioLabel: string;
  filterChain: string;
}

export type MetadataPreset = 'keep-original' | 'privacy-clean' | 'remove-all' | 'custom';

export interface MetadataSettings {
  preset: MetadataPreset;
  title: string | null;
  description: string | null;
  comment: string | null;
  author: string | null;
  artist: string | null;
  copyright: string | null;
  keywords: string | null;
  genre: string | null;
  language: string | null;
  creationDate: 'keep' | 'clear' | string;
  recordingDate: 'keep' | 'clear' | string;
  country: string | null;
  city: string | null;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  clearLocation: boolean;
  software: 'keep' | 'clear';
  removeDeviceInfo: boolean;
}
