# Gemini CleanAI — Total Watermark & SynthID™ AI Remover

High-performance web tool designed to erase visible Gemini/Omni video watermarks, purge Google DeepMind SynthID™ invisible forensic metadata, and strip C2PA provenance signatures with content-aware temporal inpainting.

---

## ⚡ Features
- **Visual Watermark Erase**: Intelligent bounding-box temporal delogo & inpainting.
- **DeepMind SynthID™ Forensic Purge**: Micro-spatial frequency perturbation + high-frequency audio mask.
- **C2PA & Exif Stripping**: Removes metadata, provenance chains, and synthetic tags.
- **High Bitrate Output**: Clean NVENC/x264 rendering preserving 100% video clarity.
- **Modern Cyberpunk UI**: Built with Tailwind CSS, real-time video timeline player, interactive drag-resize overlay box.

---

## 🚀 Getting Started Locally

### Prerequisites
1. [Node.js](https://nodejs.org/) (v18+ recommended)
2. [FFmpeg](https://ffmpeg.org/download.html) installed on system PATH (or placed in `bin/` folder)

### Installation
```bash
# Clone the repository
git clone https://github.com/HeyTeck-AI/gemini-watermark-remover.git
cd gemini-watermark-remover

# Install Node dependencies
npm install

# Start the local server
node server.js
# Or on Windows, double-click start_watermark_remover.bat
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🌐 Cloud Deployment (Netlify & Backend)
- **Frontend**: The `index.html` static interface can be hosted on **Netlify** / **Vercel** / **GitHub Pages**.
- **Backend (FFmpeg Processing Engine)**: Video processing requires a backend with FFmpeg installed. Deploy `server.js` on **Render**, **Railway**, **Fly.io**, or any cloud VPS.
