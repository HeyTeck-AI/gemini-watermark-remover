const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'perfect_natural_heal_no_crop.png');

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

        // Clean reference zone is y: 740 to 810
        // Watermark artifact zone is y: 825 to 940, x: 465 to 580
        
        // 1. Arm edge boundary: Her arm contour is around x=508 at y=800, extending down to x=512 at y=940
        const startArmEdge = 508;

        for (let y = 825; y <= 945; y++) {
            // Natural arm contour angle
            const armEdgeX = startArmEdge + (y - 825) * 0.05;

            // Target clean source Y (sampled from the pristine arm/background above)
            const cleanY = 750 + ((y - 825) % 55);

            for (let x = 465; x < width; x++) {
                let cleanX;
                if (x < armEdgeX) {
                    // Studio background: sample from clean background area above
                    const offsetFromEdge = armEdgeX - x;
                    cleanX = Math.round(startArmEdge - offsetFromEdge);
                } else {
                    // Skin forearm: sample from clean skin area above
                    const offsetFromEdge = x - armEdgeX;
                    cleanX = Math.round(startArmEdge + offsetFromEdge);
                }
                cleanX = Math.max(0, Math.min(width - 1, cleanX));

                const [cr, cg, cb] = getPixel(this.data, width, cleanX, cleanY);

                // Feather blend at borders of box so there are no seams
                const distToLeft = (x - 465) / 10;
                const distToTop = (y - 825) / 10;
                const distToBottom = (945 - y) / 10;
                const blend = Math.max(0, Math.min(1, Math.min(distToLeft, distToTop, distToBottom)));

                // Add natural subtle sensor grain
                const grain = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1 - 0.5) * 3;

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
            console.log('Saved 100% full-resolution zero-crop natural heal output!');
        });
    });
