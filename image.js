let originalImage = null;
const imagePreview = document.getElementById('imagePreview');

// Handle image upload
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            imagePreview.src = event.target.result;
            originalImage = new Image();
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// ============================================================================
// IMAGE PROCESSING PIPELINE (JS PORT OF PIL FUNCTIONS)
// ============================================================================

/**
 * 1. Smooth/De-noise & Sharpening (Replicates reduce_ai_artifacts)
 */
function reduceAiArtifacts(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Light Box Blur to emulate PIL.ImageFilter.SMOOTH_MORE
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.filter = 'blur(1.5px)';
    tempCtx.drawImage(ctx.canvas, 0, 0);
    const blurredData = tempCtx.getImageData(0, 0, width, height).data;

    // Blend original (60%) with blurred (40%)
    for (let i = 0; i < data.length; i += 4) {
        data[i]     = data[i]     * 0.6 + blurredData[i]     * 0.4;
        data[i + 1] = data[i + 1] * 0.6 + blurredData[i + 1] * 0.4;
        data[i + 2] = data[i + 2] * 0.6 + blurredData[i + 2] * 0.4;
    }
    ctx.putImageData(imageData, 0, 0);

    // Unsharp Mask approximation (3x3 kernel)
    applyConvolution(ctx, width, height, [
        0, -0.5, 0,
        -0.5, 3.0, -0.5,
        0, -0.5, 0
    ]);
}

/**
 * 2. Color, Contrast, and Brightness adjustments
 */
function colorCorrectAndNaturalLight(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const contrastFactor = 1.05;   // +5% Contrast
    const colorFactor    = 1.10;   // +10% Saturation
    const brightFactor   = 1.02;   // +2% Brightness

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r *= brightFactor;
        g *= brightFactor;
        b *= brightFactor;

        // Contrast
        r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

        // Saturation / Color
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + colorFactor * (r - gray);
        g = gray + colorFactor * (g - gray);
        b = gray + colorFactor * (b - gray);

        data[i]     = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imageData, 0, 0);
}

/**
 * 3. Watermark Calculations and Rendering
 */
function getWatermarkPosition(positionStr, imgW, imgH, textW, textH, padding = 40) {
    let x, y;
    switch (positionStr.toLowerCase()) {
        case 'top-left':
            x = padding;
            y = padding;
            break;
        case 'top-right':
            x = imgW - textW - padding;
            y = padding;
            break;
        case 'bottom-left':
            x = padding;
            y = imgH - textH - padding;
            break;
        case 'bottom-right':
            x = imgW - textW - padding;
            y = imgH - textH - padding;
            break;
        case 'center':
        default:
            x = (imgW - textW) / 2;
            y = (imgH - textH) / 2;
            break;
    }
    return { x, y };
}

function processSingleWatermark(ctx, imgW, imgH, config) {
    const fontSize = Math.max(config.minSize, Math.floor(imgW * 0.05));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';

    const metrics = ctx.measureText(config.text);
    const textWidth = metrics.width;
    const textHeight = fontSize; // Baseline approximation

    const { x, y } = getWatermarkPosition(
        config.position, 
        imgW, 
        imgH, 
        textWidth, 
        textHeight
    );

    // 1. Draw Shadow
    if (config.addShadow) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, 0.30)`;
        ctx.filter = 'blur(2px)';
        ctx.fillText(config.text, x + 2, y + 2);
        ctx.restore();
    }

    // 2. Draw Stroke
    if (config.addStroke) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${config.opacity})`;
        ctx.lineWidth = 1;
        ctx.strokeText(config.text, x, y);
        ctx.restore();
    }

    // 3. Draw Text Fill
    ctx.save();
    const [r, g, b] = config.color;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${config.opacity})`;
    ctx.fillText(config.text, x, y);
    ctx.restore();
}

/**
 * Convolution Helper for Sharpening
 */
function applyConvolution(ctx, width, height, weights) {
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const src = ctx.getImageData(0, 0, width, height);
    const srcData = src.data;
    const output = ctx.createImageData(width, height);
    const dstData = output.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dstOff = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
                    const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
                    const srcOff = (scy * width + scx) * 4;
                    const wt = weights[cy * side + cx];

                    r += srcData[srcOff] * wt;
                    g += srcData[srcOff + 1] * wt;
                    b += srcData[srcOff + 2] * wt;
                }
            }
            dstData[dstOff]     = Math.min(255, Math.max(0, r));
            dstData[dstOff + 1] = Math.min(255, Math.max(0, g));
            dstData[dstOff + 2] = Math.min(255, Math.max(0, b));
            dstData[dstOff + 3] = srcData[dstOff + 3];
        }
    }
    ctx.putImageData(output, 0, 0);
}

// ============================================================================
// MAIN PIPELINE EXECUTION
// ============================================================================

function convertImage() {
    if (!originalImage) return;

    // Default configuration (Matching Python constants)
    const LONG_SIDE = 2048;
    const WATERMARK_CONFIG = {
        text: "@TowsifAktar ",
        position: "bottom-right",
        color: [255, 255, 255],
        opacity: 0.30,
        minSize: 8,
        addShadow: true,
        addStroke: true
    };

    // 1. Long-side scaling calculation
    let w = originalImage.width;
    let h = originalImage.height;
    let newW, newH;

    if (w >= h) {
        newW = LONG_SIDE;
        newH = Math.round(h * (LONG_SIDE / w));
    } else {
        newH = LONG_SIDE;
        newW = Math.round(w * (LONG_SIDE / h));
    }

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');

    // High quality scaling down
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage, 0, 0, newW, newH);

    // 2. Artifact Reduction & Color Balance
    reduceAiArtifacts(ctx, newW, newH);
    colorCorrectAndNaturalLight(ctx, newW, newH);

    // 3. Watermarking
    processSingleWatermark(ctx, newW, newH, WATERMARK_CONFIG);

    // 4. Export & Download
    const format = document.getElementById('formatSelect')?.value || 'png';
    const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
    const dataUrl = canvas.toDataURL(mimeType, 1.0);

    const link = document.createElement('a');
    link.download = `converted_image.${format}`;
    link.href = dataUrl;
    link.click();
}
