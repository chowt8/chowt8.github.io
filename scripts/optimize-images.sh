#!/usr/bin/env bash
# optimize-images.sh
#
# Converts all JPG and PNG images in /images to WebP and AVIF at multiple sizes.
# Also converts the greeting GIF to MP4.
#
# Requirements (install via Homebrew):
#   brew install webp       # provides cwebp
#   brew install libavif    # provides avifenc
#   brew install ffmpeg     # for video/gif conversion
#   brew install imagemagick # provides convert (for resizing)
#
# Run from the repo root:
#   chmod +x scripts/optimize-images.sh
#   ./scripts/optimize-images.sh

set -e

IMAGES_DIR="./images"
QUALITY_WEBP=82       # WebP quality (0-100). 80-85 is visually lossless for photos.
QUALITY_AVIF=65       # AVIF quality (0-63, lower = better). 55-65 is visually lossless.
SIZES=(640 1280 1920) # Width variants to generate (height auto-scales)

# Check dependencies
check_dep() {
    if ! command -v "$1" &>/dev/null; then
        echo "Missing: $1 — run: brew install $2"
        exit 1
    fi
}
check_dep cwebp webp
check_dep avifenc libavif
check_dep convert imagemagick
check_dep ffmpeg ffmpeg

echo "Starting image optimization..."
echo ""

# Process all JPG and PNG files
find "$IMAGES_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r src; do
    dir=$(dirname "$src")
    base=$(basename "$src" | sed 's/\.[^.]*$//')
    ext="${src##*.}"

    echo "Processing: $src"

    for width in "${SIZES[@]}"; do
        # Get original dimensions
        orig_width=$(identify -format "%w" "$src" 2>/dev/null || echo "9999")

        # Skip if original is smaller than target width
        if [ "$orig_width" -le "$width" ] 2>/dev/null; then
            echo "  Skipping ${width}w — source is ${orig_width}px wide"
            continue
        fi

        resized_tmp="/tmp/portfolio_resize_${base}_${width}.png"

        # Resize to target width
        convert "$src" -resize "${width}x>" "$resized_tmp"

        # WebP
        webp_out="${dir}/${base}-${width}w.webp"
        cwebp -q "$QUALITY_WEBP" "$resized_tmp" -o "$webp_out" -quiet
        echo "  → $webp_out ($(du -sh "$webp_out" | cut -f1))"

        # AVIF
        avif_out="${dir}/${base}-${width}w.avif"
        avifenc --min 0 --max "$QUALITY_AVIF" --speed 6 "$resized_tmp" "$avif_out" > /dev/null 2>&1
        echo "  → $avif_out ($(du -sh "$avif_out" | cut -f1))"

        rm "$resized_tmp"
    done

    # Also generate a WebP at original size (replaces the PNG/JPG for 1:1 swap)
    orig_webp="${dir}/${base}.webp"
    cwebp -q "$QUALITY_WEBP" "$src" -o "$orig_webp" -quiet
    echo "  → $orig_webp ($(du -sh "$orig_webp" | cut -f1))"

    echo ""
done

# Convert greeting.gif to MP4 (massive size reduction)
GIF_SRC="$IMAGES_DIR/greeting.gif"
if [ -f "$GIF_SRC" ]; then
    echo "Converting GIF to MP4: $GIF_SRC"
    ffmpeg -i "$GIF_SRC" \
        -movflags faststart \
        -pix_fmt yuv420p \
        -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
        -crf 28 \
        "$IMAGES_DIR/greeting.mp4" \
        -y -loglevel error
    echo "  → $IMAGES_DIR/greeting.mp4 ($(du -sh "$IMAGES_DIR/greeting.mp4" | cut -f1))"
    echo "  Original GIF: $(du -sh "$GIF_SRC" | cut -f1)"
    echo ""
fi

echo "Done. Optimized assets are alongside the originals."
echo ""
echo "Next step: update HTML to use <picture> elements."
echo "See the example below for how to reference the new files:"
echo ""
cat << 'EXAMPLE'
<!-- Before: single image -->
<img src="../images/redfin/redfin-cover.jpg" alt="..." loading="lazy" decoding="async">

<!-- After: responsive picture with AVIF/WebP/JPG fallback -->
<picture>
  <source
    type="image/avif"
    srcset="../images/redfin/redfin-cover-640w.avif 640w,
            ../images/redfin/redfin-cover-1280w.avif 1280w,
            ../images/redfin/redfin-cover-1920w.avif 1920w"
    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 80vw, 1280px">
  <source
    type="image/webp"
    srcset="../images/redfin/redfin-cover-640w.webp 640w,
            ../images/redfin/redfin-cover-1280w.webp 1280w,
            ../images/redfin/redfin-cover-1920w.webp 1920w"
    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 80vw, 1280px">
  <img
    src="../images/redfin/redfin-cover.jpg"
    alt="..."
    loading="lazy"
    decoding="async">
</picture>
EXAMPLE
