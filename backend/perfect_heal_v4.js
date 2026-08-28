const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_v4.png');

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

        // Full coverage: y from 820 to 958, x from 455 to width-1
        // Source clean patch: y from 680 to 818
        const dstMinY = 820;
        const dstMaxY = 958;
        const srcMinY = 680;
        const minX = 455;
        const maxX = width - 1;

        for (let y = dstMinY; y <= dstMaxY; y++) {
            const srcY = srcMinY + (y - dstMinY);

            for (let x = minX; x <= maxX; x++) {
                const [sr, sg, sb] = getPixel(this.data, width, x, srcY);

                // Feather at top and left borders
                const fLeft = Math.min((x - minX) / 10, 1);
                const fTop = Math.min((y - dstMinY) / 10, 1);
                const fBottom = Math.min((dstMaxY - y) / 10, 1);
                const rawBlend = Math.min(fLeft, fTop, fBottom);
                const blend = 0.5 - 0.5 * Math.cos(rawBlend * Math.PI);

                const [origR, origG, origB] = getPixel(this.data, width, x, y);
                const r = origR * (1 - blend) + sr * blend;
                const g = origG * (1 - blend) + sg * blend;
                const b = origB * (1 - blend) + sb * blend;

                setPixel(this.data, width, x, y, r, g, b);
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
            console.log('Saved perfect_natural_heal_v4.png!');
        });
    });
