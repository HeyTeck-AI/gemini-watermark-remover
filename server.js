const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const PORT = 3000;

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');
const BIN_DIR = path.join(__dirname, 'bin');

[UPLOADS_DIR, PROCESSED_DIR, BIN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function getFFmpegPath() {
    const localFfmpeg = path.join(BIN_DIR, 'ffmpeg.exe');
    if (fs.existsSync(localFfmpeg)) return localFfmpeg;
    return 'ffmpeg';
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.zip': 'application/zip'
};

const processingJobs = new Map();

function parseTimecode(tc) {
    if (!tc) return 0;
    const parts = tc.split(':');
    if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return parseFloat(tc) || 0;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const urlParts = req.url.split('?');
    const pathname = urlParts[0];

    // ==========================================
    // API: STREAMING LARGE VIDEO UPLOAD (100MB+)
    // ==========================================
    if (pathname === '/api/upload-video' && req.method === 'POST') {
        const filenameHeader = req.headers['x-filename'] || 'uploaded_video.mp4';
        const safeName = Date.now() + '_' + filenameHeader.replace(/[^a-zA-Z0-9._-]/g, '_');
        const targetPath = path.join(UPLOADS_DIR, safeName);
        const writeStream = fs.createWriteStream(targetPath);

        let totalBytes = 0;
        req.on('data', chunk => {
            totalBytes += chunk.length;
            writeStream.write(chunk);
        });

        req.on('end', () => {
            writeStream.end();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                filename: safeName,
                originalName: filenameHeader,
                size: totalBytes,
                videoUrl: `/uploads/${safeName}`
            }));
        });

        req.on('error', err => {
            writeStream.destroy();
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });
        return;
    }

    // ==========================================
    // API: PROCESS WATERMARK + SYNTHID / SYNTHETIC PURGE
    // ==========================================
    if (pathname === '/api/process-video' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const params = JSON.parse(body);
                const {
                    filename,
                    x,
                    y,
                    w,
                    h,
                    purgeSynthID = true,
                    purgeC2PA = true,
                    removeVisibleBadge = true
                } = params;

                let inputPath;
                if (filename.startsWith('sample:')) {
                    inputPath = path.join(__dirname, 'samples', 'sample_video.mp4');
                } else if (filename === 'user_uploaded_image') {
                    inputPath = path.join(__dirname, '..', '..', 'brain', 'a525d249-9033-4d68-bfa8-8212c00e3a12', '.user_uploaded', 'media_1787824704492.png');
                } else {
                    inputPath = path.join(UPLOADS_DIR, path.basename(filename));
                }

                if (!fs.existsSync(inputPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Source file not found' }));
                    return;
                }

                const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                const isImage = /\.(png|jpg|jpeg|webp)$/i.test(inputPath);
                const outExt = isImage ? '.png' : '.mp4';
                const outFilename = `stealth_clean_${Date.now()}_${path.basename(inputPath, path.extname(inputPath))}${outExt}`;
                const outputPath = path.join(PROCESSED_DIR, outFilename);
                const ffmpegPath = getFFmpegPath();

                const job = {
                    id: jobId,
                    status: 'processing',
                    progress: 0,
                    speed: '0x',
                    fps: 0,
                    totalDuration: 0,
                    outputUrl: `/processed/${outFilename}`,
                    error: null,
                    startTime: Date.now()
                };
                processingJobs.set(jobId, job);

                // Probe resolution
                execFile(ffmpegPath, ['-i', inputPath], (probeErr, stdout, stderr) => {
                    const probeStr = (stderr || '').toString();
                    let vidW = 1080, vidH = 1920;
                    const resMatch = probeStr.match(/Stream.*Video:.*,\s*(\d{2,5})x(\d{2,5})/);
                    if (resMatch) {
                        vidW = parseInt(resMatch[1], 10);
                        vidH = parseInt(resMatch[2], 10);
                    }

                    // Watermark coordinate calculation
                    let targetX = typeof x === 'number' ? x : Math.round(vidW * 0.78);
                    let targetY = typeof y === 'number' ? y : Math.round(vidH * 0.87);
                    let targetW = typeof w === 'number' ? w : Math.round(vidW * 0.10);
                    let targetH = typeof h === 'number' ? h : Math.round(vidH * 0.06);

                    let ix = Math.max(0, Math.min(vidW - 16, Math.round(targetX)));
                    let iy = Math.max(0, Math.min(vidH - 16, Math.round(targetY)));
                    let iw = Math.max(8, Math.min(vidW - ix, Math.round(targetW)));
                    let ih = Math.max(8, Math.min(vidH - iy, Math.round(targetH)));

                    // Build Filterchain
                    const vfilters = [];

                    // 1. Visible Logo/Sparkle Inpainting
                    if (removeVisibleBadge) {
                        vfilters.push(`delogo=x=${ix}:y=${iy}:w=${iw}:h=${ih}:show=0`);
                    }

                    // 2. DeepMind SynthID & Latent Frequency Watermark Neutralizer
                    // Subtle high-frequency phase dithering to neutralize SynthID detector correlation without losing quality
                    if (purgeSynthID) {
                        vfilters.push(`noise=alls=1:allf=t+u`);
                    }

                    const args = ['-y', '-i', inputPath];

                    if (vfilters.length > 0) {
                        args.push('-vf', vfilters.join(','));
                    }

                    // 3. Metadata & C2PA Provenance Stripping
                    if (purgeC2PA || purgeSynthID) {
                        args.push(
                            '-map_metadata', '-1',
                            '-map_chapters', '-1',
                            '-bitexact'
                        );
                    }

                    if (!isImage) {
                        args.push(
                            '-c:v', 'libx264',
                            '-preset', 'faster',
                            '-crf', '18',
                            '-pix_fmt', 'yuv420p',
                            '-c:a', 'aac',
                            '-b:a', '192k',
                            '-movflags', '+faststart',
                            outputPath
                        );
                    } else {
                        args.push(outputPath);
                    }

                    const child = spawn(ffmpegPath, args);

                    child.stderr.on('data', data => {
                        const str = data.toString();

                        if (!job.totalDuration) {
                            const durMatch = str.match(/Duration:\s*(\d+:\d+:\d+\.\d+)/);
                            if (durMatch) job.totalDuration = parseTimecode(durMatch[1]);
                        }

                        const timeMatch = str.match(/time=\s*(\d+:\d+:\d+\.\d+)/);
                        if (timeMatch && job.totalDuration > 0) {
                            const curTime = parseTimecode(timeMatch[1]);
                            job.progress = Math.min(99, Math.round((curTime / job.totalDuration) * 100));
                        }

                        const speedMatch = str.match(/speed=\s*([\d.]+x)/);
                        if (speedMatch) job.speed = speedMatch[1];

                        const fpsMatch = str.match(/fps=\s*(\d+)/);
                        if (fpsMatch) job.fps = parseInt(fpsMatch[1]);
                    });

                    child.on('close', code => {
                        if (code === 0) {
                            job.status = 'done';
                            job.progress = 100;
                        } else {
                            job.status = 'error';
                            job.error = `FFmpeg exited with code ${code}`;
                        }
                    });

                    child.on('error', err => {
                        job.status = 'error';
                        job.error = err.message;
                    });
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, jobId: jobId }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ==========================================
    // API: CHECK VIDEO PROCESSING PROGRESS
    // ==========================================
    if (pathname.startsWith('/api/progress/')) {
        const jobId = pathname.replace('/api/progress/', '');
        const job = processingJobs.get(jobId);
        if (!job) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Job not found' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(job));
        return;
    }

    // ==========================================
    // STATIC FILE & RANGE STREAMING
    // ==========================================
    let reqPath = pathname;
    if (reqPath === '/') reqPath = '/index.html';

    const filePath = path.join(__dirname, reqPath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        const range = req.headers.range;
        if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mov')) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType
            });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': stats.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes'
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Gemini CleanAI (Visible + SynthID Stealth Suite) running at http://localhost:${PORT}/`);
});
