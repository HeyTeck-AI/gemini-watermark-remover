const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_v5.png');

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

        const boxMinX = 460;
        const boxMaxX = width - 1;
        const boxMinY = 855;
        const boxMaxY = height - 1;

        for (let y = boxMinY; y <= boxMaxY; y++) {
            for (let x = boxMinX; x <= boxMaxX; x++) {
                let sr, sg, sb;

                if (x < 488) {
                    // White skirt waistband continuation horizontally from clean left side (x: 430-455)
                    const cleanX = Math.max(0, 445 - (488 - x));
                    [sr, sg, sb] = getPixel(this.data, width, cleanX, y);
                } else {
                    // Arm skin continuation vertically from clean arm above (y: 835-850)
                    const cleanY = 835 + ((y - boxMinY) % 15);
                    [sr, sg, sb] = getPixel(this.data, width, x, cleanY);
                }

                // Smooth feather blend at borders
                const blendX = Math.min((x - boxMinX) / 8, 1);
                const blendY = Math.min((y - boxMinY) / 8, 1);
                const blend = Math.min(blendX, blendY);

                const grain = (Math.random() - 0.5) * 2;

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
            console.log('Saved perfect_natural_heal_v5.png!');
        });
    });
