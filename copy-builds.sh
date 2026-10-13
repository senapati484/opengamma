#!/bin/bash
# Copy freshly built installers to buildFiles/ directory
# Run from the project root after builds complete

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SCRIPT_DIR/out"
BUILD_FILES_DIR="$SCRIPT_DIR/buildFiles"

echo "📦 Copying build artifacts to buildFiles/..."
mkdir -p "$BUILD_FILES_DIR"

# Find and copy macOS DMG files
find "$OUT_DIR" -name "*.dmg" -exec bash -c 'echo "  ✅ Copying $1"; cp "$1" "'"$BUILD_FILES_DIR"'/"' _ {} \;

# Find and copy macOS ZIP files
find "$OUT_DIR" -name "*.zip" -exec bash -c 'echo "  ✅ Copying $1"; cp "$1" "'"$BUILD_FILES_DIR"'/"' _ {} \;

# Find and copy Windows installer (NSIS)
find "$OUT_DIR" -name "*.exe" -exec bash -c 'echo "  ✅ Copying $1"; cp "$1" "'"$BUILD_FILES_DIR"'/"' _ {} \;

# Find and copy Linux AppImage
find "$OUT_DIR" -name "*.AppImage" -exec bash -c 'echo "  ✅ Copying $1"; cp "$1" "'"$BUILD_FILES_DIR"'/"' _ {} \;

# Find and copy Linux deb
find "$OUT_DIR" -name "*.deb" -exec bash -c 'echo "  ✅ Copying $1"; cp "$1" "'"$BUILD_FILES_DIR"'/"' _ {} \;

echo ""
echo "📂 buildFiles/ contents:"
ls -lh "$BUILD_FILES_DIR"
echo ""
echo "✅ Done!"
