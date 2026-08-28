const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_v2.png');

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

        // Clean source row at y = 810 to 818 (average 8 rows to get clean, noise-free continuous slice)
        const cleanSlice = [];
        for (let x = 0; x < width; x++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = 808; sy <= 816; sy++) {
                const [r, g, b] = getPixel(this.data, width, x, sy);
                rSum += r; gSum += g; bSum += b; count++;
            }
            cleanSlice[x] = [rSum / count, gSum / count, bSum / count];
        }

        const startArmEdge = 508;
        const minX = 465, maxX = width - 1;
        const minY = 825, maxY = 955;

        for (let y = minY; y <= maxY; y++) {
            const armEdgeX = startArmEdge + (y - minY) * 0.04;
            // Studio shadow falloff gradient downwards
            const lightFalloff = 1.0 - ((y - minY) / (maxY - minY)) * 0.04;

            for (let x = minX; x <= maxX; x++) {
                let srcX;
                if (x < armEdgeX) {
                    const dist = armEdgeX - x;
                    srcX = Math.round(startArmEdge - dist);
                } else {
                    const dist = x - armEdgeX;
                    srcX = Math.round(startArmEdge + dist);
                }
                srcX = Math.max(0, Math.min(width - 1, srcX));

                const [baseR, baseG, baseB] = cleanSlice[srcX];
                const cr = baseR * lightFalloff;
                const cg = baseG * lightFalloff;
                const cb = baseB * lightFalloff;

                // Feather borders
                const distL = Math.min((x - minX) / 8, 1);
                const distT = Math.min((y - minY) / 8, 1);
                const distB = Math.min((maxY - y) / 8, 1);
                const blend = Math.max(0, Math.min(1, Math.min(distL, distT, distB)));

                // Add subtle sensor grain (±1.5)
                const grain = ((Math.random() - 0.5) * 3);

                if (blend >= 0.99) {
                    setPixel(this.data, width, x, y, cr + grain, cg + grain, cb + grain);
                } else {
                    const [origR, origG, origB] = getPixel(this.data, width, x, y);
                    const r = origR * (1 - blend) + (cr + grain) * blend;
                    const g = origG * (1 - blend) + (cg + grain) * blend;
                    const b = origB * (1 - blend) + (cb + grain) * blend;
                    setPixel(this.data, width, x, y, r, g, b);
                }
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
            console.log('Saved perfect_natural_heal_v2.png!');
        });
    });
