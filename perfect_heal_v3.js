const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_v3.png');

fs.createReadStream(inputPath)
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', function() {
        const width = this.width;
        const height = this.height;

        function getPixel(data, w, x, y) {
            const idx = (w * y + x) << 2;
            return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
        }

        function setPixel(data, w, x, y, r, g, b, a = 255) {
            const idx = (w * y + x) << 2;
            data[idx] = Math.max(0, Math.min(255, Math.round(r)));
            data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
            data[idx + 3] = a;
        }

        // Clean source patch: y from 710 to 810, x from 465 to width-1
        // Destination target patch: y from 828 to 928, x from 465 to width-1
        const srcMinY = 710;
        const dstMinY = 828;
        const dstMaxY = 928;
        const minX = 465;
        const maxX = width - 1;

        for (let y = dstMinY; y <= dstMaxY; y++) {
            const srcY = srcMinY + (y - dstMinY);

            for (let x = minX; x <= maxX; x++) {
                const [sr, sg, sb] = getPixel(this.data, width, x, srcY);

                // Seamless cosine feather at box boundary
                const fLeft = Math.min((x - minX) / 12, 1);
                const fTop = Math.min((y - dstMinY) / 12, 1);
                const fBottom = Math.min((dstMaxY - y) / 12, 1);
                const rawBlend = Math.min(fLeft, fTop, fBottom);
                // Cosine smooth step
                const blend = 0.5 - 0.5 * Math.cos(rawBlend * Math.PI);

                const [origR, origG, origB] = getPixel(this.data, width, x, y);
                const r = origR * (1 - blend) + sr * blend;
                const g = origG * (1 - blend) + sg * blend;
                const b = origB * (1 - blend) + sb * blend;

                setPixel(this.data, width, x, y, r, g, b);
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
            console.log('Saved perfect_natural_heal_v3.png!');
        });
    });
