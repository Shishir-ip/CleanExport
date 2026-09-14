import { useState } from 'react';
import type { VideoInfo, MetadataSettings, MetadataPreset } from '../types';

interface MetadataEditorProps {
  videoInfo: VideoInfo;
  settings: MetadataSettings;
  onChange: (settings: MetadataSettings) => void;
}

export default function MetadataEditor({ videoInfo, settings, onChange }: MetadataEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const applyPreset = (preset: MetadataPreset) => {
    const baseSettings: MetadataSettings = {
      preset,
      title: null,
      description: null,
      comment: null,
      author: null,
      artist: null,
      copyright: null,
      keywords: null,
      genre: null,
      language: null,
      creationDate: 'keep',
      recordingDate: 'keep',
      country: null,
      city: null,
      gpsLatitude: null,
      gpsLongitude: null,
      clearLocation: false,
      software: 'keep',
      removeDeviceInfo: false,
    };

    switch (preset) {
      case 'keep-original':
        // Keep everything as-is
        onChange(baseSettings);
        break;
      case 'privacy-clean':
        // Remove personal metadata
        onChange({
          ...baseSettings,
          author: '',
          comment: '',
          gpsLatitude: '',
          gpsLongitude: '',
          country: '',
          city: '',
          clearLocation: true,
          removeDeviceInfo: true,
          creationDate: 'clear',
        });
        break;
      case 'remove-all':
        // Remove all optional metadata
        onChange({
          ...baseSettings,
          title: '',
          description: '',
          comment: '',
          author: '',
          artist: '',
          copyright: '',
          keywords: '',
          genre: '',
          language: '',
          creationDate: 'clear',
          recordingDate: 'clear',
          country: '',
          city: '',
          gpsLatitude: '',
          gpsLongitude: '',
          clearLocation: true,
          software: 'clear',
          removeDeviceInfo: true,
        });
        break;
      case 'custom':
        onChange(baseSettings);
        break;
    }
  };

  const resetMetadata = () => {
    onChange({
      preset: 'keep-original',
      title: null,
      description: null,
      comment: null,
      author: null,
      artist: null,
      copyright: null,
      keywords: null,
      genre: null,
      language: null,
      creationDate: 'keep',
      recordingDate: 'keep',
      country: null,
      city: null,
      gpsLatitude: null,
      gpsLongitude: null,
      clearLocation: false,
      software: 'keep',
      removeDeviceInfo: false,
    });
  };

  // Detect device info from original metadata
  const deviceInfo = {
    make: videoInfo.metadata['make'] || videoInfo.metadata['com.apple.quicktime.make'] || null,
    model: videoInfo.metadata['model'] || videoInfo.metadata['com.apple.quicktime.model'] || null,
    lens: videoInfo.metadata['lens'] || videoInfo.metadata['com.apple.quicktime.lens'] || null,
    firmware: videoInfo.metadata['firmware'] || null,
  };

  const hasDeviceInfo = deviceInfo.make || deviceInfo.model || deviceInfo.lens || deviceInfo.firmware;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-purple-400">🏷️</span> Metadata Editor
          {settings.preset !== 'keep-original' && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {settings.preset === 'privacy-clean' ? 'Privacy' : settings.preset === 'remove-all' ? 'Clean' : 'Custom'}
            </span>
          )}
        </h3>
        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-6">
          {/* Presets */}
          <div>
            <p className="text-sm text-gray-400 mb-3">Quick Presets:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'keep-original', label: 'Keep Original', icon: '📋' },
                { value: 'privacy-clean', label: 'Privacy Clean', icon: '🔒' },
                { value: 'remove-all', label: 'Remove All', icon: '🧹' },
                { value: 'custom', label: 'Custom', icon: '✏️' },
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset.value as MetadataPreset)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    settings.preset === preset.value
                      ? 'bg-purple-500/20 border-2 border-purple-500/50 text-purple-300'
                      : 'bg-gray-800/40 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  }`}
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-medium">{preset.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* General Metadata */}
          {settings.preset === 'custom' && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  General Information
                </h4>
                <div className="space-y-3">
                  <MetadataField
                    label="Title"
                    value={settings.title}
                    original={videoInfo.metadata['title']}
                    onChange={(value) => onChange({ ...settings, title: value })}
                  />
                  <MetadataField
                    label="Description"
                    value={settings.description}
                    original={videoInfo.metadata['description']}
                    onChange={(value) => onChange({ ...settings, description: value })}
                    multiline
                  />
                  <MetadataField
                    label="Comment"
                    value={settings.comment}
                    original={videoInfo.metadata['comment']}
                    onChange={(value) => onChange({ ...settings, comment: value })}
                  />
                  <MetadataField
                    label="Author"
                    value={settings.author}
                    original={videoInfo.metadata['author'] || videoInfo.metadata['artist']}
                    onChange={(value) => onChange({ ...settings, author: value })}
                  />
                  <MetadataField
                    label="Copyright"
                    value={settings.copyright}
                    original={videoInfo.metadata['copyright']}
                    onChange={(value) => onChange({ ...settings, copyright: value })}
                  />
                  <MetadataField
                    label="Keywords"
                    value={settings.keywords}
                    original={videoInfo.metadata['keywords']}
                    onChange={(value) => onChange({ ...settings, keywords: value })}
                  />
                  <MetadataField
                    label="Genre"
                    value={settings.genre}
                    original={videoInfo.metadata['genre']}
                    onChange={(value) => onChange({ ...settings, genre: value })}
                  />
                  <MetadataField
                    label="Language"
                    value={settings.language}
                    original={videoInfo.metadata['language']}
                    onChange={(value) => onChange({ ...settings, language: value })}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Date Information
                </h4>
                <div className="space-y-3">
                  <DateField
                    label="Creation Date"
                    value={settings.creationDate}
                    original={videoInfo.metadata['creation_time'] || videoInfo.metadata['date']}
                    onChange={(value) => onChange({ ...settings, creationDate: value })}
                  />
                  <DateField
                    label="Recording Date"
                    value={settings.recordingDate}
                    original={videoInfo.metadata['recording_date']}
                    onChange={(value) => onChange({ ...settings, recordingDate: value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Location Information
                </h4>
                <div className="space-y-3">
                  <MetadataField
                    label="Country"
                    value={settings.country}
                    original={videoInfo.metadata['country'] || videoInfo.metadata['location_country']}
                    onChange={(value) => onChange({ ...settings, country: value })}
                  />
                  <MetadataField
                    label="City"
                    value={settings.city}
                    original={videoInfo.metadata['city'] || videoInfo.metadata['location_city']}
                    onChange={(value) => onChange({ ...settings, city: value })}
                  />
                  <MetadataField
                    label="GPS Latitude"
                    value={settings.gpsLatitude}
                    original={videoInfo.metadata['gps_latitude'] || videoInfo.metadata['com.apple.quicktime.location.ISO6709']}
                    onChange={(value) => onChange({ ...settings, gpsLatitude: value })}
                  />
                  <MetadataField
                    label="GPS Longitude"
                    value={settings.gpsLongitude}
                    original={videoInfo.metadata['gps_longitude']}
                    onChange={(value) => onChange({ ...settings, gpsLongitude: value })}
                  />
                  <button
                    onClick={() => onChange({ ...settings, clearLocation: !settings.clearLocation })}
                    className={`w-full p-2 rounded-lg text-sm transition-all ${
                      settings.clearLocation
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {settings.clearLocation ? '✓ Location Will Be Cleared' : 'Clear Location Metadata'}
                  </button>
                </div>
              </div>

              {/* Software */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Software Information
                </h4>
                <div className="space-y-2">
                  {videoInfo.metadata['encoder'] && (
                    <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                      Original: {videoInfo.metadata['encoder']}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChange({ ...settings, software: 'keep' })}
                      className={`flex-1 p-2 rounded-lg text-sm transition-all ${
                        settings.software === 'keep'
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Keep
                    </button>
                    <button
                      onClick={() => onChange({ ...settings, software: 'clear' })}
                      className={`flex-1 p-2 rounded-lg text-sm transition-all ${
                        settings.software === 'clear'
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Device Information */}
              {hasDeviceInfo && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                    Device Information (Read-Only)
                  </h4>
                  <div className="space-y-2 mb-3">
                    {deviceInfo.make && (
                      <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                        Camera Make: {deviceInfo.make}
                      </div>
                    )}
                    {deviceInfo.model && (
                      <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                        Camera Model: {deviceInfo.model}
                      </div>
                    )}
                    {deviceInfo.lens && (
                      <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                        Lens: {deviceInfo.lens}
                      </div>
                    )}
                    {deviceInfo.firmware && (
                      <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                        Firmware: {deviceInfo.firmware}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onChange({ ...settings, removeDeviceInfo: !settings.removeDeviceInfo })}
                    className={`w-full p-2 rounded-lg text-sm transition-all ${
                      settings.removeDeviceInfo
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {settings.removeDeviceInfo ? '✓ Device Info Will Be Removed' : 'Remove Device Information'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={resetMetadata}
              className="w-full p-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Reset Metadata Settings
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-600 italic">
            Note: Metadata editing does not affect video quality, resolution, or aspect ratio.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper component for metadata fields
function MetadataField({
  label,
  value,
  original,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string | null;
  original?: string;
  onChange: (value: string | null) => void;
  multiline?: boolean;
}) {
  const displayValue = value === null ? (original || '') : value;
  const hasChanged = value !== null && value !== original;

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">
        {label}
        {hasChanged && <span className="text-purple-400 ml-2">(edited)</span>}
      </label>
      {multiline ? (
        <textarea
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={original || `Enter ${label.toLowerCase()}...`}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none resize-none"
          rows={2}
        />
      ) : (
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={original || `Enter ${label.toLowerCase()}...`}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
      )}
      {original && value === null && (
        <p className="text-xs text-gray-600 mt-1">Original: {original}</p>
      )}
    </div>
  );
}

// Helper component for date fields
function DateField({
  label,
  value,
  original,
  onChange,
}: {
  label: string;
  value: 'keep' | 'clear' | string;
  original?: string;
  onChange: (value: 'keep' | 'clear' | string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-2">{label}</label>
      <div className="flex gap-2">
        <button
          onClick={() => onChange('keep')}
          className={`flex-1 p-2 rounded-lg text-sm transition-all ${
            value === 'keep'
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
              : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          Keep Original
        </button>
        <button
          onClick={() => onChange('clear')}
          className={`flex-1 p-2 rounded-lg text-sm transition-all ${
            value === 'clear'
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
              : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          Clear
        </button>
        <input
          type="text"
          value={value === 'keep' || value === 'clear' ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom date..."
          className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
      </div>
      {original && value === 'keep' && (
        <p className="text-xs text-gray-600 mt-1">Original: {original}</p>
      )}
    </div>
  );
}
