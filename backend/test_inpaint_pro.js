const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputImg = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const ffmpeg = path.join(__dirname, 'bin', 'ffmpeg.exe');
const outDir = path.join(__dirname, 'processed');

// Test 1: Smart Center Re-frame (6% zoom - pushes entire watermark area outside frame cleanly)
const out1 = path.join(outDir, 'clean_zoom_perfect.png');
execSync(`"${ffmpeg}" -y -i "${inputImg}" -vf "crop=in_w*0.89:in_h*0.89:(in_w-in_w*0.89)/2:in_h*0.02,scale=583:960:flags=lanczos" "${out1}"`);

// Test 2: Inpaint using Left-to-Right Gradient Diffusion & Skin Continuation
// We can use a custom FFmpeg filter or pixel script
// Let's create a feathered clone from the left side of the arm
const out2 = path.join(outDir, 'clean_clone_feathered.png');
// Clone clean arm from x: 380-460, y: 830-925 and blend over x: 470-583, y: 830-925
execSync(`"${ffmpeg}" -y -i "${inputImg}" -filter_complex "[0:v]crop=110:100:360:830,hflip[patch];[0:v][patch]overlay=470:830:enable='between(t,0,999)'" "${out2}"`);

console.log('Done rendering tests!');
