#!/bin/bash
set -e

# Change directory to the script's parent folder (resources)
cd "$(dirname "$0")"

echo "=== OpenGamma Icon Generator ==="

# Check if sharp is installed, install locally if missing
if ! node -e "require('sharp')" &>/dev/null; then
  echo "Installing sharp dependency locally..."
  npm install sharp --no-save
fi

# Write a temporary generator script
cat << 'EOF' > temp_generator.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, 'icon.svg');

// macOS sizes for iconset:
const iconsetSizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 }
];

// Windows sizes:
const icoSizes = [16, 32, 48, 256];

// Linux sizes:
const linuxSize = 512;

async function generate() {
  const iconsetDir = path.join(__dirname, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir);
  }

  console.log('1. Rendering macOS iconset PNGs...');
  for (const s of iconsetSizes) {
    await sharp(svgPath)
      .resize(s.size, s.size)
      .png()
      .toFile(path.join(iconsetDir, s.name));
  }

  console.log('2. Compiling Windows icon.ico (16, 32, 48, 256)...');
  const icoPngBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer();
    icoPngBuffers.push(buf);
  }
  const icoBuffer = createIco(icoPngBuffers, icoSizes);
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer);

  console.log('3. Rendering Linux icon.png (512x512)...');
  await sharp(svgPath)
    .resize(linuxSize, linuxSize)
    .png()
    .toFile(path.join(__dirname, 'icon.png'));

  console.log('4. Compiling macOS icon.icns via iconutil...');
  const execSync = require('child_process').execSync;
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(__dirname, 'icon.icns')}"`);
    console.log('   macOS icon.icns successfully generated.');
  } catch (err) {
    console.warn('   [WARNING] Failed to run iconutil. This is expected if you are not running on macOS.', err.message);
  }

  // Clean up iconset directory
  console.log('5. Cleaning up temporary iconset files...');
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log('=== Icon generation completed successfully! ===');
}

function createIco(pngBuffers, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  const entries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const size = sizes[i];
    const entry = Buffer.alloc(16);

    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Image size
    entry.writeUInt32LE(currentOffset, 12); // Image offset

    entries.push(entry);
    currentOffset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
EOF

# Run generator and clean up
node temp_generator.js
rm temp_generator.js
