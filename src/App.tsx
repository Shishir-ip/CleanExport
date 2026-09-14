import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { VideoInfo, ProcessingSettings, CleanupRegion, ProcessingState, OutputInfo, AppStep } from './types';
import { probeVideo, processVideo } from './utils/ffmpeg';
import { calculateOutputDimensions, getSourceDescription, getOutputDescription } from './utils/aspectRatio';
import UploadArea from './components/UploadArea';
import VideoAnalysis from './components/VideoAnalysis';
import ProcessingSettingsPanel from './components/ProcessingSettings';
import VisualCleanup from './components/VisualCleanup';
import ProgressPanel from './components/ProgressPanel';
import Comparison from './components/Comparison';
import DownloadPanel from './components/DownloadPanel';
import Disclaimer from './components/Disclaimer';
import Header from './components/Header';
import AspectPreview from './components/AspectPreview';

function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>({
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
  });
  const [cleanupRegions, setCleanupRegions] = useState<CleanupRegion[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    elapsed: 0,
    estimatedRemaining: 0,
    currentStep: '',
    technicalLog: [],
  });
  const [outputInfo, setOutputInfo] = useState<OutputInfo | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [outputPreviewUrl, setOutputPreviewUrl] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Calculate output dimensions for preview
  const outputDimensions = useMemo(() => {
    if (!videoInfo) return null;
    return calculateOutputDimensions(videoInfo, settings);
  }, [videoInfo, settings]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [videoPreviewUrl, outputPreviewUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi', 'video/x-msvideo'];
    const validExts = ['.mp4', '.mov', '.mkv', '.webm', '.avi'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setProcessingState(prev => ({
        ...prev,
        status: 'error',
        error: 'Unsupported file format. Please upload MP4, MOV, MKV, WEBM, or AVI files.',
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setProcessingState(prev => ({
        ...prev,
        status: 'error',
        error: 'File too large. Maximum size is 2 GB for browser-based processing.',
      }));
      return;
    }

    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewUrl);

    setProcessingState({
      status: 'analyzing',
      progress: 0,
      elapsed: 0,
      estimatedRemaining: 0,
      currentStep: 'Analyzing video...',
      technicalLog: [],
    });

    try {
      const info = await probeVideo(file, (msg: string) => {
        setProcessingState(prev => ({
          ...prev,
          technicalLog: [...prev.technicalLog, msg],
        }));
      });
      setVideoInfo(info);
      setStep('analyze');
      setProcessingState(prev => ({ ...prev, status: 'idle' }));
    } catch (err) {
      setProcessingState(prev => ({
        ...prev,
        status: 'error',
        error: `Failed to analyze video: ${err instanceof Error ? err.message : 'Unknown error'}. The file may be corrupted or in an unsupported format.`,
      }));
    }
  }, []);

  const handleStartProcessing = useCallback(async () => {
    if (!videoFile || !videoInfo) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setProcessingState(prev => {
        const progress = prev.progress;
        const estimatedRemaining = progress > 0 ? (elapsed / progress) * (100 - progress) : 0;
        return { ...prev, elapsed, estimatedRemaining };
      });
    }, 500);

    setProcessingState({
      status: 'processing',
      progress: 0,
      elapsed: 0,
      estimatedRemaining: 0,
      currentStep: 'Initializing FFmpeg...',
      technicalLog: [],
    });
    setStep('processing');

    try {
      const result = await processVideo(
        videoFile,
        settings,
        cleanupRegions,
        videoInfo,
        (msg: string) => {
          setProcessingState(prev => ({
            ...prev,
            technicalLog: [...prev.technicalLog, msg],
          }));
        },
        (progress: number) => {
          setProcessingState(prev => ({
            ...prev,
            progress: Math.round(progress),
          }));
        },
        (stepName: string) => {
          setProcessingState(prev => ({
            ...prev,
            currentStep: stepName,
          }));
        }
      );

      if (timerRef.current) clearInterval(timerRef.current);

      const outUrl = URL.createObjectURL(result.blob);
      setOutputPreviewUrl(outUrl);
      setOutputInfo(result);
      setStep('complete');
      setProcessingState(prev => ({ ...prev, status: 'complete', progress: 100 }));
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setProcessingState(prev => ({
        ...prev,
        status: 'error',
        error: `Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}. This may be due to insufficient memory or a corrupted input file.`,
      }));
    }
  }, [videoFile, videoInfo, settings, cleanupRegions]);

  const handleReset = useCallback(() => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);
    setVideoFile(null);
    setVideoInfo(null);
    setOutputInfo(null);
    setVideoPreviewUrl('');
    setOutputPreviewUrl('');
    setCleanupRegions([]);
    setProcessingState({
      status: 'idle',
      progress: 0,
      elapsed: 0,
      estimatedRemaining: 0,
      currentStep: '',
      technicalLog: [],
    });
    setStep('upload');
  }, [videoPreviewUrl, outputPreviewUrl]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-8">
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Clean, standardize, and re-export your own video files.
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Remove metadata, re-encode to a clean format, and download a fresh copy — all processed locally in your browser.
              </p>
            </div>

            {processingState.status === 'analyzing' ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 animate-pulse">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-200">Analyzing Video...</h3>
                <p className="text-gray-400 text-sm">
                  {processingState.currentStep || 'Loading video processing engine...'}
                </p>
                <p className="text-xs text-gray-600">
                  First run may take a moment to download the processing engine (~30MB)
                </p>
              </div>
            ) : (
              <UploadArea onFileSelect={handleFileSelect} />
            )}

            {processingState.status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-center space-y-3">
                <p>{processingState.error}</p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            <Disclaimer />
          </div>
        )}

        {/* Analysis Step */}
        {step === 'analyze' && videoInfo && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Video Analysis</h2>
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
              >
                ← Start Over
              </button>
            </div>

            {videoPreviewUrl && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-80 rounded-lg object-contain bg-black"
                />
              </div>
            )}

            <VideoAnalysis info={videoInfo} />

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => setStep('settings')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                Continue to Settings →
              </button>
            </div>
          </div>
        )}

        {/* Settings Step */}
        {step === 'settings' && videoInfo && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Processing Settings</h2>
              <button
                onClick={() => setStep('analyze')}
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
              >
                ← Back to Analysis
              </button>
            </div>

            {/* Source info banner */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-blue-300">
                <span className="text-blue-400 font-semibold">Detected source:</span>{' '}
                {getSourceDescription(videoInfo)}
              </p>
            </div>

            <ProcessingSettingsPanel
              settings={settings}
              onChange={setSettings}
              videoInfo={videoInfo}
            />

            {/* Aspect Ratio Preview */}
            {outputDimensions && videoPreviewUrl && (
              <AspectPreview
                videoPreviewUrl={videoPreviewUrl}
                videoInfo={videoInfo}
                outputDimensions={outputDimensions}
                settings={settings}
                onSettingsChange={setSettings}
              />
            )}

            <VisualCleanup
              videoPreviewUrl={videoPreviewUrl}
              videoInfo={videoInfo}
              regions={cleanupRegions}
              onRegionsChange={setCleanupRegions}
            />

            {/* Output Summary */}
            {outputDimensions && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3">Output Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Quality:</span>
                    <span className="ml-2 capitalize">{settings.quality}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Aspect Ratio:</span>
                    <span className="ml-2">{outputDimensions.aspectRatioLabel}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Resolution:</span>
                    <span className="ml-2">{outputDimensions.width}×{outputDimensions.height}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Frame Rate:</span>
                    <span className="ml-2 capitalize">{settings.frameRate === 'original' ? 'Original' : settings.frameRate + ' FPS'}</span>
                  </div>
                </div>
                {settings.outputAspectRatio !== 'original' && (
                  <div className="mt-3 text-sm">
                    <span className="text-gray-400">Conversion:</span>
                    <span className="ml-2 capitalize">
                      {settings.conversionMode === 'crop' ? 'Crop to Fill' : settings.conversionMode === 'fit' ? 'Fit with Background' : 'Stretch'}
                    </span>
                    {settings.conversionMode === 'crop' && (
                      <span className="ml-2 text-gray-500">({settings.cropPosition})</span>
                    )}
                  </div>
                )}
                {cleanupRegions.length > 0 && (
                  <p className="text-sm text-yellow-400 mt-2">
                    ⚠️ {cleanupRegions.length} visual cleanup region{cleanupRegions.length > 1 ? 's' : ''} applied
                  </p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500">
                    Output: <span className="text-gray-300 font-mono">{getOutputDescription(outputDimensions)}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => setStep('analyze')}
                className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStartProcessing}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20"
              >
                🚀 Start Processing
              </button>
            </div>

            <Disclaimer />
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <ProgressPanel state={processingState} onReset={handleReset} />
        )}

        {/* Complete Step */}
        {step === 'complete' && outputInfo && videoInfo && (
          <div className="space-y-6">
            <DownloadPanel output={outputInfo} onReset={handleReset} />
            <Comparison original={videoInfo} output={outputInfo} outputPreviewUrl={outputPreviewUrl} />
            <Disclaimer />
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-sm">
        <p>CleanExport — All processing happens locally in your browser. Your videos are never uploaded to any server.</p>
        <p className="mt-2 text-xs text-gray-600">
          This tool re-encodes video files and removes ordinary metadata. It cannot guarantee bypassing platform content detection systems.
        </p>
      </footer>
    </div>
  );
}

export default App;
