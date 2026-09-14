export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold">
            CE
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CleanExport</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden sm:inline px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
            🔒 Local Processing
          </span>
          <span className="hidden sm:inline px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            FFmpeg WASM
          </span>
        </div>
      </div>
    </header>
  );
}
