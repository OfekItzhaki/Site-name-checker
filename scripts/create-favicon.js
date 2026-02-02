const fs = require('fs');

// Create a simple ICO file structure for 16x16 favicon
function createSimpleICO() {
  // This creates a minimal ICO file with blue background and white dot
  const icoHeader = Buffer.from([
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type (1 = ICO)
    0x01, 0x00  // Number of images
  ]);
  
  const imageEntry = Buffer.from([
    0x10,       // Width (16)
    0x10,       // Height (16)
    0x00,       // Color count (0 = no palette)
    0x00,       // Reserved
    0x01, 0x00, // Color planes
    0x20, 0x00, // Bits per pixel (32)
    0x00, 0x01, 0x00, 0x00, // Image size (256 bytes)
    0x16, 0x00, 0x00, 0x00  // Image offset
  ]);
  
  // Create a simple 16x16 bitmap data (RGBA format)
  const bitmapData = Buffer.alloc(16 * 16 * 4); // 16x16 pixels, 4 bytes per pixel (RGBA)
  
  // Fill with blue background (#2563eb)
  for (let i = 0; i < 16 * 16; i++) {
    const offset = i * 4;
    bitmapData[offset] = 0x25;     // Blue
    bitmapData[offset + 1] = 0x63; // Green
    bitmapData[offset + 2] = 0xeb; // Red (BGR format)
    bitmapData[offset + 3] = 0xff; // Alpha
  }
  
  // Add some white pixels for a simple globe pattern
  const centerPixels = [
    5*16 + 8, 6*16 + 6, 6*16 + 10, 7*16 + 5, 7*16 + 11,
    8*16 + 4, 8*16 + 12, 9*16 + 5, 9*16 + 11, 10*16 + 6, 10*16 + 10
  ];
  
  centerPixels.forEach(pixelIndex => {
    if (pixelIndex < 16 * 16) {
      const offset = pixelIndex * 4;
      bitmapData[offset] = 0xff;     // Blue
      bitmapData[offset + 1] = 0xff; // Green  
      bitmapData[offset + 2] = 0xff; // Red
      bitmapData[offset + 3] = 0xff; // Alpha
    }
  });
  
  // Bitmap info header
  const bitmapHeader = Buffer.from([
    0x28, 0x00, 0x00, 0x00, // Header size (40)
    0x10, 0x00, 0x00, 0x00, // Width (16)
    0x20, 0x00, 0x00, 0x00, // Height (32 = 16*2 for XOR and AND masks)
    0x01, 0x00,             // Planes (1)
    0x20, 0x00,             // Bits per pixel (32)
    0x00, 0x00, 0x00, 0x00, // Compression (0 = none)
    0x00, 0x01, 0x00, 0x00, // Image size
    0x00, 0x00, 0x00, 0x00, // X pixels per meter
    0x00, 0x00, 0x00, 0x00, // Y pixels per meter
    0x00, 0x00, 0x00, 0x00, // Colors used
    0x00, 0x00, 0x00, 0x00  // Important colors
  ]);
  
  // AND mask (all transparent)
  const andMask = Buffer.alloc(16 * 16 / 8); // 1 bit per pixel
  
  const icoFile = Buffer.concat([icoHeader, imageEntry, bitmapHeader, bitmapData, andMask]);
  
  return icoFile;
}

// Create the ICO file
const icoData = createSimpleICO();
fs.writeFileSync('./public/favicon.ico', icoData);

console.log('Simple favicon.ico created successfully');