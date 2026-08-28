const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_final.png');

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

        // Clean source row: y from 830 to 855
        // Corrupted blur box: y from 865 to 960, x from 465 to 583
        const boxMinX = 465;
        const boxMaxX = width - 1;
        const boxMinY = 865;
        const boxMaxY = height - 1;

        // Sample clean vertical skin & skirt columns from y=835 to y=855
        for (let y = boxMinY; y <= boxMaxY; y++) {
            // Source y maps cyclically from clean 835-855
            const srcY = 835 + ((y - boxMinY) % 20);

            for (let x = boxMinX; x <= boxMaxX; x++) {
                const [sr, sg, sb] = getPixel(this.data, width, x, srcY);

                // Feather blend at top and left borders
                const blendX = Math.min((x - boxMinX) / 8, 1);
                const blendY = Math.min((y - boxMinY) / 8, 1);
                const blend = Math.min(blendX, blendY);

                // Natural micro-grain
                const grain = (Math.random() - 0.5) * 2.5;

                if (blend >= 0.99) {
                    setPixel(this.data, width, x, y, sr + grain, sg + grain, sb + grain);
                } else {
                    const [origR, origG, origB] = getPixel(this.data, width, x, y);
                    const r = origR * (1 - blend) + (sr + grain) * blend;
                    const g = origG * (1 - blend) + (sg + grain) * blend;
                    const b = origB * (1 - blend) + (sb + grain) * blend;
                    setPixel(this.data, width, x, y, r, g, b);
                }
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
            console.log('Saved perfect_natural_heal_final.png!');
        });
    });
