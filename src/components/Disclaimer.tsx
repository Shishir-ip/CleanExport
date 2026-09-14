export default function Disclaimer() {
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
      <div className="flex gap-3">
        <span className="text-yellow-400 text-lg shrink-0">⚠️</span>
        <div className="text-sm text-yellow-200/80">
          <p className="font-medium text-yellow-300 mb-1">Important Disclaimer</p>
          <p>
            Re-exporting and metadata cleaning can remove ordinary file metadata and regenerate the media file,
            but no tool can guarantee that a social platform will not recognize previously published or reused content.
            Platform-side content matching can use the actual visual and audio content rather than only metadata or watermarks.
          </p>
          <p className="mt-2 text-yellow-200/60 text-xs">
            CleanExport processes your video locally and does not upload it to any server.
            Only upload content you own or have permission to edit.
          </p>
        </div>
      </div>
    </div>
  );
}
