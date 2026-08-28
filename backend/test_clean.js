const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const inputImg = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const ffmpeg = path.join(__dirname, 'bin', 'ffmpeg.exe');
const outDir = path.join(__dirname, 'processed');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Test 1: Smart 1.035x Lossless Re-frame (Lanczos Scaling) - Zero Blur
const out1 = path.join(outDir, 'clean_reframe.png');
execSync(`"${ffmpeg}" -y -i "${inputImg}" -vf "crop=in_w*0.93:in_h*0.93:in_w*0.02:in_h*0.015,scale=583:960:flags=lanczos" "${out1}"`);

// Test 2: Bottom-Right Corner Clone Patch (Copy clean arm/background from y-120 down to y with feathering)
const out2 = path.join(outDir, 'clean_patch_clone.png');
// Watermark zone in 583x960 image: x: 460-580, y: 830-910
// Crop clean strip from x=460, y=710, w=120, h=80, and overlay at x=460, y=830
execSync(`"${ffmpeg}" -y -i "${inputImg}" -filter_complex "[0:v]crop=120:80:460:730[patch];[0:v][patch]overlay=460:830" "${out2}"`);

// Test 3: Subtle Micro-Trim (Crop bottom 45px and top 15px)
const out3 = path.join(outDir, 'clean_trim.png');
execSync(`"${ffmpeg}" -y -i "${inputImg}" -vf "crop=in_w:in_h-60:0:0,scale=583:960:flags=lanczos" "${out3}"`);

console.log('Processed test outputs successfully!');
