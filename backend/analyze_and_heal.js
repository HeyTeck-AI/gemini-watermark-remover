const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\nk041\\.gemini\\antigravity-ide\\brain\\a525d249-9033-4d68-bfa8-8212c00e3a12\\.user_uploaded\\media_1787824704492.png';
const outputPath = path.join(__dirname, 'processed', 'clean_true_inpaint_no_crop.png');

fs.createReadStream(inputPath)
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', function() {
        const width = this.width;
        const height = this.height;
        console.log(`Image size: ${width}x${height}`);

        // The blur / watermark artifact region:
        // x: 465 to 583
        // y: 825 to 945
        
        // Find the arm contour x coordinate from clean region at y = 800 to 825
        // In clean region y=810:
        // Scan horizontally to find where skin transitions to background
        function getPixel(data, w, x, y) {
            const idx = (w * y + x) << 2;
            return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
        }

        function setPixel(data, w, x, y, r, g, b, a = 255) {
            const idx = (w * y + x) << 2;
            data[idx] = Math.round(r);
            data[idx + 1] = Math.round(g);
            data[idx + 2] = Math.round(b);
            data[idx + 3] = a;
        }

        // Detect arm edge in clean reference zone (y: 780 to 820)
        let edgePoints = [];
        for (let y = 780; y <= 825; y++) {
            for (let x = 460; x < 540; x++) {
                const [r1, g1, b1] = getPixel(this.data, width, x, y);
                const [r2, g2, b2] = getPixel(this.data, width, x + 2, y);
                // Skin is warmer/darker (r ~170, g ~115, b ~85)
                // Studio wall is brighter grey/white (r ~220, g ~220, b ~220)
                const diff = Math.abs(r2 - r1) + Math.abs(g2 - g1) + Math.abs(b2 - b1);
                if (diff > 80 && r2 > r1 && g2 > g1) {
                    edgePoints.push({ x, y });
                    break;
                }
            }
        }
        console.log('Sample edge points detected:', edgePoints.slice(0, 5));

        // Average slope / trajectory of arm contour
        const startEdge = edgePoints.length > 0 ? edgePoints[edgePoints.length - 1].x : 495;
        console.log('Arm edge at y=825 is x =', startEdge);

        // Perform Seamless Vertical Texture Synthesis & Edge Reconstruction (Zero Blur, Zero Crop)
        const minX = 465, maxX = width - 1;
        const minY = 825, maxY = 955;

        for (let y = minY; y <= maxY; y++) {
            // Slope of arm: arms slightly widen towards the bottom (slight angle +0.08 per pixel)
            const armEdgeX = startEdge + (y - 825) * 0.08;

            for (let x = minX; x <= maxX; x++) {
                // Vertical offset to sample clean texture from y: 770-820
                // Use a cyclic sampling window to avoid repetitive pattern
                const sampleOffset = 70 + ((y - minY) % 45);
                const cleanY = Math.max(760, y - sampleOffset);

                // Sample corresponding clean pixel from above
                // For skin (x <= armEdgeX): sample relative to arm edge
                // For background (x > armEdgeX): sample relative to wall
                let cleanX = x;
                if (x <= armEdgeX) {
                    // Align relative to arm edge
                    const distFromEdge = armEdgeX - x;
                    cleanX = Math.round(startEdge - distFromEdge);
                } else {
                    const distFromEdge = x - armEdgeX;
                    cleanX = Math.round(startEdge + distFromEdge);
                }
                cleanX = Math.max(0, Math.min(width - 1, cleanX));

                const [cr, cg, cb] = getPixel(this.data, width, cleanX, cleanY);

                // Soft transition across the boundary of the bounding box (feathering at edges)
                const featherDistX = Math.min(x - minX, maxX - x, 8) / 8;
                const featherDistY = Math.min(y - minY, maxY - y, 8) / 8;
                const blendFactor = Math.min(featherDistX, featherDistY);

                if (blendFactor >= 0.99) {
                    // Add subtle natural camera sensor micro-grain (+- 1.5)
                    const grain = (Math.random() - 0.5) * 3;
                    setPixel(this.data, width, x, y, cr + grain, cg + grain, cb + grain);
                } else {
                    const [origR, origG, origB] = getPixel(this.data, width, x, y);
                    const r = origR * (1 - blendFactor) + (cr) * blendFactor;
                    const g = origG * (1 - blendFactor) + (cg) * blendFactor;
                    const b = origB * (1 - blendFactor) + (cb) * blendFactor;
                    setPixel(this.data, width, x, y, r, g, b);
                }
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
            console.log('Successfully saved clean_true_inpaint_no_crop.png!');
        });
    });
