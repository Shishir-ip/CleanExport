import { useState } from 'react';
import type { ProcessingState } from '../types';

interface ProgressPanelProps {
  state: ProcessingState;
  onReset?: () => void;
}

const steps = [
  { key: 'uploading', label: 'Uploading', icon: '📤' },
  { key: 'analyzing', label: 'Analyzing', icon: '🔍' },
  { key: 'cleaning', label: 'Cleaning metadata', icon: '🧹' },
  { key: 'processing', label: 'Processing video', icon: '🎬' },
  { key: 'encoding', label: 'Encoding audio', icon: '🔊' },
  { key: 'building', label: 'Building output', icon: '📦' },
  { key: 'validating', label: 'Validating', icon: '✅' },
  { key: 'complete', label: 'Complete', icon: '🎉' },
];

export default function ProgressPanel({ state, onReset }: ProgressPanelProps) {
  const [showLog, setShowLog] = useState(false);

  const getCurrentStepIndex = () => {
    if (state.status === 'error') return -1;
    const statusMap: Record<string, number> = {
      idle: 0,
      uploading: 0,
      analyzing: 1,
      cleaning: 2,
      processing: 3,
      encoding: 4,
      building: 5,
      validating: 6,
      complete: 7,
      error: -1,
    };
    return statusMap[state.status] ?? 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Status Card */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        {state.status === 'error' ? (
          <div className="space-y-4">
            <div className="text-5xl">❌</div>
            <h2 className="text-2xl font-bold text-red-400">Processing Error</h2>
            <p className="text-gray-400">{state.error}</p>
            <p className="text-xs text-gray-600 mt-2">
              This may be due to insufficient browser memory, a corrupted input file, or an unsupported codec.
            </p>
            {onReset && (
              <button
                onClick={onReset}
                className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                ← Go Back
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-5xl animate-pulse">
              {steps[Math.max(0, currentStepIndex)]?.icon || '⏳'}
            </div>
            <h2 className="text-2xl font-bold">Processing Video</h2>
            <p className="text-gray-400">{state.currentStep || 'Initializing...'}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {state.status !== 'error' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-gray-200 font-mono">{state.progress}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            {steps.map((step, idx) => (
              <div
                key={step.key}
                className={`text-center p-2 rounded-lg text-xs transition-all ${
                  idx < currentStepIndex
                    ? 'bg-green-500/10 text-green-400'
                    : idx === currentStepIndex
                    ? 'bg-blue-500/10 text-blue-400 animate-pulse'
                    : 'text-gray-600'
                }`}
              >
                <div className="text-lg mb-1">{step.icon}</div>
                <div className="truncate">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Info */}
      {state.status !== 'error' && state.status !== 'idle' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Elapsed</p>
              <p className="text-lg font-mono text-gray-200">{formatTime(state.elapsed)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. Remaining</p>
              <p className="text-lg font-mono text-gray-200">
                {state.progress > 0 ? formatTime(state.estimatedRemaining) : 'Calculating...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Log */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <span className="text-sm font-medium text-gray-400">📋 Technical Log</span>
          <span className={`text-gray-400 transition-transform ${showLog ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showLog && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-2">
            <div className="bg-black/50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs text-gray-400 space-y-0.5">
              {state.technicalLog.length === 0 ? (
                <p className="text-gray-600">No log entries yet...</p>
              ) : (
                state.technicalLog.map((log, idx) => (
                  <div key={idx} className="break-all">{log}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
