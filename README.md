# CleanExport

**Clean, standardize, and re-export your own video files.**

CleanExport is a browser-based video processing tool that removes metadata, re-encodes video into a fresh standardized copy, and provides a downloadable output — all processed locally in your browser using FFmpeg WASM.

## Features

- 🎬 **Video Upload & Analysis** — Drag-and-drop upload with detailed technical inspection
- 🧹 **Metadata Cleanup** — Removes ordinary embedded metadata (title, artist, GPS, timestamps, etc.)
- 🔄 **Re-encoding Engine** — Decodes and re-encodes using H.264/AAC (not a simple copy)
- 📐 **Aspect Ratio Control** — Preserve original or convert to 9:16, 16:9, 1:1, 4:5, 3:4, 4:3, 3:2, 21:9, or custom
- 🎯 **Smart Conversion** — Crop to Fill, Fit with Background, or Stretch modes with live preview
- ✂️ **Crop Positioning** — Choose which part of the video to keep (center, top, bottom, left, right) with fine-tune offsets
- 🎨 **Visual Cleanup** — Manual region blur, pixelation, or masking for your own footage
- ⚙️ **Customizable Settings** — Quality, resolution, frame rate, and audio options
- 🔒 **Privacy-First** — All processing happens locally in your browser
- 📊 **Before/After Comparison** — Detailed comparison of original vs. exported file
- 📥 **Download** — Get your cleaned video with a single click

## Supported Formats

- MP4, MOV, MKV, WEBM, AVI
- Maximum file size: 2 GB (browser memory dependent)

## Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Processing:** FFmpeg WASM (@ffmpeg/ffmpeg)
- **Build:** Vite
- **Architecture:** 100% client-side, no server required

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Important Notes

### Browser Requirements

CleanExport uses FFmpeg WASM which requires:
- A modern browser (Chrome, Firefox, Edge, Safari 16.4+)
- Sufficient memory for video processing (recommend 4GB+ RAM)
- Internet connection (for initial FFmpeg WASM download)

### Server Configuration (Production)

For optimal performance, your hosting server should include these headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These enable `SharedArrayBuffer` for better FFmpeg performance. Without them, the app will still work using the single-threaded FFmpeg core.

### Privacy

- Your videos are **never uploaded** to any server
- All processing occurs locally in your browser
- Temporary data is released after processing
- No data is stored or tracked

### Disclaimer

Re-exporting and metadata cleaning can remove ordinary file metadata and regenerate the media file, but **no tool can guarantee** that a social platform will not recognize previously published or reused content. Platform-side content matching can use the actual visual and audio content rather than only metadata or watermarks.

Only upload content you own or have permission to edit.

## Processing Pipeline

1. Upload file → Validate file type
2. Extract technical information (FFprobe equivalent)
3. Read available metadata
4. Display analysis to user
5. Strip ordinary metadata (`-map_metadata -1`)
6. Decode the original media
7. Re-encode video (libx264, CRF 18-24)
8. Re-encode audio (AAC, 192-256 kbps)
9. Create fresh MP4 container with fast-start
10. Apply visual cleanup if enabled
11. Validate output
12. Generate checksum
13. Provide download

## Default FFmpeg Settings

```
ffmpeg -i input
  -map_metadata -1
  -map_chapters -1
  -c:v libx264
  -crf 20
  -preset medium
  -pix_fmt yuv420p
  -c:a aac
  -b:a 192k
  -movflags +faststart
  output.mp4
```

Settings are dynamically adjusted based on user-selected quality, resolution, frame rate, and audio options.

## License

MIT
